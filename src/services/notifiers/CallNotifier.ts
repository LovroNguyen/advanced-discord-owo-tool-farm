import { FeatureFnParams, NotificationPayload, NotifierStrategy } from "@/typings/index.js";
import { logger } from "@/utils/logger.js";
import { t } from "@/utils/locales.js";

export class CallNotifier implements NotifierStrategy {
    async execute(params: FeatureFnParams, payload: NotificationPayload): Promise<void> {
        const { agent } = params;
        const { urgency } = payload;

        if (!agent.config.adminID) {
            logger.warn(t("error.adminID.notconfigured"));
            return;
        }

        if (urgency !== "critical") {
            logger.debug("Skipping Call Notifier execution due to non-critical urgency.");
            return;
        }

        try {
            const admin = await agent.client.users.fetch(agent.config.adminID);
            const dms = await admin.createDM();

            const connection = await agent.client.voice.joinChannel(dms, {
                selfDeaf: false,
                selfMute: true,
                selfVideo: false,
            });
            logger.debug(`Joined voice channel with status: ${connection.status}`);
            await dms.ring();

            setTimeout(() => {
                try {
                    connection.disconnect();
                    logger.debug("Disconnected from voice channel after 60 seconds.");
                } catch {
                    // Ignore disconnect errors
                }
            }, 60_000);
        } catch (error: any) {
            const msg = error instanceof Error ? error.message : String(error);
            if (msg.includes("Connection not established") || error?.code === "VOICE_CONNECTION_TIMEOUT") {
                logger.warn(`CallNotifier: Discord voice call connection timed out after 15s. (Discord WebRTC/Voice gateway issue or admin call privacy settings).`);
            } else {
                logger.error(`Error in CallNotifier: ${msg}`);
            }
        }
    }
}