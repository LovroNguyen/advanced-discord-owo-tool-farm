import { EventEmitter } from "node:events";
import fs from "node:fs";
import path from "node:path";

export interface DataPoint {
    time: string;
    timestamp: number;
    balance: number;
    hunts: number;
    battles: number;
    texts: number;
}

export interface DailyRecord {
    date: string;
    dayLabel: string;
    dayShort: string;
    hunts: number;
    battles: number;
    texts: number;
    cowoncyGain: number;
}

export interface RarityCounts {
    common: number;
    uncommon: number;
    rare: number;
    epic: number;
    mythical: number;
    legendary: number;
    fabled: number;
    gem: number;
    hidden: number;
    patreon: number;
    cpatreon: number;
    distorted: number;
    event: number;
}

export interface MetricsSnapshot {
    uptimeSeconds: number;
    startTime: number;
    status: "online" | "paused" | "captcha" | "sleeping" | "idle" | "stopped";
    channel: string;
    username: string;
    avatarUrl: string;
    session: {
        hunts: number;
        battles: number;
        texts: number;
        captchasSolved: number;
        captchasFailed: number;
        totalCommands: number;
    };
    total: {
        hunts: number;
        battles: number;
        texts: number;
        captchasSolved: number;
        captchasFailed: number;
        totalCommands: number;
    };
    balance: {
        current: number;
        starting: number;
        netGain: number;
    };
    huntbot: HuntbotInfo;
    rarities: RarityCounts;
    totalRarities: RarityCounts;
    sleep: SleepInfo;
    event: EventInfo;
    history: DataPoint[];
    dailyHistory: DailyRecord[];
}

export interface EventInfo {
    eventName: string;
    endTimestamp: number;
    endingRaw?: string;
    isActive: boolean;
    summary?: string;
    specialGemsAllowed?: boolean;
    petRates?: string;
    announcementSnippet?: string;
    source?: "auto" | "manual";
    updatedAt: number;
}

export interface SleepInfo {
    enabled: boolean;
    isSleeping: boolean;
    sleepRemainingSeconds: number;
    sleepTotalSeconds: number;
    targetSleepTime?: number;
    commandsSinceLastSleep: number;
    commandsUntilSleep: number;
    threshold: number;
}

export interface HuntbotInfo {
    status: "hunting" | "ready" | "idle";
    remainingSeconds: number;
    hours: number;
    minutes: number;
    trait?: string;
    targetTimestamp?: number;
}

export class MetricsTracker extends EventEmitter {
    private static instance: MetricsTracker;

    public startTime: number = Date.now();
    public status: "online" | "paused" | "captcha" | "sleeping" | "idle" | "stopped" = "idle";
    public channelName: string = "Not connected";
    public username: string = "Connecting...";
    public avatarUrl: string = "https://i.imgur.com/9wrvM38.png";

    // Daily records & persistence
    private dailyRecords: Record<string, DailyRecord> = {};
    private historyFilePath = path.resolve(process.cwd(), "logs/daily_metrics.json");
    private saveTimeout: NodeJS.Timeout | null = null;

    // Session Animal Catch Rarity matrix (Starts at 0 on every bot run / session!)
    public sessionRarities: RarityCounts = {
        common: 0,
        uncommon: 0,
        rare: 0,
        epic: 0,
        mythical: 0,
        legendary: 0,
        fabled: 0,
        gem: 0,
        hidden: 0,
        patreon: 0,
        cpatreon: 0,
        distorted: 0,
        event: 0,
    };

    // Lifetime/Total Animal Catch Rarity matrix (Persisted across sessions)
    public totalRarities: RarityCounts = {
        common: 0,
        uncommon: 0,
        rare: 0,
        epic: 0,
        mythical: 0,
        legendary: 0,
        fabled: 0,
        gem: 0,
        hidden: 0,
        patreon: 0,
        cpatreon: 0,
        distorted: 0,
        event: 0,
    };

    // Compatibility getter
    public get rarityCounts(): RarityCounts {
        return this.sessionRarities;
    }

    // Sleep Mode State
    private sleepProvider?: () => { enabled: boolean; commandsSinceLastSleep: number; threshold: number; commandsUntilSleep: number };
    private isSleeping: boolean = false;
    private sleepTargetTime: number = 0;
    private sleepTotalSeconds: number = 0;
    private sleepInterval: NodeJS.Timeout | null = null;
    private cachedNextThreshold: number = 100;

