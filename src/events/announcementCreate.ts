import { Schematic } from "@/structure/Schematic.js";
import { parseAnnouncementMessage } from "@/utils/eventParser.js";
import { logger } from "@/utils/logger.js";

export default Schematic.registerEvent({
    name: "announcementCreate",
    event: "messageCreate",
    handler: async (params, message) => {
        const { agent } = params;
        if (!message || !message.content) return;

        // 1. Check if message is from configured announcementChannelId
        const configuredChannelId = agent.config.announcementChannelId;
        const channelName = (message.channel as any)?.name?.toLowerCase() || "";
        const isConfiguredChannel = configuredChannelId ? message.channelId === configuredChannelId : false;
        const isAnnouncementLike = channelName.includes("announcement") || channelName.includes("owo-news") || channelName.includes("event");

        // 2. Parse announcement structure
        const parsed = parseAnnouncementMessage(message.content);
        if (!parsed) return;

        // 3. Update if from designated channel or high-confidence event announcement
        if (isConfiguredChannel || isAnnouncementLike || (parsed.endTimestamp && parsed.endTimestamp > 0)) {
            agent.metricsTracker.setEventInfo({
                ...parsed,
                source: "auto",
            });

            logger.info(`📢 [OwO Event Tracker] Detected announcement: "${parsed.eventName}" (Ends: ${parsed.endingRaw || "N/A"})`);
        }
    }
});
