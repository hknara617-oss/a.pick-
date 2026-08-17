'use strict';

const crypto = require('crypto');
const IMarketObservationRepository = require('../interfaces/IMarketObservationRepository');

/**
 * src/repositories/postgres/PostgresMarketObservationRepository.js
 * PostgreSQL time-series implementation for MarketObservations.
 * Guarantees idempotency on repeated identical observations.
 */
class PostgresMarketObservationRepository extends IMarketObservationRepository {
    constructor(db) {
        super();
        this.db = db;
    }

    async saveMarketObservation(obs, selectionObsList = []) {
        if (!obs || !obs.marketId) throw new Error('Valid MarketObservation required');
        if (this.db.failureMode === 'DISCONNECTED') throw new Error('DB_CONNECTION_ERROR');

        const payloadHash = obs.payloadHash || crypto.createHash('sha256').update(JSON.stringify(obs)).digest('hex');
        const obsId = obs.id || crypto.randomUUID();
        const observedAt = obs.observedAt || new Date().toISOString();

        // Idempotency check: (provider, round_id, market_id, observed_at, payload_hash)
        for (const existing of this.db.tables.market_observations.values()) {
            if (existing.provider === obs.provider &&
                existing.round_id === obs.roundId &&
                existing.market_id === obs.marketId &&
                existing.observed_at === observedAt &&
                existing.payload_hash === payloadHash) {
                return existing.id; // Idempotent: return existing record ID without duplicating
            }
        }

        const row = {
            id: obsId,
            provider: obs.provider || 'BETMAN',
            round_id: obs.roundId,
            market_id: obs.marketId,
            event_id: obs.eventId || obs.marketId,
            market_type: obs.marketType || 'MATCH_ODDS',
            line: obs.line || null,
            availability: obs.availability || 'OPEN',
            observed_at: observedAt,
            received_at: new Date().toISOString(),
            provider_health: obs.providerHealth || 'HEALTHY',
            payload_hash: payloadHash,
            created_db_at: new Date().toISOString()
        };

        this.db.tables.market_observations.set(obsId, Object.freeze(JSON.parse(JSON.stringify(row))));

        // Save Selection Observations
        for (const sObs of selectionObsList) {
            const sId = sObs.id || crypto.randomUUID();
            const sRow = {
                id: sId,
                market_observation_id: obsId,
                selection_id: sObs.selectionId,
                label: sObs.label,
                side: sObs.side,
                odds: sObs.odds,
                availability: sObs.availability || 'OPEN',
                created_db_at: new Date().toISOString()
            };
            this.db.tables.selection_observations.set(sId, Object.freeze(sRow));
        }

        return obsId;
    }

    async getLatestMarketObservation(provider, roundId, marketId) {
        if (this.db.failureMode === 'DISCONNECTED') throw new Error('DB_CONNECTION_ERROR');
        const matches = [];
        for (const row of this.db.tables.market_observations.values()) {
            if (row.provider === provider && row.round_id === roundId && row.market_id === marketId) {
                matches.push(row);
            }
        }
        if (matches.length === 0) return null;
        matches.sort((a, b) => new Date(b.observed_at).getTime() - new Date(a.observed_at).getTime());
        return matches[0];
    }

    async getMarketHistory(provider, roundId, marketId, limit = 50) {
        if (this.db.failureMode === 'DISCONNECTED') throw new Error('DB_CONNECTION_ERROR');
        const matches = [];
        for (const row of this.db.tables.market_observations.values()) {
            if (row.provider === provider && row.round_id === roundId && row.market_id === marketId) {
                matches.push(row);
            }
        }
        return matches.sort((a, b) => new Date(b.observed_at).getTime() - new Date(a.observed_at).getTime()).slice(0, limit);
    }

    async getSelectionObservations(marketObservationId) {
        if (this.db.failureMode === 'DISCONNECTED') throw new Error('DB_CONNECTION_ERROR');
        const results = [];
        for (const row of this.db.tables.selection_observations.values()) {
            if (row.market_observation_id === marketObservationId) {
                results.push(row);
            }
        }
        return results;
    }
}

module.exports = PostgresMarketObservationRepository;