    // Session stats
    public sessionHunts: number = 0;
    public sessionBattles: number = 0;
    public sessionTexts: number = 0;
    public sessionCaptchasSolved: number = 0;
    public sessionCaptchasFailed: number = 0;

    // Lifetime/Total stats (persisted across all sessions and runs)
    public totalHunts: number = 0;
    public totalBattles: number = 0;
    public totalTexts: number = 0;
    public totalCommands: number = 0;
    public totalCaptchasSolved: number = 0;
    public totalCaptchasFailed: number = 0;

    // Concurrency flags for separating automated vs manual commands
    public isAwaitingAutoHunt: boolean = false;
    public isAwaitingAutoBattle: boolean = false;

    // Economy
    public currentCowoncy: number = 0;
    public startingCowoncy: number = 0;
    public hasInitialBalance: boolean = false;

    // Huntbot status
    public huntbotInfo: HuntbotInfo = {
        status: "idle",
        remainingSeconds: 0,
        hours: 0,
        minutes: 0,
        trait: "efficiency",
    };

    // Event Tracking & Intelligence
    private eventFilePath = path.resolve(process.cwd(), "logs/event_state.json");
    public eventInfo: EventInfo = {
        eventName: "October Event",
        endTimestamp: new Date("2026-10-15T13:45:00+07:00").getTime(),
        endingRaw: "15-Oct-26 1:45 PM",
        isActive: false,
        summary: "Halloween, World Coffee Day",
        specialGemsAllowed: true,
        petRates: "0.005%-0.05%",
        source: "auto",
        updatedAt: Date.now(),
    };

    // Time-series history for line chart (up to 60 historical points)
    private history: DataPoint[] = [];
    private maxHistoryLength: number = 60;
    private lastSnapshotTime: number = 0;

    private constructor() {
        super();
        this.loadDailyRecords();
        this.loadEventState();
        this.addHistoryPoint();

        // Flush immediately upon process exit/kill to prevent data loss
        process.on("beforeExit", () => this.flushToDisk());
        process.on("exit", () => this.flushToDisk());
    }

    public recordCatch(tier: keyof RarityCounts, count: number = 1) {
        if (this.sessionRarities[tier] !== undefined) {
            this.sessionRarities[tier] += count;
            this.totalRarities[tier] += count;
            this.saveDailyRecordsDebounced();
            this.emitChange();
        }
    }

    private getTodayRecord(): DailyRecord {
        const now = new Date();
        const dateKey = now.toISOString().split("T")[0];
        if (!this.dailyRecords[dateKey]) {
            const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
            const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            this.dailyRecords[dateKey] = {
                date: dateKey,
                dayLabel: `${days[now.getDay()]}, ${months[now.getMonth()]} ${now.getDate()}`,
                dayShort: days[now.getDay()],
                hunts: 0,
                battles: 0,
                texts: 0,
                cowoncyGain: 0,
            };
        }
        return this.dailyRecords[dateKey];
    }

    private loadDailyRecords() {
        try {
            if (fs.existsSync(this.historyFilePath)) {
                const data = JSON.parse(fs.readFileSync(this.historyFilePath, "utf-8"));
                if (data.daily) {
                    this.dailyRecords = data.daily || {};
                    if (data.rarities) {
                        this.totalRarities = { ...this.totalRarities, ...data.rarities };
                    }
                    if (data.totals) {
                        this.totalHunts = Number(data.totals.hunts) || 0;
                        this.totalBattles = Number(data.totals.battles) || 0;
                        this.totalTexts = Number(data.totals.texts) || 0;
                        this.totalCommands = Number(data.totals.commands) || 0;
                        this.totalCaptchasSolved = Number(data.totals.captchasSolved) || 0;
                        this.totalCaptchasFailed = Number(data.totals.captchasFailed) || 0;
                    }
                } else {
                    this.dailyRecords = data || {};
                }
            }
        } catch {
            this.dailyRecords = {};
        }

        // Integrity check: All-time totals MUST at least reflect the sum of all historical daily entries!
        const sumDailyHunts = Object.values(this.dailyRecords).reduce((acc, d) => acc + (d.hunts || 0), 0);
        const sumDailyBattles = Object.values(this.dailyRecords).reduce((acc, d) => acc + (d.battles || 0), 0);
        const sumDailyTexts = Object.values(this.dailyRecords).reduce((acc, d) => acc + (d.texts || 0), 0);

        this.totalHunts = Math.max(this.totalHunts, sumDailyHunts);
        this.totalBattles = Math.max(this.totalBattles, sumDailyBattles);
        this.totalTexts = Math.max(this.totalTexts, sumDailyTexts);
        this.totalCommands = Math.max(this.totalCommands, this.totalHunts + this.totalBattles);

        this.flushToDisk();
    }

