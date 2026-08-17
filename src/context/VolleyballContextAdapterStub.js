'use strict';
const { SportsContextAdapter, SportsContextSnapshot } = require('./SportsContextAdapter');

/**
 * src/context/VolleyballContextAdapterStub.js
 */
class VolleyballContextAdapterStub extends SportsContextAdapter {
    constructor() {
        super('VOLLEYBALL');
    }

    async getContext(event, asOf, externalData = {}) {
        const eventId = event?.eventId || 'volleyball_event';
        const observedAt = asOf || new Date().toISOString();

        return new SportsContextSnapshot({
            sport: 'VOLLEYBALL',
            eventId,
            observedAt,
            freshness: 'FRESH',
            signals: [],
            criticalData: { required: [], available: [], missing: [] },
            sourceRefs: ['volleyball_stub']
        });
    }
}

module.exports = VolleyballContextAdapterStub;
