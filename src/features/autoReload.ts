import { Schematic } from "@/structure/Schematic.js";
import { ranInt } from "@/utils/math.js";


export default Schematic.registerFeature({
    name: "autoReload",
    cooldown: () => {
        // Reload config shortly after OwO daily reset at 2:00 PM (14:00)
        const now = new Date();
        const nextReload = new Date(now);
        if (now.getHours() >= 14) {
            nextReload.setDate(nextReload.getDate() + 1);
        }
        nextReload.setHours(14, ranInt(11, 25), ranInt(0, 59), 0);
        return Math.max(10000, nextReload.getTime() - Date.now());
    },
    condition: async ({ agent }) => {
        if (!agent.config.autoReload) return false;

        const now = new Date();
        return now.getHours() >= 14;
    },
    run: ({ agent }) => {
        agent.reloadConfig();
    }
});