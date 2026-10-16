import { CriticalEventHandler } from "@/handlers/CriticalEventHandler.js";
import { CaptchaService } from "@/services/CaptchaService.js";
import { Schematic } from "@/structure/Schematic.js";
import { NORMALIZE_REGEX } from "@/typings/constants.js";
import { logger } from "@/utils/logger.js";
import { parseHuntCatches } from "@/utils/animalRarity.js";
import { RarityCounts } from "@/structure/core/MetricsTracker.js";

export default Schematic.registerEvent({
    name: "owoMessageEvent",
    event: "messageCreate",
    handler: async (params, message) => {
        const { agent, t, locale } = params;

        if (message.author.id !== agent.owoID) return;

        const normalizedContent = message.content.normalize("NFC").replace(NORMALIZE_REGEX, "");

        const isForThisUser = message.channel.type === "DM" ||
            normalizedContent.includes(message.client.user?.id!) ||
            normalizedContent.includes(message.client.user?.username!) ||
            normalizedContent.includes(message.client.user?.displayName!) ||
            normalizedContent.includes(message.guild?.members.me?.displayName!);

        if (!isForThisUser) return;

        // 1. Check for Captcha
        if (/are you a real human|(check|verify) that you are.{1,3}human!/img.test(normalizedContent)) {
            logger.alert(`Captcha detected in channel: ${message.channel.type === "DM"
                ? message.channel.recipient.displayName
                : message.channel.name
                }!`);
            agent.captchaDetected = true;
            agent.metricsTracker.recordCaptcha(false);
            return CaptchaService.handleCaptcha({ agent, t, locale }, message);
        }

        // 2. Check for Captcha Success
        if (/verified that you are.{1,3}human!/igm.test(normalizedContent)) {
            logger.info(`CAPTCHA HAS BEEN RESOLVED, ${agent.config.autoResume ? "RESTARTING SELFBOT" : "STOPPING SELFBOT"}...`)
            if (!agent.config.autoResume) process.exit(0)
            agent.captchaDetected = false
            agent.metricsTracker.recordCaptcha(true);
            agent.farmLoop()
        }

        // 3. Check for Cowoncy Balance / Economic Events
        const balanceMatch = normalizedContent.match(/(?:currently have|you have)\s+[\*_]*([0-9,]+)[\*_]*\s+cowoncy/i);
        if (balanceMatch) {
            const amount = parseInt(balanceMatch[1].replace(/,/g, ""));
            if (!isNaN(amount)) agent.metricsTracker.updateCowoncy(amount);
        }

        const soldMatch = normalizedContent.match(/sold.*for a total of\s+[\*_]*([0-9,]+)[\*_]*/i);
        if (soldMatch) {
            const gain = parseInt(soldMatch[1].replace(/,/g, ""));
            if (!isNaN(gain)) agent.metricsTracker.adjustCowoncy(gain);
        }

        const dailyMatch = normalizedContent.match(/daily\s+[\*_]*([0-9,]+)[\*_]*\s+cowoncy/i);
        if (dailyMatch) {
            const daily = parseInt(dailyMatch[1].replace(/,/g, ""));
            if (!isNaN(daily)) agent.metricsTracker.adjustCowoncy(daily);
        }

        // 4. Check for Huntbot Status (Automated or manual user typing: owo hb / owo huntbot)
        if (normalizedContent.includes("I AM STILL HUNTING") || normalizedContent.includes("BEEP BOOP.")) {
            const matchTime = normalizedContent.match(/IN\s+(?:(\d+)\s*H\s*)?(\d+)\s*M/i);
            if (matchTime) {
                const hours = parseInt(matchTime[1] || "0");
                const minutes = parseInt(matchTime[2] || "0");
                agent.metricsTracker.updateHuntbot({
                    status: "hunting",
                    remainingSeconds: (hours * 3600) + (minutes * 60),
                    hours,
                    minutes,
                    trait: agent.config.autoTrait,
                });
            }
        } else if (normalizedContent.includes("huntbot") && (normalizedContent.includes("claim") || normalizedContent.includes("password") || normalizedContent.includes("send 'owo huntbot") || normalizedContent.includes("spent 200 cowoncy"))) {
            agent.metricsTracker.updateHuntbot({
                status: "ready",
                remainingSeconds: 0,
                hours: 0,
                minutes: 0,
                trait: agent.config.autoTrait,
            });
        }

        // 5. Check for Animal Catches & Rarity Badges (Automated or Manual, Gem or Standard)
        if (/(?:caught an?|found an?|empowered by|you found:?)/i.test(normalizedContent)) {
            // If not awaited by automated hunt, this was typed manually by user in Discord
            if (!agent.metricsTracker.isAwaitingAutoHunt) {
                agent.metricsTracker.recordHunt();
                if (/spent 5/i.test(normalizedContent)) {
                    agent.metricsTracker.adjustCowoncy(-5);
                }
            }

            const catches = parseHuntCatches(normalizedContent);
            const catchEntries = Object.entries(catches) as [keyof RarityCounts, number][];
            if (catchEntries.length > 0) {
                const summaryParts: string[] = [];
                for (const [tier, count] of catchEntries) {
                    if (count > 0) {
                        agent.metricsTracker.recordCatch(tier, count);
                        summaryParts.push(`${count} ${tier}`);
                    }
                }
                if (summaryParts.length > 0) {
                    logger.debug(`🐾 Animal Catch: ${summaryParts.join(", ")}`);
                }
            }
        }

        // 6. Check for Battle results (Manual user battles in Discord)
        if (message.embeds.length > 0 && message.embeds[0].author?.name && /battle/i.test(message.embeds[0].author.name)) {
            if (!agent.metricsTracker.isAwaitingAutoBattle) {
                agent.metricsTracker.recordBattle();
            }
        }

        // 7. Check for Ban
        if (/have been banned/.test(normalizedContent)) {
            return CriticalEventHandler.handleBan(params);
        }

        // 8. Check for No Money
        if (normalizedContent.includes("You don't have enough cowoncy!")) {
            return CriticalEventHandler.handleNoMoney(params);
        }
    }
})