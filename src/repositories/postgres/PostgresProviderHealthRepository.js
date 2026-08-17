'use strict';

const crypto = require('crypto');
const IProviderHealthRepository = require('../interfaces/IProviderHealthRepository');

/**
 * src/repositories/postgres/PostgresProviderHealthRepository.js
 * Provider health observations repository.
 */
class PostgresProviderHealthRepository extends IProviderHealthRepository {
    constructor(db) {
        super();
        this.db = db;
    }

    async recordHealthObservation(healthObs) {
        if (!healthObs || !healthObs.provider) throw new Error('Valid ProviderHealth required');
        if (this.db.failureMode === 'DISCONNECTED') throw new Error('DB_CONNECTION_ERROR');

        const id = healthObs.id || crypto.randomUUID();
        const row = {
            id,
            provider: healthObs.provider,
            observed_at: healthObs.observedAt || new Date().toISOString(),
            status: healthObs.status || 'HEALTHY',
            latency_ms: healthObs.latencyMs || null,
            error_code: healthObs.errorCode || null,
            details: healthObs.details || {},
            created_db_at: new Date().toISOString()
        };

        this.db.tables.provider_health_observations.set(id, Object.freeze(JSON.parse(JSON.stringify(row))));
        return id;
    }

    async getLatestHealth(provider) {
        if (this.db.failureMode === 'DISCONNECTED') throw new Error('DB_CONNECTION_ERROR');
        const matches = [];
        for (const row of this.db.tables.provider_health_observations.values()) {
            if (row.provider === provider) {
                matches.push(row);
            }
        }
        if (matches.length === 0) return null;
        matches.sort((a, b) => new Date(b.observed_at).getTime() - new Date(a.observed_at).getTime());
        return matches[0];
    }
}

module.exports = PostgresProviderHealthRepository;
