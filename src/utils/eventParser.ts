import { EventInfo } from "@/structure/core/MetricsTracker.js";

const MONTH_MAP: Record<string, number> = {
    jan: 0, january: 0,
    feb: 1, february: 1,
    mar: 2, march: 2,
    apr: 3, april: 3,
    may: 4,
    jun: 5, june: 5,
    jul: 6, july: 6,
    aug: 7, august: 7,
    sep: 8, sept: 8, september: 8,
    oct: 9, october: 9,
    nov: 10, november: 10,
    dec: 11, december: 11,
};

/**
 * Robust date parser supporting Discord timestamps, OwO Snail formats like '15-Oct-26 1:45 PM',
 * and standard ISO / US date strings.
 */
export function parseEventEndDate(rawStr: string): number | null {
    if (!rawStr) return null;
    const clean = rawStr.trim();

    // 1. Discord timestamp format: <t:1792046700:F> or <t:1792046700>
    const discordMatch = clean.match(/<t:(\d+)(?::[a-zA-Z])?>/);
    if (discordMatch) {
        const sec = parseInt(discordMatch[1], 10);
        if (!isNaN(sec) && sec > 0) return sec * 1000;
    }

    // 2. OwO standard announcement format: DD-Mon-YY HH:MM AM/PM (e.g. '15-Oct-26 1:45 PM')
    const owoDateMatch = clean.match(/(\d{1,2})-([A-Za-z]{3,9})-(\d{2,4})\s+(\d{1,2}):(\d{2})(?:\s*([AaPp][Mm]))?/i);
    if (owoDateMatch) {
        const day = parseInt(owoDateMatch[1], 10);
        const monthKey = owoDateMatch[2].toLowerCase();
        const month = MONTH_MAP[monthKey];
        let year = parseInt(owoDateMatch[3], 10);
        if (year < 100) year += 2000; // e.g. 26 -> 2026

        let hours = parseInt(owoDateMatch[4], 10);
        const minutes = parseInt(owoDateMatch[5], 10);
        const ampm = owoDateMatch[6]?.toUpperCase();

        if (ampm === "PM" && hours < 12) hours += 12;
        if (ampm === "AM" && hours === 12) hours = 0;

        if (month !== undefined && !isNaN(day) && !isNaN(year)) {
            // OwO timestamps in announcements are typically EST/EDT (UTC-4/UTC-5) or UTC/local.
            // Snail posts in local / Discord time. Construct valid date object:
            const d = new Date(year, month, day, hours, minutes, 0);
            return d.getTime();
        }
    }

    // 3. Fallback standard JavaScript Date parse
    try {
        const parsed = Date.parse(clean);
        if (!isNaN(parsed) && parsed > 0) return parsed;
    } catch {}

    return null;
}

/**
 * Parses announcement message content from OwO Bot Support or forwarded announcements channel.
 */
export function parseAnnouncementMessage(content: string): Partial<EventInfo> | null {
    if (!content || typeof content !== "string") return null;

    // Check if message is related to an event / FAQ / announcement
    const isEventAnnouncement = /(?:event|faq|holiday|halloween|christmas|easter|valentine|anniversary|summer)/i.test(content);
    const hasEnding = /(?:event ending|ends at|ending at|ending:|ends on|until)\s*(?:at\s*)?([^\n\r]+)/i.test(content);
    const hasDiscordTimestamp = /<t:\d+/.test(content);

    if (!isEventAnnouncement && !hasEnding && !hasDiscordTimestamp) {
        return null;
    }

    // Extract Event Name
    let eventName = "OwO Special Event";
    const titleMatch = content.match(/[\p{Emoji}\u200d\s]*([A-Za-z0-9 ]+?\s+(?:Event|FAQ))/iu)
        || content.match(/(?:#+\s*)?([A-Za-z0-9 ]+?\s+Event)/i);
    if (titleMatch) {
        let nameCandidate = titleMatch[1].replace(/FAQ/gi, "").trim();
        if (nameCandidate.length > 2) {
            eventName = nameCandidate;
        }
    }

    // Extract Ending Raw string & Timestamp
    let endingRaw: string | undefined;
    let endTimestamp: number | null = null;

    const endingLineMatch = content.match(/(?:event ending at|ends at|ending at|ending:|ends on|runs until)\s*(?:at\s*)?([0-9]{1,2}-[A-Za-z]{3,9}-[0-9]{2,4}\s+[0-9]{1,2}:[0-9]{2}(?:\s*[AaPp][Mm])?|<t:\d+(?::[A-Za-z])?>|[A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4}(?:\s+\d{1,2}:\d{2}\s*[AaPp][Mm])?)/i);
    if (endingLineMatch) {
        endingRaw = endingLineMatch[1].trim();
        endTimestamp = parseEventEndDate(endingRaw);
    } else {
        // Look for any Discord timestamp in message
        const dcMatch = content.match(/<t:(\d+)(?::[A-Za-z])?>/);
        if (dcMatch) {
            endingRaw = dcMatch[0];
            endTimestamp = parseInt(dcMatch[1], 10) * 1000;
        }
    }

    // Extract Special Gems Allowed
    let specialGemsAllowed = false;
    if (/Special Gems for this event\??\s*\n\s*Yes/i.test(content) || /special gem.*(?:allowed|work|yes)/i.test(content)) {
        specialGemsAllowed = true;
    }

    // Extract Pet catch rates
    let petRates: string | undefined;
    const petRateMatch = content.match(/Catch Rates:\s*([^\n\r]+)/i);
    if (petRateMatch) {
        petRates = petRateMatch[1].trim();
    }

    // Extract Holidays or Summary
    let summary: string | undefined;
    const holidayMatch = content.match(/What are the holidays being celebrated\??\s*\n\s*([^\n\r]+)/i);
    if (holidayMatch) {
        summary = holidayMatch[1].trim();
    }

    const itemsPerDayMatch = content.match(/find up to (\d+)\s*per day/i);
    if (itemsPerDayMatch) {
        const itemInfo = `Up to ${itemsPerDayMatch[1]} event items/day via hunt & battle`;
        summary = summary ? `${summary} • ${itemInfo}` : itemInfo;
    }

    if (!endTimestamp) {
        // If no timestamp was parsed, we still return title if relevant but cannot compute countdown
        return {
            eventName,
            summary: summary || "OwO Seasonal Event",
            specialGemsAllowed,
            petRates,
            announcementSnippet: content.slice(0, 300),
            source: "auto",
            updatedAt: Date.now(),
        };
    }

    return {
        eventName,
        endTimestamp,
        endingRaw: endingRaw || new Date(endTimestamp).toLocaleString(),
        isActive: Date.now() < endTimestamp,
        summary: summary || "OwO Seasonal Event",
        specialGemsAllowed,
        petRates,
        announcementSnippet: content.slice(0, 300),
        source: "auto",
        updatedAt: Date.now(),
    };
}
