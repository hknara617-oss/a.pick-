'use strict';
const crypto = require('crypto');

/**
 * src/models/DecisionEvent.js
 * Append-only DecisionEvent with cryptographic hash chaining.
 */
class DecisionEvent {
    constructor({
        eventId,
        contractId,
        sequenceNumber = 1,
        eventType, // 'SEALED' | 'PRICE_MOVED' | 'THRESHOLD_CROSSED' | 'CONTEXT_SIGNAL' | 'THESIS_STATE_CHANGED' | 'ACTION_STATE_CHANGED' | 'BREAK_CONDITION_HIT' | 'USER_OVERRIDE'
        payload = {},
        timestamp = new Date().toISOString(),
        previousEventHash = 'GENESIS'
    }) {
        if (!contractId || !eventType) {
            throw new Error('DecisionEvent requires contractId and eventType');
        }
        this.eventId = eventId || `evt_${Math.random().toString(36).slice(2, 10)}`;
        this.contractId = contractId;
        this.sequenceNumber = sequenceNumber;
        this.eventType = eventType;
        this.payload = Object.freeze({ ...payload });
        this.timestamp = timestamp;
        this.previousEventHash = previousEventHash;

        // Deterministic hash calculation
        const hashInput = `${this.eventId}:${this.contractId}:${this.eventType}:${JSON.stringify(this.payload)}:${this.timestamp}:${this.previousEventHash}`;
        this.eventHash = crypto.createHash('sha256').update(hashInput).digest('hex');

        Object.freeze(this);
    }
}

module.exports = DecisionEvent;
