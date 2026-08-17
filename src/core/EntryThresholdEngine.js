'use strict';

/**
 * src/core/EntryThresholdEngine.js
 * Computes minimum entry odds from fair odds and user-configured margin.
 *
 * CRITICAL RULE:
 * requiredMargin is configurable / uncalibrated.
 * Core never claims an "optimal margin".
 */
class EntryThresholdEngine {
    /**
     * @param {number} fairOdds - no-vig fair decimal odds (e.g. 1.85)
     * @param {number} requiredMargin - e.g. 0.03 for +3% margin over fair
     * @returns {number} minimumEntryOdds
     */
    static calculateMinimumEntryOdds(fairOdds, requiredMargin = 0.00) {
        if (!fairOdds || fairOdds <= 1.0 || isNaN(fairOdds)) {
            throw new Error(`Invalid fairOdds provided: ${fairOdds}`);
        }
        if (requiredMargin < -0.50 || requiredMargin > 2.00 || isNaN(requiredMargin)) {
            throw new Error(`Invalid requiredMargin provided: ${requiredMargin}`);
        }

        // minimumEntryOdds = fairOdds * (1 + requiredMargin)
        const minOdds = fairOdds * (1 + requiredMargin);
        return parseFloat(minOdds.toFixed(4));
    }

    /**
     * Determine if offered odds meet or exceed the entry threshold.
     */
    static isThresholdMet(currentOdds, minimumEntryOdds) {
        if (!currentOdds || !minimumEntryOdds) return false;
        return currentOdds >= minimumEntryOdds;
    }
}

module.exports = EntryThresholdEngine;
