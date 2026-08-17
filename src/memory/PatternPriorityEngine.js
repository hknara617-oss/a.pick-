'use strict';

/**
 * src/memory/PatternPriorityEngine.js
 * Deterministically ranks patterns to find the single most critical behavior pattern.
 * Core: Outcome P&L is excluded. Ranks by decision quality impact, frequency, and sample size.
 */
class PatternPriorityEngine {
    static rankPatterns(patterns = []) {
        if (!patterns || patterns.length === 0) return [];

        const activePatterns = patterns.filter(p => p.status !== 'INSUFFICIENT' && p.status !== 'INACTIVE');

        const ranked = [...activePatterns].sort((a, b) => {
            // Severity weights for negative patterns
            const getSeverity = (code) => {
                if (code === 'BREAK_CONDITION_OVERRIDE') return 100;
                if (code === 'CHASE_AFTER_THRESHOLD') return 90;
                if (code === 'NEGATIVE_CLV_PATTERN') return 70;
                if (code === 'WEAKENED_THESIS_ENTRY') return 60;
                if (code === 'PRICE_DISCIPLINE') return 40;
                if (code === 'POSITIVE_CLV_PATTERN') return 30;
                return 10;
            };

            const scoreA = getSeverity(a.patternCode) * a.occurrenceRate * a.confidence * Math.min(a.applicableCount / 10, 2);
            const scoreB = getSeverity(b.patternCode) * b.occurrenceRate * b.confidence * Math.min(b.applicableCount / 10, 2);

            return scoreB - scoreA;
        });

        return ranked;
    }
}

module.exports = PatternPriorityEngine;