    public flushToDisk() {
        try {
            const dir = path.dirname(this.historyFilePath);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            const payload = {
                totals: {
                    hunts: this.totalHunts,
                    battles: this.totalBattles,
                    texts: this.totalTexts,
                    commands: this.totalCommands,
                    captchasSolved: this.totalCaptchasSolved,
                    captchasFailed: this.totalCaptchasFailed,
                },
                daily: this.dailyRecords,
                rarities: this.totalRarities,
            };
            fs.writeFileSync(this.historyFilePath, JSON.stringify(payload, null, 2), "utf-8");
            this.saveEventState();
        } catch {}
    }

    private loadEventState() {
        try {
            if (fs.existsSync(this.eventFilePath)) {
                const data = JSON.parse(fs.readFileSync(this.eventFilePath, "utf-8"));
                if (data && data.eventName) {
                    const endTimestamp = Number(data.endTimestamp) || this.eventInfo.endTimestamp;
                    this.eventInfo = {
                        ...this.eventInfo,
                        ...data,
                        endTimestamp,
                        isActive: Date.now() < endTimestamp,
                    };
                }
            }
        } catch {}
    }

    public saveEventState() {
        try {
            const dir = path.dirname(this.eventFilePath);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(this.eventFilePath, JSON.stringify(this.eventInfo, null, 2), "utf-8");
        } catch {}
    }

    public setEventInfo(info: Partial<EventInfo>) {
        const endTimestamp = info.endTimestamp !== undefined ? Number(info.endTimestamp) : this.eventInfo.endTimestamp;
        this.eventInfo = {
            ...this.eventInfo,
            ...info,
            endTimestamp,
            isActive: endTimestamp ? Date.now() < endTimestamp : false,
            updatedAt: Date.now(),
        };
        this.saveEventState();
        this.emitChange();
    }

    public getEventInfo(): EventInfo {
        const isActive = this.eventInfo.endTimestamp ? Date.now() < this.eventInfo.endTimestamp : false;
        return {
            ...this.eventInfo,
            isActive,
        };
    }

    private saveDailyRecordsDebounced() {
        if (this.saveTimeout) return;
        this.saveTimeout = setTimeout(() => {
            this.saveTimeout = null;
            this.flushToDisk();
        }, 2000);
    }

    public setInitialTotals(totals: { hunts?: number; battles?: number; texts?: number; commands?: number }) {
        if (totals.hunts !== undefined) this.totalHunts = Math.max(0, Number(totals.hunts));
        if (totals.battles !== undefined) this.totalBattles = Math.max(0, Number(totals.battles));
        if (totals.texts !== undefined) this.totalTexts = Math.max(0, Number(totals.texts));
        if (totals.commands !== undefined) this.totalCommands = Math.max(0, Number(totals.commands));
        else this.totalCommands = this.totalHunts + this.totalBattles;
        this.flushToDisk();
        this.emitChange();
    }

    public getDailyHistory(daysCount: number = 7): DailyRecord[] {
        const list: DailyRecord[] = [];
        const now = new Date();
        const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

        for (let i = daysCount - 1; i >= 0; i--) {
            const d = new Date(now);
            d.setDate(d.getDate() - i);
            const dateKey = d.toISOString().split("T")[0];
            const dayShort = i === 0 ? "Today" : days[d.getDay()];
            const dayLabel = `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}`;

            if (this.dailyRecords[dateKey]) {
                list.push({
                    ...this.dailyRecords[dateKey],
                    dayShort,
                    dayLabel,
                });
            } else {
                list.push({
                    date: dateKey,
                    dayLabel,
                    dayShort,
                    hunts: 0,
                    battles: 0,
                    texts: 0,
                    cowoncyGain: 0,
                });
            }
        }
        return list;
    }

    public static getInstance(): MetricsTracker {
        if (!MetricsTracker.instance) {
            MetricsTracker.instance = new MetricsTracker();
        }
        return MetricsTracker.instance;
    }

