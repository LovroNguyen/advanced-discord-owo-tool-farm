import { RarityCounts } from "@/structure/core/MetricsTracker.js";

/**
 * Complete animal to rarity tier mapping for OwO Bot.
 * Standard tiers have 5 distinct animal species each.
 * Supports Unicode emojis, Discord emoji names/shortcodes, and English names.
 */
export const ANIMAL_RARITY_MAP: Record<string, keyof RarityCounts> = {
    // === 1. COMMON (~58.8% drop rate) ===
    // Bee
    "🐝": "common",
    "bee": "common",
    // Bug / Caterpillar
    "🐛": "common",
    "bug": "common",
    "caterpillar": "common",
    // Snail
    "🐌": "common",
    "snail": "common",
    // Beetle
    "🪲": "common",
    "beetle": "common",
    // Butterfly
    "🦋": "common",
    "butterfly": "common",
    // Ant / other common bugs
    "🐜": "common",
    "ant": "common",

    // === 2. UNCOMMON (30% drop rate) ===
    // Chick
    "🐤": "uncommon",
    "🐥": "uncommon",
    "🐣": "uncommon",
    "chick": "uncommon",
    "baby_chick": "uncommon",
    "hatched_chick": "uncommon",
    // Mouse
    "🐁": "uncommon",
    "🐭": "uncommon",
    "🐀": "uncommon",
    "mouse": "uncommon",
    "mouse2": "uncommon",
    "rat": "uncommon",
    // Chicken / Rooster
    "🐔": "uncommon",
    "🐓": "uncommon",
    "chicken": "uncommon",
    "rooster": "uncommon",
    // Rabbit
    "🐇": "uncommon",
    "🐰": "uncommon",
    "rabbit": "uncommon",
    "rabbit2": "uncommon",
    "bunny": "uncommon",
    // Chipmunk
    "🐿️": "uncommon",
    "🐿": "uncommon",
    "chipmunk": "uncommon",
    "squirrel": "uncommon",

    // === 3. RARE (10% drop rate) ===
    // Sheep
    "🐑": "rare",
    "🐏": "rare",
    "sheep": "rare",
    "ram": "rare",
    // Pig
    "🐖": "rare",
    "🐷": "rare",
    "pig": "rare",
    "pig2": "rare",
    // Cow
    "🐄": "rare",
    "🐮": "rare",
    "🐂": "rare",
    "🐃": "rare",
    "cow": "rare",
    "cow2": "rare",
    "ox": "rare",
    "water_buffalo": "rare",
    // Dog
    "🐕": "rare",
    "🐶": "rare",
    "🐩": "rare",
    "dog": "rare",
    "dog2": "rare",
    "poodle": "rare",
    // Cat
    "🐈": "rare",
    "🐱": "rare",
    "cat": "rare",
    "cat2": "rare",

    // === 4. EPIC (1% drop rate) ===
    // Crocodile
    "🐊": "epic",
    "crocodile": "epic",
    "alligator": "epic",
    // Tiger
    "🐅": "epic",
    "🐯": "epic",
    "tiger": "epic",
    "tiger2": "epic",
    // Penguin
    "🐧": "epic",
    "penguin": "epic",
    // Elephant
    "🐘": "epic",
    "elephant": "epic",
    // Whale
    "🐋": "epic",
    "🐳": "epic",
    "whale": "epic",
    "whale2": "epic",

    // === 5. MYTHICAL (0.1% drop rate) ===
    // Dragon
    "🐉": "mythical",
    "🐲": "mythical",
    "dragon": "mythical",
    "dragon_face": "mythical",
    // Unicorn
    "🦄": "mythical",
    "unicorn": "mythical",
    // Snowman
    "⛄": "mythical",
    "☃️": "mythical",
    "☃": "mythical",
    "snowman": "mythical",
    "snowman2": "mythical",
    // Ghost
    "👻": "mythical",
    "ghost": "mythical",
    // Dove
    "🕊️": "mythical",
    "🕊": "mythical",
    "dove": "mythical",

    // === 6. LEGENDARY (0.05% drop rate) ===
    // Deer
    "🦌": "legendary",
    "deer": "legendary",
    // Fox
    "🦊": "legendary",
    "fox": "legendary",
    // Lion
    "🦁": "legendary",
    "lion": "legendary",
    // Owl
    "🦉": "legendary",
    "owl": "legendary",
    // Squid
    "🦑": "legendary",
    "squid": "legendary",

    // === 7. FABLED (0.001% drop rate) ===
    // Boar
    "🐗": "fabled",
    "boar": "fabled",
    // Eagle
    "🦅": "fabled",
    "eagle": "fabled",
    // Frog
    "🐸": "fabled",
    "frog": "fabled",
    // Gorilla
    "🦍": "fabled",
    "gorilla": "fabled",
    // Wolf
    "🐺": "fabled",
    "wolf": "fabled",

    // === 8. GEM TIER (0.01% drop rate base, Lucky Gem boost) ===
    // Camel
    "🐫": "gem",
    "🐪": "gem",
    "camel": "gem",
    // Fish
    "🐟": "gem",
    "🐠": "gem",
    "🐡": "gem",
    "fish": "gem",
    "blowfish": "gem",
    // Panda
    "🐼": "gem",
    "panda": "gem",
    // Shrimp
    "🦐": "gem",
    "shrimp": "gem",
    // Spider
    "🕷️": "gem",
    "🕷": "gem",
    "spider": "gem",

    // === 9. HIDDEN TIER (0.0001% drop rate) ===
    // Koala
    "🐨": "hidden",
    "koala": "hidden",
    // Lizard
    "🦎": "hidden",
    "lizard": "hidden",
    // Monkey
    "🐒": "hidden",
    "🐵": "hidden",
    "monkey": "hidden",
    // Snake
    "🐍": "hidden",
    "snake": "hidden",
    // Octopus
    "🐙": "hidden",
    "octopus": "hidden",

    // === 10. PATREON TIER (0.5% drop rate, Patreon subscribers) ===
    // Pbird, Pdolphin, Pogre, Pscorpion, Ptiger
    "pbird": "patreon",
    "p_bird": "patreon",
    "pdolphin": "patreon",
    "p_dolphin": "patreon",
    "pogre": "patreon",
    "p_ogre": "patreon",
    "pscorpion": "patreon",
    "p_scorpion": "patreon",
    "ptiger": "patreon",
    "p_tiger": "patreon",

    // === 11. CUSTOM PATREON TIER (0.01% drop rate) ===
    // Custom pet creations often prefixed with cp_

    // === 12. DISTORTED TIER (0.00025% drop rate, post-outage manual hunt) ===
    // Glitchparrot, Glitchotter, Glitchraccoon, Glitchflamingo, Glitchzebra
    "glitchparrot": "distorted",
    "glitch_parrot": "distorted",
    "glitchotter": "distorted",
    "glitch_otter": "distorted",
    "glitchraccoon": "distorted",
    "glitch_raccoon": "distorted",
    "glitchflamingo": "distorted",
    "glitch_flamingo": "distorted",
    "glitchzebra": "distorted",
    "glitch_zebra": "distorted",
};

