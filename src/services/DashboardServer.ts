import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { MetricsTracker, MetricsSnapshot } from "@/structure/core/MetricsTracker.js";
import { logger } from "@/utils/logger.js";
import { Configuration } from "@/schemas/ConfigSchema.js";

export interface DashboardAgentController {
    pause: () => void;
    resume: () => void;
    stop: () => Promise<void> | void;
    checkCash: () => Promise<void>;
    farmLoopPaused: boolean;
    getConfig?: () => Configuration;
    updateConfig?: (updates: Partial<Configuration>) => boolean;
    skipSleep?: () => boolean;
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

                    if (action === "skip_sleep") {
                        if (this.agent) {
                            const skipped = this.agent.skipSleep ? this.agent.skipSleep() : false;
                            res.writeHead(200, { "Content-Type": "application/json" });
                            res.end(JSON.stringify({ success: true, skipped }));
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

                    if (action === "set_event") {
                        let body = "";
                        req.on("data", chunk => body += chunk);
                        req.on("end", () => {
                            try {
                                const json = JSON.parse(body || "{}");
                                this.metricsTracker.setEventInfo({
                                    ...json,
                                    source: "manual",
                                });
                                res.writeHead(200, { "Content-Type": "application/json" });
                                res.end(JSON.stringify({ success: true, event: this.metricsTracker.getSnapshot().event }));
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

                // Configuration Endpoints (User Config Adjustments from data.json)
                if (url === "/api/config") {
                    if (req.method === "GET") {
                        let fullConfig: any = {};
                        if (this.agent?.getConfig) {
                            fullConfig = this.agent.getConfig();
                        } else {
                            try {
                                const dataPath = path.join(os.homedir(), "b2ki-ados", "data.json");
                                if (fs.existsSync(dataPath)) {
                                    const allData = JSON.parse(fs.readFileSync(dataPath, "utf-8"));
                                    const userId = Object.keys(allData)[0];
                                    if (userId && allData[userId]) {
                                        fullConfig = allData[userId];
                                    }
                                }
                            } catch (e) {
                                logger.warn(`Failed reading data.json in dashboard fallback: ${e}`);
                            }
                        }
                        const safeConfig = {
                            ...fullConfig,
                            token: fullConfig.token ? "••••••••" : "",
                            apiKey: fullConfig.apiKey ? "••••••••" : "",
                        };
                        res.writeHead(200, { "Content-Type": "application/json" });
                        res.end(JSON.stringify({ success: true, config: safeConfig }));
                        return;
                    }

                    if (req.method === "POST") {
                        let body = "";
                        req.on("data", chunk => body += chunk);
                        req.on("end", () => {
                            try {
                                const updates = JSON.parse(body || "{}");
                                delete updates.token;
                                delete updates.apiKey;

                                let ok = true;
                                if (this.agent?.updateConfig) {
                                    ok = this.agent.updateConfig(updates);
                                } else {
                                    try {
                                        const dataPath = path.join(os.homedir(), "b2ki-ados", "data.json");
                                        let allData: any = {};
                                        if (fs.existsSync(dataPath)) {
                                            allData = JSON.parse(fs.readFileSync(dataPath, "utf-8"));
                                        }
                                        const userId = Object.keys(allData)[0] || "default";
                                        allData[userId] = { ...(allData[userId] || {}), ...updates };
                                        fs.writeFileSync(dataPath, JSON.stringify(allData, null, 2), "utf-8");
                                    } catch (err) {
                                        ok = false;
                                        logger.warn(`Failed writing to data.json: ${err}`);
                                    }
                                }

                                const updatedConfig = this.agent?.getConfig ? this.agent.getConfig() : updates;
                                const safeConfig = {
                                    ...updatedConfig,
                                    token: updatedConfig.token ? "••••••••" : "",
                                    apiKey: updatedConfig.apiKey ? "••••••••" : "",
                                };
                                res.writeHead(200, { "Content-Type": "application/json" });
                                res.end(JSON.stringify({ success: ok, config: safeConfig }));
                            } catch (e: any) {
                                res.writeHead(400, { "Content-Type": "application/json" });
                                res.end(JSON.stringify({ success: false, error: e.message }));
                            }
                        });
                        return;
                    }
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
