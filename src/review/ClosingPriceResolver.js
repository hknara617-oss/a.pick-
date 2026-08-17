'use strict';

const ClosingPrice = require('../models/ClosingPrice');

/**
 * src/review/ClosingPriceResolver.js
 * Resolves verified pre-close market observation without fabricating.
 */
class ClosingPriceResolver {
    static resolveClosingPrice(marketObservations, contract, eventStartTime = null) {
        if (!marketObservations || marketObservations.length === 0) {
            return new ClosingPrice({
                marketId: contract.marketId,
                selectionId: contract.selectionId,
                odds: null,
                observedAt: null,
                status: 'UNAVAILABLE',
                sourceRef: 'NO_PRE_CLOSE_OBSERVATION'
            });
        }

        // Filter observations strictly before event start / market close
        const cutoffTime = eventStartTime ? new Date(eventStartTime).getTime() : Infinity;
        const validPreClose = marketObservations.filter(obs => {
            const obsTime = new Date(obs.observedAt || obs.observed_at).getTime();
            return obsTime <= cutoffTime;
        }).sort((a, b) => new Date(b.observedAt || b.observed_at).getTime() - new Date(a.observedAt || a.observed_at).getTime());

        if (validPreClose.length === 0) {
            return new ClosingPrice({
                marketId: contract.marketId,
                selectionId: contract.selectionId,
                odds: null,
                observedAt: null,
                status: 'UNAVAILABLE',
                sourceRef: 'NO_VALID_PRE_CLOSE_OBSERVATIONS'
            });
        }

        const latest = validPreClose[0];
        let closingOdds = null;

        // Find selection odds in latest observation
        if (latest.selections) {
            const sel = latest.selections.find(s => s.selectionId === contract.selectionId || s.selection_id === contract.selectionId);
            if (sel) closingOdds = sel.odds;
        } else if (latest.odds !== undefined) {
            closingOdds = latest.odds;
        }

        if (closingOdds === null || closingOdds === undefined) {
            return new ClosingPrice({
                marketId: contract.marketId,
                selectionId: contract.selectionId,
                odds: null,
                observedAt: latest.observedAt || latest.observed_at,
                status: 'UNAVAILABLE',
                sourceRef: 'SELECTION_ODDS_MISSING'
            });
        }

        return new ClosingPrice({
            marketId: contract.marketId,
            selectionId: contract.selectionId,
            odds: parseFloat(closingOdds),
            observedAt: latest.observedAt || latest.observed_at,
            status: latest.status === 'APPROXIMATE' ? 'APPROXIMATE' : 'VERIFIED',
            sourceRef: latest.sourceRef || latest.payloadHash || 'BETMAN_PRE_CLOSE'
        });
    }
}

module.exports = ClosingPriceResolver;