/**
 * Parses animal catches from any OwO hunt message.
 * Handles:
 *  1. Multi-catch gem empowered hunts:
 *     "🌱 | Lovro, hunt is empowered by :fgem1:[21/100] ..."
 *     ":blank: | You found:  :bee: :bee: :bug: ... :dog2:"
 *     "| You found: 🐝 🐝 🪲 🐛 🐛 🐛 🦋 🐌 🐌 🐌 🐿️ 🐁 🐁 🐁 🐇 🐇 🐔 🐔 🐕 🐖"
 *  2. Standard hunts with or without cowoncy spent:
 *     "🌱 | Lovro spent 5 :cowoncy: and caught an uncommon :uncommon: :baby_chick:!"
 *     "🌱 | Lovro spent 5 <:cowoncy:416520...> and caught an uncommon <:uncommon:416520...> <:baby_chick:416520...>!"
 *     "🌱 | Lovro caught a common <:common:...> <:snail:...>!"
 *  3. Plaintext or bold name badges:
 *     "🌱 | Lovro caught a (c) **snail**!"
 *     "🌱 | Lovro caught a <:cpatreon:...> **cp_dragon**!"
 */
export function parseHuntCatches(content: string): Partial<Record<keyof RarityCounts, number>> {
    const result: Partial<Record<keyof RarityCounts, number>> = {};
    const add = (tier: keyof RarityCounts, n: number = 1) => {
        result[tier] = (result[tier] || 0) + n;
    };

    const IGNORE_TOKENS = new Set([
        "cowoncy", "blank", "xp", "coin", "coins",
        "gem1", "gem2", "gem3", "gem4",
        "fgem1", "fgem2", "fgem3", "fgem4",
        "star", "dice", "sparkles", "status"
    ]);

    const resolveTier = (name: string): keyof RarityCounts | null => {
        if (!name) return null;
        const lower = name.toLowerCase().replace(/^[<:]+|[:>]+$/g, "");
        if (IGNORE_TOKENS.has(lower)) return null;

        if (lower === "common") return "common";
        if (lower === "uncommon") return "uncommon";
        if (lower === "rare") return "rare";
        if (lower === "epic") return "epic";
        if (lower === "mythical" || lower === "mythic") return "mythical";
        if (lower === "legendary" || lower === "legend") return "legendary";
        if (lower === "fabled") return "fabled";
        if (lower === "gem") return "gem";
        if (lower === "hidden") return "hidden";
        if (lower === "patreon") return "patreon";
        if (lower === "cpatreon" || lower === "custom_patreon" || lower === "custompatreon" || lower.startsWith("cp_")) return "cpatreon";
        if (lower === "distorted" || lower.startsWith("glitch")) return "distorted";
        if (lower === "special" || lower === "event") return "event";

        if (ANIMAL_RARITY_MAP[lower]) return ANIMAL_RARITY_MAP[lower];

        if (lower.includes("cpatreon") || lower.includes("custom_patreon")) return "cpatreon";
        if (lower.includes("distorted")) return "distorted";
        if (lower.includes("patreon")) return "patreon";
        if (lower.includes("hidden")) return "hidden";
        if (lower.includes("common") && !lower.includes("uncommon")) return "common";
        if (lower.includes("uncommon")) return "uncommon";
        if (lower.includes("rare")) return "rare";
        if (lower.includes("epic")) return "epic";
        if (lower.includes("mythical") || lower.includes("mythic")) return "mythical";
        if (lower.includes("legendary")) return "legendary";
        if (lower.includes("fabled")) return "fabled";
        if (lower.includes("special") || lower.includes("event")) return "event";

        return null;
    };

    // 1. Multi-catch inspection (Gem Empowered Hunt: "You found: ...")
    const foundMatch = content.match(/(?:you found:?|found:?)\s*([^\r\n]+)/i);
    if (foundMatch) {
        const listText = foundMatch[1];

        // 1a. Discord custom emojis: <:name:id>
        const customMatches = Array.from(listText.matchAll(/<a?:([a-zA-Z0-9_]+):\d+>/g));
        if (customMatches.length > 0) {
            for (const m of customMatches) {
                const tier = resolveTier(m[1]);
                if (tier) add(tier, 1);
            }
            if (Object.keys(result).length > 0) return result;
        }

        // 1b. Unicode pictographs (Native standard animal emojis in gem hunt)
        const unicodeList = listText.match(/\p{Extended_Pictographic}/gu);
        if (unicodeList && unicodeList.length > 0) {
            for (const u of unicodeList) {
                const clean = u.replace(/\uFE0F/g, "");
                if (["💎", "🧊", "🤍", "⭐", "✨", "🎲", "xp", "💰", "🌱"].includes(clean)) continue;
                const tier = ANIMAL_RARITY_MAP[clean] || ANIMAL_RARITY_MAP[u] || "common";
                add(tier, 1);
            }
            if (Object.keys(result).length > 0) return result;
        }

        // 1c. Shortcode emojis: :bee: :bug: :cat2: etc.
        const shortcodeMatches = Array.from(listText.matchAll(/:([a-zA-Z0-9_]+):/g));
        if (shortcodeMatches.length > 0) {
            for (const s of shortcodeMatches) {
                const tier = resolveTier(s[1]);
                if (tier) add(tier, 1);
            }
            if (Object.keys(result).length > 0) return result;
        }
    }

    // 2. Standard Single-Catch Hunt inspection (Non-gem hunt or 1-catch hunt)
    const huntLineMatch = content.match(/.*(?:caught|found an?).*/i);
    const huntLine = huntLineMatch ? huntLineMatch[0] : content;

    // 2a. Explicit tier keyword in text: "caught an uncommon", "caught a common", "caught a rare", etc.
    const tierWordMatch = huntLine.match(/caught\s+(?:an?|the)?\s*([a-zA-Z_]+(?:\s+[a-zA-Z_]+)?)/i);
    if (tierWordMatch) {
        const candidate = tierWordMatch[1].trim().toLowerCase();
        const tier = resolveTier(candidate) || resolveTier(candidate.split(/\s+/)[0]);
        if (tier) {
            add(tier, 1);
            return result;
        }
    }

    // 2b. Custom emojis on the hunt line: <:uncommon:id> or <:baby_chick:id>
    const customMatches = Array.from(huntLine.matchAll(/<a?:([a-zA-Z0-9_]+):\d+>/g));
    for (const m of customMatches) {
        const tier = resolveTier(m[1]);
        if (tier) {
            add(tier, 1);
            return result;
        }
    }

    // 2c. Shortcodes on the hunt line: :uncommon: :baby_chick:
    const shortcodeMatches = Array.from(huntLine.matchAll(/:([a-zA-Z0-9_]+):/g));
    for (const s of shortcodeMatches) {
        const tier = resolveTier(s[1]);
        if (tier) {
            add(tier, 1);
            return result;
        }
    }

    // 2d. Plaintext badges: (cp), (p), (d), (h), (g), (c), (u), (r), (e), (m), (l), (f), (s)
    if (/2026oct_|2024dec_|2025/i.test(huntLine)) { add("event", 1); return result; }
    if (/\(cp\)|\(cpatreon\)/i.test(huntLine)) { add("cpatreon", 1); return result; }
    if (/\(d\)|\(distorted\)/i.test(huntLine)) { add("distorted", 1); return result; }
    if (/\(p\)|\(patreon\)/i.test(huntLine)) { add("patreon", 1); return result; }
    if (/\(h\)|\(hidden\)/i.test(huntLine)) { add("hidden", 1); return result; }
    if (/\(g\)|\(gem\)/i.test(huntLine)) { add("gem", 1); return result; }
    if (/\(c\)/i.test(huntLine)) { add("common", 1); return result; }
    if (/\(u\)/i.test(huntLine)) { add("uncommon", 1); return result; }
    if (/\(r\)/i.test(huntLine)) { add("rare", 1); return result; }
    if (/\(e\)/i.test(huntLine)) { add("epic", 1); return result; }
    if (/\(m\)/i.test(huntLine)) { add("mythical", 1); return result; }
    if (/\(l\)/i.test(huntLine)) { add("legendary", 1); return result; }
    if (/\(f\)/i.test(huntLine)) { add("fabled", 1); return result; }
    if (/\(s\)|\(special\)/i.test(huntLine)) { add("event", 1); return result; }

    // 2e. Bold animal name: **snail**, **dog**, **cp_xxx**, **glitchparrot**
    const boldMatch = huntLine.match(/\*\*([a-zA-Z0-9_]+)\*\*/);
    if (boldMatch) {
        const tier = resolveTier(boldMatch[1]);
        if (tier) {
            add(tier, 1);
            return result;
        }
    }

    // 2f. Unicode emoji on the hunt line
    const emojis = huntLine.match(/\p{Extended_Pictographic}/gu);
    if (emojis && emojis.length > 0) {
        for (const u of emojis) {
            const clean = u.replace(/\uFE0F/g, "");
            if (["🌱", "💎", "🧊", "🤍", "⭐", "✨", "🎲", "💰", "xp"].includes(clean)) continue;
            if (ANIMAL_RARITY_MAP[clean]) {
                add(ANIMAL_RARITY_MAP[clean], 1);
                return result;
            }
        }
    }

    return result;
}
