'use strict';

/**
 * src/context/SportsContextAdapter.js
 * Base interface for sport-specific context adapters.
 *
 * CRITICAL RULE:
 * Context adapters only provide verified contextual facts/signals.
 * NO PROBABILITIES.
 * NO FAIR ODDS.
 * NO EDGE.
 * NO ACTION STATE.
 */
class SportsContextAdapter {
    constructor(sport) {
        this.sport = sport;
    }

    /**
     * @param {Object} event - SportEvent
     * @param {string} asOf - ISO timestamp
     * @returns {Promise<SportsContextSnapshot>}
     */
    async getContext(event, asOf) {
        throw new Error('getContext() must be implemented by subclass');
    }
}

/**
 * Snapshot shape returned by any SportsContextAdapter.
 */
class SportsContextSnapshot {
    constructor({
        sport,
        eventId,
        observedAt = new Date().toISOString(),
        freshness = 'FRESH', // 'FRESH' | 'STALE' | 'UNKNOWN'
        signals = [],        // ContextSignal[]
        criticalData = { required: [], available: [], missing: [] },
        sourceRefs = []
    }) {
        this.sport = sport;
        this.eventId = eventId;
        this.observedAt = observedAt;
        this.freshness = freshness;
        this.signals = Object.freeze([...signals]);
        this.criticalData = Object.freeze({
            required: Object.freeze([...(criticalData.required || [])]),
            available: Object.freeze([...(criticalData.available || [])]),
            missing: Object.freeze([...(criticalData.missing || [])])
        });
        this.sourceRefs = Object.freeze([...sourceRefs]);
        Object.freeze(this);
    }
}

module.exports = { SportsContextAdapter, SportsContextSnapshot };
