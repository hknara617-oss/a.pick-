'use strict';

const crypto = require('crypto');
const IContextSnapshotRepository = require('../interfaces/IContextSnapshotRepository');

/**
 * src/repositories/postgres/PostgresContextSnapshotRepository.js
 * PostgreSQL implementation for sports context snapshots (facts/signals only, no probability markup).
 */
class PostgresContextSnapshotRepository extends IContextSnapshotRepository {
    constructor(db) {
        super();
        this.db = db;
    }

    async saveContextSnapshot(snapshot) {
        if (!snapshot || !snapshot.eventId) throw new Error('Valid ContextSnapshot required');
        if (this.db.failureMode === 'DISCONNECTED') throw new Error('DB_CONNECTION_ERROR');

        const payloadHash = snapshot.payloadHash || crypto.createHash('sha256').update(JSON.stringify(snapshot)).digest('hex');
        const id = snapshot.id || crypto.randomUUID();
        const observedAt = snapshot.observedAt || new Date().toISOString();

        // Idempotency: (sport, event_id, observed_at, payload_hash)
        for (const existing of this.db.tables.context_snapshots.values()) {
            if (existing.sport === snapshot.sport &&
                existing.event_id === snapshot.eventId &&
                existing.observed_at === observedAt &&
                existing.payload_hash === payloadHash) {
                return existing.id;
            }
        }

        const row = {
            id,
            sport: snapshot.sport,
            event_id: snapshot.eventId,
            adapter: snapshot.adapter || 'CoreContextAdapter',
            observed_at: observedAt,
            freshness: snapshot.freshness || 'FRESH',
            signals: snapshot.signals || [],
            critical_data: snapshot.criticalData || {},
            source_refs: snapshot.sourceRefs || {},
            payload_hash: payloadHash,
            created_db_at: new Date().toISOString()
        };

        this.db.tables.context_snapshots.set(id, Object.freeze(JSON.parse(JSON.stringify(row))));
        return id;
    }

    async getLatestContextSnapshot(sport, eventId) {
        if (this.db.failureMode === 'DISCONNECTED') throw new Error('DB_CONNECTION_ERROR');
        const matches = [];
        for (const row of this.db.tables.context_snapshots.values()) {
            if (row.sport === sport && row.event_id === eventId) {
                matches.push(row);
            }
        }
        if (matches.length === 0) return null;
        matches.sort((a, b) => new Date(b.observed_at).getTime() - new Date(a.observed_at).getTime());
        return matches[0];
    }

    async getContextHistory(sport, eventId, limit = 20) {
        if (this.db.failureMode === 'DISCONNECTED') throw new Error('DB_CONNECTION_ERROR');
        const matches = [];
        for (const row of this.db.tables.context_snapshots.values()) {
            if (row.sport === sport && row.event_id === eventId) {
                matches.push(row);
            }
        }
        return matches.sort((a, b) => new Date(b.observed_at).getTime() - new Date(a.observed_at).getTime()).slice(0, limit);
    }
}

module.exports = PostgresContextSnapshotRepository;
