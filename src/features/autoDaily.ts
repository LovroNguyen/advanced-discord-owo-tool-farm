import { Schematic } from "@/structure/Schematic.js";
import { ranInt } from "@/utils/math.js";


export default Schematic.registerFeature({
    name: "autoDaily",
    cooldown: () => {
        const now = new Date();
        const nextReset = new Date(now);
        // OwO daily resets at 2:00 PM (14:00) local time.
        // If it's already 14:00 or later today, schedule for tomorrow at 14:00 + jitter
        if (now.getHours() >= 14) {
            nextReset.setDate(nextReset.getDate() + 1);
        }
        nextReset.setHours(14, ranInt(1, 10), ranInt(0, 59), 0);
        return Math.max(10000, nextReset.getTime() - now.getTime());
    },
    condition: async ({ agent: { config } }) => {
        if (!config.autoDaily) return false;

        return true;
    },
    run: async ({ agent }) => {
        agent.send("daily")
        agent.config.autoDaily = false; // Disable autoDaily after running
    }
})