'use strict';
const { SportsContextAdapter, SportsContextSnapshot } = require('./SportsContextAdapter');
const ContextSignal = require('../models/ContextSignal');

/**
 * src/context/BasketballContextAdapterStub.js
 */
class BasketballContextAdapterStub extends SportsContextAdapter {
    constructor() {
        super('BASKETBALL');
    }

    async getContext(event, asOf, externalData = {}) {
        const eventId = event?.eventId || 'basketball_event';
        const observedAt = asOf || new Date().toISOString();
        const signals = [];

        if (externalData.lineShifted) {
            signals.push(new ContextSignal({
                eventId,
                category: 'MARKET_FLOW',
                code: 'LINE_SHIFTED',
                severity: 'HIGH',
                direction: 'OPPOSES_THESIS',
                verified: true,
                observedAt,
                source: 'STUB',
                evidenceRef: `shift:${externalData.oldLine}->${externalData.newLine}`
            }));
        }

        return new SportsContextSnapshot({
            sport: 'BASKETBALL',
            eventId,
            observedAt,
            freshness: 'FRESH',
            signals,
            criticalData: { required: [], available: [], missing: [] },
            sourceRefs: ['basketball_stub']
        });
    }
}

module.exports = BasketballContextAdapterStub;