    public initSession(username: string, avatarUrl: string, channelName: string, startTime: number = Date.now()) {
        this.username = username;
        this.avatarUrl = avatarUrl || this.avatarUrl;
        this.channelName = channelName;
        this.startTime = startTime;
        this.status = "online";
        this.sessionRarities = {
            common: 0,
            uncommon: 0,
            rare: 0,
            epic: 0,
            mythical: 0,
            legendary: 0,
            fabled: 0,
            gem: 0,
            hidden: 0,
            patreon: 0,
            cpatreon: 0,
            distorted: 0,
            event: 0,
        };
        this.addHistoryPoint();
        this.emitChange();
    }

    public setSleepProvider(provider: () => { enabled: boolean; commandsSinceLastSleep: number; threshold: number; commandsUntilSleep: number }) {
        this.sleepProvider = provider;
    }

    public startSleep(sleepDurationMs: number, nextThreshold: number) {
        this.isSleeping = true;
        this.cachedNextThreshold = nextThreshold;
        this.sleepTotalSeconds = Math.round(sleepDurationMs / 1000);
        this.sleepTargetTime = Date.now() + sleepDurationMs;
        this.status = "sleeping";

        if (this.sleepInterval) clearInterval(this.sleepInterval);
        this.sleepInterval = setInterval(() => {
            if (!this.isSleeping) {
                if (this.sleepInterval) clearInterval(this.sleepInterval);
                return;
            }
            this.emitChange();
        }, 1000);

        this.emitChange();
    }

    public endSleep(nextThreshold: number) {
        this.isSleeping = false;
        this.sleepTargetTime = 0;
        this.sleepTotalSeconds = 0;
        this.cachedNextThreshold = nextThreshold;
        this.status = "online";
        if (this.sleepInterval) {
            clearInterval(this.sleepInterval);
            this.sleepInterval = null;
        }
        this.emitChange();
    }

    public getSleepSnapshot(): SleepInfo {
        const remainingSeconds = this.isSleeping && this.sleepTargetTime > 0
            ? Math.max(0, Math.ceil((this.sleepTargetTime - Date.now()) / 1000))
            : 0;

        if (this.sleepProvider) {
            const live = this.sleepProvider();
            return {
                enabled: live.enabled,
                isSleeping: this.isSleeping,
                sleepRemainingSeconds: remainingSeconds,
                sleepTotalSeconds: this.sleepTotalSeconds,
                targetSleepTime: this.sleepTargetTime,
                commandsSinceLastSleep: live.commandsSinceLastSleep,
                commandsUntilSleep: live.commandsUntilSleep,
                threshold: live.threshold,
            };
        }

        return {
            enabled: true,
            isSleeping: this.isSleeping,
            sleepRemainingSeconds: remainingSeconds,
            sleepTotalSeconds: this.sleepTotalSeconds,
            targetSleepTime: this.sleepTargetTime,
            commandsSinceLastSleep: 0,
            commandsUntilSleep: this.cachedNextThreshold,
            threshold: this.cachedNextThreshold,
        };
    }

    public setStatus(status: "online" | "paused" | "captcha" | "sleeping" | "idle" | "stopped") {
        this.status = status;
        this.emitChange();
    }

    public setChannel(channelName: string) {
        this.channelName = channelName;
        this.emitChange();
    }

    public recordHunt() {
        this.sessionHunts++;
        this.totalHunts++;
        this.totalCommands++;
        const today = this.getTodayRecord();
        today.hunts++;
        this.saveDailyRecordsDebounced();
        this.checkAndAddHistory();
        this.emitChange();
    }

    public recordBattle() {
        this.sessionBattles++;
        this.totalBattles++;
        this.totalCommands++;
        const today = this.getTodayRecord();
        today.battles++;
        this.saveDailyRecordsDebounced();
        this.checkAndAddHistory();
        this.emitChange();
    }

    public recordText() {
        this.sessionTexts++;
        this.totalTexts++;
        const today = this.getTodayRecord();
        today.texts++;
        this.saveDailyRecordsDebounced();
        this.checkAndAddHistory();
        this.emitChange();
    }

    public recordCaptcha(solved: boolean) {
        if (solved) {
            this.sessionCaptchasSolved++;
            this.totalCaptchasSolved++;
            this.status = "online";
        } else {
            this.sessionCaptchasFailed++;
            this.totalCaptchasFailed++;
            this.status = "captcha";
        }
        this.emitChange();
    }

