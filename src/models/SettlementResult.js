'use strict';

/**
 * src/models/SettlementResult.js
 * Deterministic settlement representation from provider data.
 */
class SettlementResult {
    constructor({
        eventId,
        marketId,
        selectionId,
        result = 'UNKNOWN', // WIN | LOSS | PUSH | VOID | UNKNOWN
        verified = false,
        source = 'BETMAN',
        settledAt = new Date().toISOString(),
        rawPayload = {}
    }) {
        if (!eventId || !marketId || !selectionId) {
            throw new Error('SettlementResult requires eventId, marketId, selectionId');
        }

        const validResults = ['WIN', 'LOSS', 'PUSH', 'VOID', 'UNKNOWN'];
        if (!validResults.includes(result)) {
            throw new Error(`Invalid settlement result: ${result}`);
        }

        this.eventId = eventId;
        this.marketId = marketId;
        this.selectionId = selectionId;
        this.result = result;
        this.verified = Boolean(verified);
        this.source = source;
        this.settledAt = settledAt;
        this.rawPayload = Object.freeze({ ...rawPayload });

        Object.freeze(this);
    }
}

module.exports = SettlementResult;
