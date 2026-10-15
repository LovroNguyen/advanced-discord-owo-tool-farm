import { Schematic } from "@/structure/Schematic.js";
import { ranInt } from "@/utils/math.js";

export default Schematic.registerFeature({
    name: "autoBattle",
    cooldown: () => ranInt(15_000, 22_000),
    condition: () => true,
    run: async ({ agent }) => {
        agent.metricsTracker.isAwaitingAutoBattle = true;
        let battleMsg;
        try {
            battleMsg = await agent.awaitResponse({
                trigger: () => agent.send("battle"),
                filter: (m) => m.author.id === agent.owoID && m.embeds.length > 0
                    && Boolean(
                        m.embeds[0].author?.name && (
                            (m.guild?.members.me?.displayName && m.embeds[0].author.name.includes(m.guild.members.me.displayName))
                            || (m.client.user?.username && m.embeds[0].author.name.includes(m.client.user.username))
                            || (m.client.user?.displayName && m.embeds[0].author.name.includes(m.client.user.displayName))
                        )
                    ),
                expectResponse: true,
            });
        } finally {
            agent.metricsTracker.isAwaitingAutoBattle = false;
        }

        if (battleMsg) {
            agent.metricsTracker.recordBattle();
        }
    },
})