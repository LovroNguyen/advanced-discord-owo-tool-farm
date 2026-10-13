import { Schematic } from "@/structure/Schematic.js";
import { logger } from "@/utils/logger.js";

export default Schematic.registerCommand({
    name: "resume",
    description: "commands.resume.description",
    aliases: ["unpause"],
    usage: "resume",
    execute: async ({ agent, message, t }) => {
        if (!agent.farmLoopPaused && !agent.captchaDetected) {
            return message.reply({
                content: t("commands.resume.notPaused")
            });
        }

        agent.farmLoopPaused = false;
        agent.captchaDetected = false;
        logger.info(t("logging.farmLoop.resumed"));

        if (!agent.farmLoopRunning) {
            agent.farmLoop();
        }

        message.reply({
            content: t("commands.resume.success")
        });
    }
});
