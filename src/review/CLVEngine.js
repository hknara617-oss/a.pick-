'use strict';

/**
 * src/review/CLVEngine.js
 * Canonical CLV (Closing Line Value) calculation engine.
 * Canonical Formula: CLV_RETURN_RATIO = (entryOdds / closingOdds) - 1
 */
class CLVEngine {
    static calculateCLV(entryOdds, closingOdds) {
        if (!entryOdds || !closingOdds || closingOdds <= 0) {
            return {
                clv: null,
                method: 'CLV_RETURN_RATIO',
                status: 'UNAVAILABLE'
            };
        }

        const e = parseFloat(entryOdds);
        const c = parseFloat(closingOdds);
        const clv = parseFloat(((e / c) - 1).toFixed(6));

        return {
            clv,
            method: 'CLV_RETURN_RATIO',
            status: 'CALCULATED',
            entryOdds: e,
            closingOdds: c
        };
    }
}

module.exports = CLVEngine;
