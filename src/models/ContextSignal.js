'use strict';
/**
 * src/models/ContextSignal.js
 */
class ContextSignal {
    constructor({
        id,
        eventId,
        category, // 'STARTER' | 'LINEUP' | 'SCHEDULE_REST' | 'VENUE_ENV' | 'ROSTER' | 'GENERAL'
        code,     // e.g. 'STARTER_CHANGED', 'KEY_PLAYER_OUT', 'REST_ADVANTAGE'
        severity = 'MEDIUM', // 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
        direction = 'NEUTRAL', // 'SUPPORTS_THESIS' | 'OPPOSES_THESIS' | 'NEUTRAL' | 'UNKNOWN'
        verified = false,
        observedAt = new Date().toISOString(),
        source = 'SYSTEM',
        evidenceRef = null
    }) {
        if (!eventId || !category || !code) {
            throw new Error('ContextSignal requires eventId, category, code');
        }
        this.id = id || `sig_${Math.random().toString(36).slice(2, 9)}`;
        this.eventId = eventId;
        this.category = category;
        this.code = code;
        this.severity = severity;
        this.direction = direction;
        this.verified = verified;
        this.observedAt = observedAt;
        this.source = source;
        this.evidenceRef = evidenceRef;
        Object.freeze(this);
    }
}

module.exports = ContextSignal;
