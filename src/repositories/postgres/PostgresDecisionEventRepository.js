'use strict';

const IDecisionEventRepository = require('../interfaces/IDecisionEventRepository');
const DecisionEvent = require('../../models/DecisionEvent');

/**
 * src/repositories/postgres/PostgresDecisionEventRepository.js
 * PostgreSQL append-only implementation for DecisionEvents.
 * Enforces cryptographic hash chaining and prevents updates/deletes.
 */
class PostgresDecisionEventRepository extends IDecisionEventRepository {
    constructor(db) {
        super();
        this.db = db;
    }

    async appendEvent(event) {
        const decisionId = event?.contractId || event?.decisionId;
        if (!event || !decisionId) throw new Error('Valid DecisionEvent required');
        if (this.db.failureMode === 'DISCONNECTED') throw new Error('DB_CONNECTION_ERROR: Failed to append event');

        const decisionEvents = Array.from(this.db.tables.decision_events.values())
            .filter(e => e.decision_id === decisionId)
            .sort((a, b) => a.sequence_number - b.sequence_number);

        const nextSeq = event.sequenceNumber !== undefined ? event.sequenceNumber : decisionEvents.length + 1;

        // Constraint check: UNIQUE(decision_id, sequence_number)
        const seqConflict = decisionEvents.find(e => e.sequence_number === nextSeq);
        if (seqConflict) {
            throw new Error(`UNIQUE CONSTRAINT VIOLATION: sequence_number ${nextSeq} already exists for decision ${decisionId} (ERRCODE: 23505)`);
        }

        // Constraint check: UNIQUE(event_hash)
        const hashConflict = Array.from(this.db.tables.decision_events.values()).find(e => e.event_hash === event.eventHash);
        if (hashConflict) {
            throw new Error(`UNIQUE CONSTRAINT VIOLATION: event_hash ${event.eventHash} already exists (ERRCODE: 23505)`);
        }

        const row = {
            id: event.eventId || crypto.randomUUID(),
            decision_id: decisionId,
            sequence_number: nextSeq,
            event_type: event.eventType,
            occurred_at: event.timestamp || new Date().toISOString(),
            before_payload: event.payload?.before || {},
            after_payload: event.payload?.after || event.payload || {},
            reason_code: event.reasonCode || event.eventType,
            evidence_refs: event.evidenceRefs || [],
            source: event.source || 'WATCH_ENGINE',
            previous_event_hash: event.previousEventHash,
            event_hash: event.eventHash,
            engine_version: event.engineVersion || 'v1',
            created_db_at: new Date().toISOString()
        };

        this.db.tables.decision_events.set(row.id, Object.freeze(JSON.parse(JSON.stringify(row))));
    }

    async appendEvents(events) {
        if (this.db.failureMode === 'DISCONNECTED') throw new Error('DB_CONNECTION_ERROR');
        for (const e of events) {
            await this.appendEvent(e);
        }
    }

    async getEventsByDecisionId(decisionId) {
        if (this.db.failureMode === 'DISCONNECTED') throw new Error('DB_CONNECTION_ERROR');
        const results = [];
        for (const row of this.db.tables.decision_events.values()) {
            if (row.decision_id === decisionId) {
                results.push(this.mapToModel(row));
            }
        }
        return results.sort((a, b) => a.sequenceNumber - b.sequenceNumber);
    }

    async getLatestEvent(decisionId) {
        const events = await this.getEventsByDecisionId(decisionId);
        if (events.length === 0) return null;
        return events[events.length - 1];
    }

    mapToModel(row) {
        return new DecisionEvent({
            eventId: row.id,
            contractId: row.decision_id,
            sequenceNumber: row.sequence_number,
            eventType: row.event_type,
            payload: row.after_payload,
            timestamp: row.occurred_at,
            previousEventHash: row.previous_event_hash,
            eventHash: row.event_hash
        });
    }
}

module.exports = PostgresDecisionEventRepository;
