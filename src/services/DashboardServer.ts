import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { MetricsTracker, MetricsSnapshot } from "@/structure/core/MetricsTracker.js";
import { logger } from "@/utils/logger.js";

export interface DashboardAgentController {
    pause: () => void;
    resume: () => void;
    stop: () => Promise<void> | void;
    checkCash: () => Promise<void>;
    farmLoopPaused: boolean;
}

export class DashboardServer {
    private server: http.Server | null = null;
    private sseClients: Set<http.ServerResponse> = new Set();
    private metricsTracker = MetricsTracker.getInstance();
    private port: number;
    private htmlFilePath: string;
    private agent?: DashboardAgentController;

    constructor(port: number = 4040, agent?: DashboardAgentController) {
        this.port = port;
        this.agent = agent;
        const currentDir = path.dirname(fileURLToPath(import.meta.url));
        this.htmlFilePath = path.resolve(currentDir, "../web/dashboard.html");

        // Listen for live metric updates and broadcast to all connected web clients
        this.metricsTracker.on("update", (snapshot: MetricsSnapshot) => {
            this.broadcastSSE(snapshot);
        });
    }

    public setAgent(agent: DashboardAgentController) {
        this.agent = agent;
    }

    public start(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.server = http.createServer((req, res) => {
                // CORS Headers
                res.setHeader("Access-Control-Allow-Origin", "*");
                res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
                res.setHeader("Access-Control-Allow-Headers", "Content-Type");

                if (req.method === "OPTIONS") {
                    res.writeHead(204);
                    res.end();
                    return;
                }

                const url = req.url?.split("?")[0] || "/";

                // Action Endpoints (Remote Controls)
                if (req.method === "POST" && url.startsWith("/api/action/")) {
                    const action = url.replace("/api/action/", "");
                    if (action === "pause") {
                        if (this.agent) {
                            this.agent.pause();
                            res.writeHead(200, { "Content-Type": "application/json" });
                            res.end(JSON.stringify({ success: true, status: "paused" }));
                        } else {
                            res.writeHead(503, { "Content-Type": "application/json" });
                            res.end(JSON.stringify({ success: false, error: "Agent not connected" }));
                        }
                        return;
                    }

                    if (action === "resume") {
                        if (this.agent) {
                            this.agent.resume();
                            res.writeHead(200, { "Content-Type": "application/json" });
                            res.end(JSON.stringify({ success: true, status: "online" }));
                        } else {
                            res.writeHead(503, { "Content-Type": "application/json" });
                            res.end(JSON.stringify({ success: false, error: "Agent not connected" }));
                        }
                        return;
                    }

                    if (action === "stop") {
                        if (this.agent) {
                            res.writeHead(200, { "Content-Type": "application/json" });
                            res.end(JSON.stringify({ success: true, status: "stopped" }));
                            this.agent.stop();
                        } else {
                            res.writeHead(503, { "Content-Type": "application/json" });
                            res.end(JSON.stringify({ success: false, error: "Agent not connected" }));
                        }
                        return;
                    }

                    if (action === "cash") {
                        if (this.agent) {
                            this.agent.checkCash().catch(err => logger.error(`Check cash error: ${err}`));
                            res.writeHead(200, { "Content-Type": "application/json" });
                            res.end(JSON.stringify({ success: true, message: "Cash sync triggered" }));
                        } else {
                            res.writeHead(503, { "Content-Type": "application/json" });
                            res.end(JSON.stringify({ success: false, error: "Agent not connected" }));
                        }
                        return;
                    }

                    if (action === "set_totals") {
                        let body = "";
                        req.on("data", chunk => body += chunk);
                        req.on("end", () => {
                            try {
                                const json = JSON.parse(body || "{}");
                                this.metricsTracker.setInitialTotals(json);
                                res.writeHead(200, { "Content-Type": "application/json" });
                                res.end(JSON.stringify({ success: true, totals: this.metricsTracker.getSnapshot().total }));
                            } catch (e: any) {
                                res.writeHead(400, { "Content-Type": "application/json" });
                                res.end(JSON.stringify({ success: false, error: e.message }));
                            }
                        });
                        return;
                    }

                    res.writeHead(400, { "Content-Type": "application/json" });
                    res.end(JSON.stringify({ success: false, error: `Unknown action: ${action}` }));
                    return;
                }

                // 1. Live SSE Stream endpoint
                if (url === "/api/stream") {
                    res.writeHead(200, {
                        "Content-Type": "text/event-stream",
                        "Cache-Control": "no-cache, no-transform",
                        "Connection": "keep-alive",
                    });

                    // Send immediate current state
                    const initialData = JSON.stringify(this.metricsTracker.getSnapshot());
                    res.write(`data: ${initialData}\n\n`);

                    this.sseClients.add(res);

                    req.on("close", () => {
                        this.sseClients.delete(res);
                    });
                    return;
                }

                // 2. Snapshot JSON endpoint
                if (url === "/api/stats") {
                    res.writeHead(200, { "Content-Type": "application/json" });
                    res.end(JSON.stringify(this.metricsTracker.getSnapshot()));
                    return;
                }

                // 3. Serve Static Assets
                if (url.startsWith("/assets/")) {
                    const relativeAssetPath = url.replace(/^\//, "");
                    const possibleAssetPaths = [
                        path.resolve(process.cwd(), "src/web", relativeAssetPath),
                        path.resolve(process.cwd(), "dest/web", relativeAssetPath),
                        path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../web", relativeAssetPath)
                    ];

                    for (const assetPath of possibleAssetPaths) {
                        if (fs.existsSync(assetPath) && fs.statSync(assetPath).isFile()) {
                            const ext = path.extname(assetPath).toLowerCase();
                            const mimeTypes: Record<string, string> = {
                                ".png": "image/png",
                                ".gif": "image/gif",
                                ".webp": "image/webp",
                                ".jpg": "image/jpeg",
                                ".jpeg": "image/jpeg",
                                ".svg": "image/svg+xml",
                                ".css": "text/css",
                                ".js": "application/javascript"
                            };
                            res.writeHead(200, {
                                "Content-Type": mimeTypes[ext] || "application/octet-stream",
                                "Cache-Control": "public, max-age=86400"
                            });
                            fs.createReadStream(assetPath).pipe(res);
                            return;
                        }
                    }
                    res.writeHead(404, { "Content-Type": "text/plain" });
                    res.end("Asset not found");
                    return;
                }

                // 4. Serve Dashboard SPA
                if (url === "/" || url === "/dashboard") {
                    const htmlContent = this.getHtmlContent();
                    if (htmlContent) {
                        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
                        res.end(htmlContent);
                        return;
                    }

                    res.writeHead(404, { "Content-Type": "text/plain" });
                    res.end("Dashboard HTML not found.");
                    return;
                }

                // Fallback 404
                res.writeHead(404, { "Content-Type": "text/plain" });
                res.end("Not Found");
            });

            this.server.on("error", (err: any) => {
                if (err.code === "EADDRINUSE") {
                    logger.warn(`Dashboard port ${this.port} is already in use. Retrying on port ${this.port + 1}...`);
                    this.port++;
                    this.server?.listen(this.port);
                } else {
                    logger.error(`Dashboard server error: ${err.message}`);
                    reject(err);
                }
            });

            this.server.listen(this.port, () => {
                logger.info(`✨ Local Web Dashboard active at: http://localhost:${this.port}`);
                resolve();
            });
        });
    }

    private broadcastSSE(snapshot: MetricsSnapshot) {
        if (this.sseClients.size === 0) return;
        const payload = `data: ${JSON.stringify(snapshot)}\n\n`;
        for (const client of this.sseClients) {
            try {
                client.write(payload);
            } catch {
                this.sseClients.delete(client);
            }
        }
    }

    private getHtmlContent(): string | null {
        const pathsToTry = [
            this.htmlFilePath,
            path.resolve(process.cwd(), "src/web/dashboard.html"),
            path.resolve(process.cwd(), "dest/web/dashboard.html"),
        ];

        for (const p of pathsToTry) {
            if (fs.existsSync(p)) {
                return fs.readFileSync(p, "utf-8");
            }
        }
        return null;
    }

    public stop(): Promise<void> {
        return new Promise((resolve) => {
            if (!this.server) return resolve();
            for (const client of this.sseClients) {
                try {
                    client.end();
                } catch {}
            }
            this.sseClients.clear();
            this.server.close(() => {
                logger.info("Dashboard server stopped.");
                resolve();
            });
        });
    }
}
