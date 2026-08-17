export class TooltipHistoryParser {
    public normalizeTooltipOdds(raw: unknown): string | null {
        if (raw === null || raw === undefined) return null;
        const n = Number(raw);
        if (isNaN(n)) return null;
        if (n === 0) return null;
        if (n < 0) return null;
        
        // Tooltip odds are provided in integer scale (e.g. 480 for 4.80)
        return (Math.round((n / 100) * 100) / 100).toFixed(2);
    }

    public parseTooltipTimestamp(raw: unknown): {
        raw: string;
        parsedAt: string | null;
        status: 'UNVERIFIED_TIMESTAMP_FORMAT' | 'VERIFIED';
        note: string;
    } {
        const rawStr = String(raw ?? '');
        // Hypothesis: YYYYMMDDHHmmss + 6 fractional digits
        // Example: 20260815191634031948
        if (rawStr.length === 20) {
            // It could be verified, but for now we mark it UNVERIFIED_TIMESTAMP_FORMAT as per requirements until 3+ rounds are confirmed
            return {
                raw: rawStr,
                parsedAt: null,
                status: 'UNVERIFIED_TIMESTAMP_FORMAT',
                note: 'Length 20 matches YYYYMMDDHHmmss + 6 nanoseconds. Needs empirical confirmation.'
            };
        }
        
        return {
            raw: rawStr,
            parsedAt: null,
            status: 'UNVERIFIED_TIMESTAMP_FORMAT',
            note: 'CHG_DTM format unverified.'
        };
    }
}
