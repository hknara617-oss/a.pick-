'use strict';

const SettlementResult = require('../models/SettlementResult');

/**
 * src/review/SettlementEngine.js
 * Deterministic settlement verification engine.
 */
class SettlementEngine {
    static resolveSettlement(settlementData, contract) {
        if (!settlementData) {
            return new SettlementResult({
                eventId: contract.eventId,
                marketId: contract.marketId,
                selectionId: contract.selectionId,
                result: 'UNKNOWN',
                verified: false,
                source: 'UNAVAILABLE'
            });
        }

        const res = settlementData.result || 'UNKNOWN';
        const isVerified = Boolean(settlementData.verified);

        return new SettlementResult({
            eventId: contract.eventId,
            marketId: contract.marketId,
            selectionId: contract.selectionId,
            result: res,
            verified: isVerified,
            source: settlementData.source || 'BETMAN',
            settledAt: settlementData.settledAt || new Date().toISOString(),
            rawPayload: settlementData.rawPayload || {}
        });
    }
}

module.exports = SettlementEngine;
