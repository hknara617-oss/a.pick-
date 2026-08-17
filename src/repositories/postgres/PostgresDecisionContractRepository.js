'use strict';

const IDecisionContractRepository = require('../interfaces/IDecisionContractRepository');
const DecisionContract = require('../../models/DecisionContract');

/**
 * src/repositories/postgres/PostgresDecisionContractRepository.js
 * PostgreSQL implementation of DecisionContractRepository.
 * Enforces DB-level immutability once sealed_at IS NOT NULL.
 */
class PostgresDecisionContractRepository extends IDecisionContractRepository {
    constructor(db) {
        super();
        this.db = db;
    }

    async saveContract(contract) {
        if (!contract || !contract.id) throw new Error('Valid DecisionContract required');
        if (this.db.failureMode === 'DISCONNECTED') throw new Error('DB_CONNECTION_ERROR: Failed to save contract');

        // Check if contract already exists
        const existing = this.db.tables.decision_contracts.get(contract.id);
        if (existing && existing.sealed_at) {
            throw new Error(`IMMUTABILITY VIOLATION: DecisionContract ${contract.id} is sealed and cannot be modified or deleted. (ERRCODE: 23514)`);
        }

        const row = {
            id: contract.id,
            user_id: contract.userId || '00000000-0000-0000-0000-000000000001',
            provider: contract.provider,
            round_id: contract.roundId,
            sport: contract.sport,
            league: contract.league,
            event_id: contract.eventId,
            market_id: contract.marketId,
            selection_id: contract.selectionId,
            created_at: contract.createdAt || new Date().toISOString(),
            sealed_at: contract.sealedAt,
            offered_odds_at_seal: contract.offeredOddsAtSeal,
            market_fair_odds_at_seal: contract.marketFairOddsAtSeal,
            market_no_vig_probability_at_seal: contract.marketNoVigProbabilityAtSeal,
            entry_rule: contract.entryRule,
            initial_price_state: contract.initialPriceState,
            thesis: contract.thesis,
            break_conditions: contract.breakConditions,
            validity: contract.validity,
            source_freshness_at_seal: contract.sourceFreshnessAtSeal,
            status: contract.status || 'ACTIVE',
            contract_version: contract.contractVersion || 'v1',
            payload_hash: contract.payloadHash,
            created_db_at: new Date().toISOString()
        };

        this.db.tables.decision_contracts.set(contract.id, Object.freeze(JSON.parse(JSON.stringify(row))));
    }

    async getContractById(id) {
        if (this.db.failureMode === 'DISCONNECTED') throw new Error('DB_CONNECTION_ERROR');
        const row = this.db.tables.decision_contracts.get(id);
        if (!row) return null;
        return this.mapToModel(row);
    }

    async getContractsByUser(userId) {
        if (this.db.failureMode === 'DISCONNECTED') throw new Error('DB_CONNECTION_ERROR');
        const results = [];
        for (const row of this.db.tables.decision_contracts.values()) {
            if (row.user_id === userId) {
                results.push(this.mapToModel(row));
            }
        }
        return results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    async getContractsByMarket(provider, roundId, marketId) {
        if (this.db.failureMode === 'DISCONNECTED') throw new Error('DB_CONNECTION_ERROR');
        const results = [];
        for (const row of this.db.tables.decision_contracts.values()) {
            if (row.provider === provider && row.round_id === roundId && row.market_id === marketId) {
                results.push(this.mapToModel(row));
            }
        }
        return results;
    }

    async updateContract(id, patch) {
        if (this.db.failureMode === 'DISCONNECTED') throw new Error('DB_CONNECTION_ERROR');
        const existing = this.db.tables.decision_contracts.get(id);
        if (!existing) throw new Error(`Contract ${id} not found`);

        // DB Trigger simulation: reject update if sealed
        if (existing.sealed_at) {
            throw new Error(`IMMUTABILITY VIOLATION: DecisionContract ${id} is sealed and cannot be modified or deleted. (ERRCODE: 23514)`);
        }

        const updated = { ...existing, ...patch, updated_at: new Date().toISOString() };
        this.db.tables.decision_contracts.set(id, Object.freeze(updated));
    }

    mapToModel(row) {
        return new DecisionContract({
            id: row.id,
            userId: row.user_id,
            provider: row.provider,
            roundId: row.round_id,
            sport: row.sport,
            league: row.league,
            eventId: row.event_id,
            marketId: row.market_id,
            selectionId: row.selection_id,
            createdAt: row.created_at,
            sealedAt: row.sealed_at,
            offeredOddsAtSeal: row.offered_odds_at_seal,
            marketFairOddsAtSeal: row.market_fair_odds_at_seal,
            marketNoVigProbabilityAtSeal: row.market_no_vig_probability_at_seal,
            entryRule: row.entry_rule,
            initialPriceState: row.initial_price_state,
            thesis: row.thesis,
            breakConditions: row.break_conditions,
            validity: row.validity,
            sourceFreshnessAtSeal: row.source_freshness_at_seal,
            status: row.status,
            contractVersion: row.contract_version,
            payloadHash: row.payload_hash
        });
    }
}

module.exports = PostgresDecisionContractRepository;
