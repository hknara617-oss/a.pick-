'use strict';
const { SportsContextAdapter, SportsContextSnapshot } = require('./SportsContextAdapter');
const ContextSignal = require('../models/ContextSignal');

/**
 * src/context/SoccerContextAdapterStub.js
 */
class SoccerContextAdapterStub extends SportsContextAdapter {
    constructor() {
        super('SOCCER');
    }

    async getContext(event, asOf, externalData = {}) {
        const eventId = event?.eventId || 'soccer_event';
        const observedAt = asOf || new Date().toISOString();
        const signals = [];

        if (externalData.lineupConfirmed) {
            signals.push(new ContextSignal({
                eventId,
                category: 'LINEUP',
                code: 'LINEUP_CONFIRMED',
                severity: 'LOW',
                direction: 'SUPPORTS_THESIS',
                verified: true,
                observedAt,
                source: 'STUB'
            }));
        }

        if (externalData.keyPlayerOut) {
            signals.push(new ContextSignal({
                eventId,
                category: 'LINEUP',
                code: 'KEY_PLAYER_OUT',
                severity: 'HIGH',
                direction: 'OPPOSES_THESIS',
                verified: true,
                observedAt,
                source: 'STUB',
                evidenceRef: externalData.playerRef || 'key_player_missing'
            }));
        }

        return new SportsContextSnapshot({
            sport: 'SOCCER',
            eventId,
            observedAt,
            freshness: externalData.isStale ? 'STALE' : 'FRESH',
            signals,
            criticalData: {
                required: ['officialLineup'],
                available: externalData.lineupConfirmed ? ['officialLineup'] : [],
                missing: externalData.lineupConfirmed ? [] : ['officialLineup']
            },
            sourceRefs: ['soccer_provider_stub']
        });
    }
}

module.exports = SoccerContextAdapterStub;