    public updateCowoncy(amount: number) {
        if (!this.hasInitialBalance) {
            this.startingCowoncy = amount;
            this.hasInitialBalance = true;
        } else {
            const gain = amount - this.currentCowoncy;
            if (gain > 0) {
                const today = this.getTodayRecord();
                today.cowoncyGain += gain;
                this.saveDailyRecordsDebounced();
            }
        }
        this.currentCowoncy = amount;
        this.addHistoryPoint();
        this.emitChange();
    }

    public adjustCowoncy(delta: number) {
        this.currentCowoncy = Math.max(0, this.currentCowoncy + delta);
        if (!this.hasInitialBalance) {
            this.startingCowoncy = this.currentCowoncy;
            this.hasInitialBalance = true;
        }
        if (delta > 0) {
            const today = this.getTodayRecord();
            today.cowoncyGain += delta;
            this.saveDailyRecordsDebounced();
        }
        this.addHistoryPoint();
        this.emitChange();
    }

    private checkAndAddHistory() {
        const now = Date.now();
        // Add a history point at most once every 15 seconds or when balance changes
        if (now - this.lastSnapshotTime >= 15_000) {
            this.addHistoryPoint();
        }
    }

    public addHistoryPoint() {
        const now = new Date();
        const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;
        
        const point: DataPoint = {
            time: timeStr,
            timestamp: now.getTime(),
            balance: this.currentCowoncy,
            hunts: this.sessionHunts,
            battles: this.sessionBattles,
            texts: this.sessionTexts,
        };

        this.history.push(point);
        if (this.history.length > this.maxHistoryLength) {
            this.history.shift();
        }
        this.lastSnapshotTime = now.getTime();
    }

    public getSnapshot(): MetricsSnapshot {
        const now = Date.now();
        const uptimeSeconds = Math.max(0, Math.floor((now - this.startTime) / 1000));
        const netGain = this.currentCowoncy - this.startingCowoncy;

        return {
            uptimeSeconds,
            startTime: this.startTime,
            status: this.status,
            channel: this.channelName,
            username: this.username,
            avatarUrl: this.avatarUrl,
            session: {
                hunts: this.sessionHunts,
                battles: this.sessionBattles,
                texts: this.sessionTexts,
                captchasSolved: this.sessionCaptchasSolved,
                captchasFailed: this.sessionCaptchasFailed,
                totalCommands: this.sessionHunts + this.sessionBattles,
            },
            total: {
                hunts: this.totalHunts,
                battles: this.totalBattles,
                texts: this.totalTexts,
                captchasSolved: this.totalCaptchasSolved,
                captchasFailed: this.totalCaptchasFailed,
                totalCommands: this.totalCommands,
            },
            balance: {
                current: this.currentCowoncy,
                starting: this.startingCowoncy,
                netGain,
            },
            huntbot: this.getHuntbotSnapshot(),
            rarities: this.sessionRarities,
            totalRarities: this.totalRarities,
            sleep: this.getSleepSnapshot(),
            event: this.getEventInfo(),
            history: this.history,
            dailyHistory: this.getDailyHistory(7),
        };
    }

    public updateHuntbot(info: Partial<HuntbotInfo>) {
        this.huntbotInfo = { ...this.huntbotInfo, ...info };
        if (info.remainingSeconds !== undefined && info.remainingSeconds > 0) {
            this.huntbotInfo.targetTimestamp = Date.now() + (info.remainingSeconds * 1000);
        }
        this.emitChange();
    }

    private getHuntbotSnapshot(): HuntbotInfo {
        if (this.huntbotInfo.targetTimestamp && this.huntbotInfo.status === "hunting") {
            const diffSeconds = Math.max(0, Math.floor((this.huntbotInfo.targetTimestamp - Date.now()) / 1000));
            const hours = Math.floor(diffSeconds / 3600);
            const minutes = Math.floor((diffSeconds % 3600) / 60);
            return {
                ...this.huntbotInfo,
                remainingSeconds: diffSeconds,
                hours,
                minutes,
                status: diffSeconds <= 0 ? "ready" : "hunting",
            };
        }
        return this.huntbotInfo;
    }

    private emitChange() {
        this.emit("update", this.getSnapshot());
    }
}
