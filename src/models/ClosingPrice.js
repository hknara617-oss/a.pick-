'use strict';

/**
 * src/models/ClosingPrice.js
 * Closing price verified from pre-close market observations.
 */
class ClosingPrice {
    constructor({
        marketId,
        selectionId,
        odds,
        observedAt,
        status = 'VERIFIED', // VERIFIED | APPROXIMATE | UNAVAILABLE
        sourceRef = null
    }) {
        if (!marketId || !selectionId) {
            throw new Error('ClosingPrice requires marketId and selectionId');
        }

        const validStatuses = ['VERIFIED', 'APPROXIMATE', 'UNAVAILABLE'];
        if (!validStatuses.includes(status)) {
            throw new Error(`Invalid closing price status: ${status}`);
        }

        this.marketId = marketId;
        this.selectionId = selectionId;
        this.odds = odds !== null && odds !== undefined ? parseFloat(odds) : null;
        this.observedAt = observedAt;
        this.status = status;
        this.sourceRef = sourceRef;

        Object.freeze(this);
    }
}

module.exports = ClosingPrice;
