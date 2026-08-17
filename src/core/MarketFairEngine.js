'use strict';

/**
 * src/core/MarketFairEngine.js
 * Sport-agnostic, pure mathematical market fair engine.
 * Computes no-vig implied probability and no-vig fair odds from decimal odds.
 */
class MarketFairEngine {
    /**
     * Compute no-vig probabilities and fair odds for 2-way or 3-way markets.
     * Rejects unavailable or zero odds safely.
     *
     * @param {Array<number|null>} oddsList - list of offered decimal odds
     * @returns {{ rawImplied: number[], overround: number, noVigProbabilities: number[], noVigFairOdds: number[] }}
     */
    static computeMarketFair(oddsList) {
        if (!Array.isArray(oddsList) || (oddsList.length !== 2 && oddsList.length !== 3)) {
            throw new Error(`MarketFairEngine supports only 2-way or 3-way markets, got ${oddsList?.length}`);
        }

        // Validate all selections have valid positive odds
        for (let i = 0; i < oddsList.length; i++) {
            const o = oddsList[i];
            if (o === null || o === undefined || o <= 1.0 || isNaN(o)) {
                throw new Error(`Invalid or unavailable odds at index ${i}: ${o}`);
            }
        }

        const rawImplied = oddsList.map(o => 1 / o);
        const overround = rawImplied.reduce((sum, q) => sum + q, 0);

        if (overround <= 0 || !isFinite(overround)) {
            throw new Error(`Invalid overround calculated: ${overround}`);
        }

        const noVigProbabilities = rawImplied.map(q => q / overround);
        const noVigFairOdds = noVigProbabilities.map(p => 1 / p);

        // Verification of mathematical consistency
        const probSum = noVigProbabilities.reduce((sum, p) => sum + p, 0);
        if (Math.abs(probSum - 1.0) > 1e-10) {
            throw new Error(`Probabilities do not sum to 1.0: ${probSum}`);
        }

        return {
            rawImplied,
            overround,
            noVigProbabilities,
            noVigFairOdds
        };
    }

    /**
     * Helper for a specific selection given full market odds.
     */
    static getSelectionFair(selectionIndex, oddsList) {
        const result = this.computeMarketFair(oddsList);
        return {
            rawImplied: result.rawImplied[selectionIndex],
            noVigProbability: result.noVigProbabilities[selectionIndex],
            noVigFairOdds: result.noVigFairOdds[selectionIndex],
            overround: result.overround
        };
    }
}

module.exports = MarketFairEngine;
