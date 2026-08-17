'use strict';

const crypto = require('crypto');
const IWatchTargetRepository = require('../interfaces/IWatchTargetRepository');
const WatchTarget = require('../../watch/WatchTarget');

/**
 * src/repositories/postgres/PostgresWatchTargetRepository.js
 * Operational WATCH targets repository.
 */
class PostgresWatchTargetRepository extends IWatchTargetRepository {
    constructor(db) {
        super();
        this.db = db;
    }

    async saveWatchTarget(target) {
        if (!target || !target.decisionId) throw new Error('Valid WatchTarget required');
        if (this.db.failureMode === 'DISCONNECTED') throw new Error('DB_CONNECTION_ERROR');

        const id = target.id || crypto.randomUUID();
        const row = {
            id,
            decision_id: target.decisionId,
            event_id: target.eventId,
            market_id: target.marketId,
            selection_id: target.selectionId,
            enabled: target.enabled !== undefined ? target.enabled : true,
            status: target.status || 'ACTIVE',
            watch_policy: target.watchPolicy || {},
            created_at: target.createdAt || new Date().toISOString(),
            expires_at: target.expiresAt || null,
            last_successful_evaluation_at: target.lastSuccessfulEvaluationAt || null,
            last_provider_observation_at: target.lastProviderObservationAt || null,
            last_context_observation_at: target.lastContextObservationAt || null,
            updated_at: new Date().toISOString()
        };

        this.db.tables.watch_targets.set(id, Object.freeze(JSON.parse(JSON.stringify(row))));
        return id;
    }

    async updateWatchTarget(id, patch) {
        if (this.db.failureMode === 'DISCONNECTED') throw new Error('DB_CONNECTION_ERROR');
        const existing = this.db.tables.watch_targets.get(id);
        if (!existing) throw new Error(`WatchTarget ${id} not found`);

        const updated = { ...existing, ...patch, updated_at: new Date().toISOString() };
        this.db.tables.watch_targets.set(id, Object.freeze(updated));
    }

    async getWatchTargetByDecisionId(decisionId) {
        if (this.db.failureMode === 'DISCONNECTED') throw new Error('DB_CONNECTION_ERROR');
        for (const row of this.db.tables.watch_targets.values()) {
            if (row.decision_id === decisionId) {
                return this.mapToModel(row);
            }
        }
        return null;
    }

    async getActiveWatchTargets() {
        if (this.db.failureMode === 'DISCONNECTED') throw new Error('DB_CONNECTION_ERROR');
        const results = [];
        for (const row of this.db.tables.watch_targets.values()) {
            if (row.enabled && row.status === 'ACTIVE') {
                results.push(this.mapToModel(row));
            }
        }
        return results;
    }

    async getActiveTargetsByMarket(provider, roundId, marketId) {
        if (this.db.failureMode === 'DISCONNECTED') throw new Error('DB_CONNECTION_ERROR');
        const results = [];
        for (const targetRow of this.db.tables.watch_targets.values()) {
            if (!targetRow.enabled || targetRow.status !== 'ACTIVE') continue;
            const contractRow = this.db.tables.decision_contracts.get(targetRow.decision_id);
            if (contractRow && contractRow.provider === provider && contractRow.round_id === roundId && contractRow.market_id === marketId) {
                results.push(this.mapToModel(targetRow));
            }
        }
        return results;
    }

    mapToModel(row) {
        return new WatchTarget({
            id: row.id,
            decisionId: row.decision_id,
            eventId: row.event_id,
            marketId: row.market_id,
            selectionId: row.selection_id,
            enabled: row.enabled,
            status: row.status,
            watchPolicy: row.watch_policy,
            createdAt: row.created_at,
            expiresAt: row.expires_at,
            lastSuccessfulEvaluationAt: row.last_successful_evaluation_at,
            lastProviderObservationAt: row.last_provider_observation_at,
            lastContextObservationAt: row.last_context_observation_at
        });
    }
}

module.exports = PostgresWatchTargetRepository;
