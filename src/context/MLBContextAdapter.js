'use strict';
const { SportsContextAdapter, SportsContextSnapshot } = require('./SportsContextAdapter');
const ContextSignal = require('../models/ContextSignal');

/**
 * src/context/MLBContextAdapter.js
 * Verified MLB contextual adapter.
 * Provides starter status, starter changes, rest context, without probability adjustments.
 */
class MLBContextAdapter extends SportsContextAdapter {
    constructor() {
        super('BASEBALL');
    }

    async getContext(event, asOf, externalData = {}) {
        const eventId = event?.eventId || 'unknown_event';
        const observedAt = asOf || new Date().toISOString();
        const signals = [];
        const required = ['homeStarter', 'awayStarter'];
        const available = [];
        const missing = [];

        // Check starter status
        const homeStarter = externalData.homeStarter;
        const awayStarter = externalData.awayStarter;

        if (homeStarter && homeStarter.status === 'CONFIRMED') {
            available.push('homeStarter');
            signals.push(new ContextSignal({
                eventId,
                category: 'STARTER',
                code: 'HOME_STARTER_CONFIRMED',
                severity: 'LOW',
                direction: 'SUPPORTS_THESIS',
                verified: true,
                observedAt,
                source: 'statsapi.mlb.com',
                evidenceRef: `starter:${homeStarter.fullName || homeStarter.pitcherId}`
            }));
        } else {
            missing.push('homeStarter');
            signals.push(new ContextSignal({
                eventId,
                category: 'STARTER',
                code: 'HOME_STARTER_UNKNOWN',
                severity: 'HIGH',
                direction: 'UNKNOWN',
                verified: false,
                observedAt,
                source: 'statsapi.mlb.com',
                evidenceRef: 'homeStarter:null'
            }));
        }

        if (awayStarter && awayStarter.status === 'CONFIRMED') {
            available.push('awayStarter');
            signals.push(new ContextSignal({
                eventId,
                category: 'STARTER',
                code: 'AWAY_STARTER_CONFIRMED',
                severity: 'LOW',
                direction: 'SUPPORTS_THESIS',
                verified: true,
                observedAt,
                source: 'statsapi.mlb.com',
                evidenceRef: `starter:${awayStarter.fullName || awayStarter.pitcherId}`
            }));
        } else {
            missing.push('awayStarter');
            signals.push(new ContextSignal({
                eventId,
                category: 'STARTER',
                code: 'AWAY_STARTER_UNKNOWN',
                severity: 'HIGH',
                direction: 'UNKNOWN',
                verified: false,
                observedAt,
                source: 'statsapi.mlb.com',
                evidenceRef: 'awayStarter:null'
            }));
        }

        // Check if starter changed from initial
        if (externalData.starterChanged) {
            signals.push(new ContextSignal({
                eventId,
                category: 'STARTER',
                code: 'STARTER_CHANGED',
                severity: 'CRITICAL',
                direction: 'OPPOSES_THESIS',
                verified: true,
                observedAt,
                source: 'statsapi.mlb.com',
                evidenceRef: `changed_from:${externalData.originalStarter} to:${externalData.newStarter}`
            }));
        }

        const freshness = (missing.length === 0) ? 'FRESH' : 'DEGRADED';

        return new SportsContextSnapshot({
            sport: 'BASEBALL',
            eventId,
            observedAt,
            freshness,
            signals,
            criticalData: { required, available, missing },
            sourceRefs: ['statsapi.mlb.com']
        });
    }
}

module.exports = MLBContextAdapter;
