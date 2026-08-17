'use strict';

/**
 * src/core/PriceStateEngine.js
 * Evaluates the current price state relative to entry threshold and fair price.
 */
class PriceStateEngine {
    /**
     * @param {number|null} currentOdds
     * @param {number|null} fairOdds
     * @param {number|null} minimumEntryOdds
     * @param {boolean} isStale
     * @returns {'ATTRACTIVE' | 'FAIR' | 'UNATTRACTIVE' | 'UNPRICED' | 'STALE'}
     */
    static evaluatePriceState(currentOdds, fairOdds, minimumEntryOdds, isStale = false) {
        if (isStale) return 'STALE';
        if (currentOdds === null || currentOdds === undefined || currentOdds <= 1.0 || isNaN(currentOdds)) {
            return 'UNPRICED';
        }
        if (!fairOdds || !minimumEntryOdds) {
            return 'UNPRICED';
        }

        if (currentOdds >= minimumEntryOdds) {
            return 'ATTRACTIVE';
        } else if (currentOdds >= fairOdds) {
            return 'FAIR';
        } else {
            return 'UNATTRACTIVE';
        }
    }
}

module.exports = PriceStateEngine;
