import { Schematic } from "@/structure/Schematic.js";
import { parseAnnouncementMessage } from "@/utils/eventParser.js";
import { logger } from "@/utils/logger.js";

export default Schematic.registerEvent({
    name: "announcementCreate",
    event: "messageCreate",
    handler: async (params, message) => {
        const { agent } = params;
        if (!message || !message.content) return;

        const channelId = message.channelId;

        // 1. Never inspect messages from active farming channels!
        const farmingChannels = agent.config.channelID || [];
        if (farmingChannels.includes(channelId) || channelId === agent.activeChannel?.id) {
            return;
        }

        // 2. Strict channel filtering:
        // - If announcementChannelId is configured, ONLY process messages from this exact channel!
        // - If not configured, only process messages from channels explicitly named announcement/owo-news
        const configuredChannelId = agent.config.announcementChannelId;
        const channelName = (message.channel as any)?.name?.toLowerCase() || "";

        if (configuredChannelId) {
            if (channelId !== configuredChannelId) return;
        } else {
            const isAnnouncementChannel = channelName.includes("announcement") || channelName.includes("owo-news");
            if (!isAnnouncementChannel) return;
        }

        // 3. Parse announcement structure
        const parsed = parseAnnouncementMessage(message.content);
        if (!parsed || !parsed.endTimestamp) return;

        // 4. Must be a real event ending (at least 1 hour into the future or valid date), not a short command cooldown!
        const diff = parsed.endTimestamp - Date.now();
        if (diff > 0 && diff < 1000 * 60 * 60) {
            // Less than 1 hour is a cooldown/temp timer, not an OwO event
            return;
        }

        // 5. Deduplicate: Don't log or overwrite if the event info is identical
        const current = agent.metricsTracker.getEventInfo();
        if (current && current.eventName === parsed.eventName && current.endTimestamp === parsed.endTimestamp) {
            return;
        }

        agent.metricsTracker.setEventInfo({
            ...parsed,
            source: "auto",
        });

        logger.info(`📢 [OwO Event Tracker] Detected announcement: "${parsed.eventName}" (Ends: ${parsed.endingRaw || "N/A"})`);
    }
});
