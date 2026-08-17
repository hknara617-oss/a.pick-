'use strict';
/**
 * src/models/Market.js
 */
class Market {
    constructor({
        marketId,
        eventId,
        marketType,
        line = null,
        selections = [],
        status = 'OPEN',
        shortlistEligible = true
    }) {
        if (!marketId || !eventId || !marketType) {
            throw new Error('Market requires marketId, eventId, marketType');
        }
        this.marketId = marketId;
        this.eventId = eventId;
        this.marketType = marketType; // 'MONEYLINE_2WAY' | 'MONEYLINE_3WAY' | 'WIN1LOSE' | 'HANDICAP_2WAY' | 'TOTAL' | 'ODD_EVEN'
        this.line = line; // e.g. -2.5, +1.0, 7.5, 2.5
        this.selections = selections; // Array of Selection objects
        this.status = status; // 'OPEN' | 'SUSPENDED' | 'CLOSED' | 'UNPRICED'
        this.shortlistEligible = (marketType === 'ODD_EVEN') ? false : shortlistEligible;
        Object.freeze(this);
    }
}

module.exports = Market;
