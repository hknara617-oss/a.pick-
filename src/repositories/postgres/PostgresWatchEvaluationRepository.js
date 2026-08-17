'use strict';

const crypto = require('crypto');
const IWatchEvaluationRepository = require('../interfaces/IWatchEvaluationRepository');
const WatchEvaluation = require('../../watch/WatchEvaluation');

/**
 * src/repositories/postgres/PostgresWatchEvaluationRepository.js
 * Append-only repository for historical WatchEvaluations with input fingerprint deduplication.
 */
class PostgresWatchEvaluationRepository extends IWatchEvaluationRepository {
    constructor(db) {
        super();
        this.db = db;
    }

    async saveEvaluation(evaluation) {
        if (!evaluation || !evaluation.decisionId) throw new Error('Valid WatchEvaluation required');
        if (this.db.failureMode === 'DISCONNECTED') throw new Error('DB_CONNECTION_ERROR');

        const inputFingerprint = evaluation.inputFingerprint || crypto.createHash('sha256')
            .update(`${evaluation.decisionId}:${evaluation.evaluatedAt}:${JSON.stringify(evaluation.currentContext)}`)
            .digest('hex');

        // Check fingerprint uniqueness: (decision_id, evaluated_at, input_fingerprint)
        for (const existing of this.db.tables.watch_evaluations.values()) {
            if (existing.decision_id === evaluation.decisionId &&
                existing.evaluated_at === evaluation.evaluatedAt &&
                existing.input_fingerprint === inputFingerprint) {
                return existing.id; // Idempotent: return existing evaluation without duplicate insert
            }
        }

        const id = evaluation.id || crypto.randomUUID();
        const row = {
            id,
            watch_target_id: evaluation.watchTargetId,
            decision_id: evaluation.decisionId,
            evaluated_at: evaluation.evaluatedAt || new Date().toISOString(),
            previous_thesis_state: evaluation.previousThesisState,
            current_thesis_state: evaluation.currentThesisState,
            previous_action_state: evaluation.previousActionState,
            current_action_state: evaluation.currentActionState,
            materiality: evaluation.materiality,
            detected_changes: evaluation.detectedChanges || [],
            source_freshness: evaluation.sourceFreshness || {},
            notification_candidate_id: evaluation.notificationCandidate?.id || null,
            engine_version: evaluation.engineVersion || 'v1',
            input_fingerprint: inputFingerprint,
            created_db_at: new Date().toISOString()
        };

        this.db.tables.watch_evaluations.set(id, Object.freeze(JSON.parse(JSON.stringify(row))));
        return id;
    }

    async getLatestEvaluation(decisionId) {
        if (this.db.failureMode === 'DISCONNECTED') throw new Error('DB_CONNECTION_ERROR');
        const matches = [];
        for (const row of this.db.tables.watch_evaluations.values()) {
            if (row.decision_id === decisionId) {
                matches.push(this.mapToModel(row));
            }
        }
        if (matches.length === 0) return null;
        matches.sort((a, b) => new Date(b.evaluatedAt).getTime() - new Date(a.evaluatedAt).getTime());
        return matches[0];
    }

    async getEvaluationsByDecisionId(decisionId, limit = 100) {
        if (this.db.failureMode === 'DISCONNECTED') throw new Error('DB_CONNECTION_ERROR');
        const matches = [];
        for (const row of this.db.tables.watch_evaluations.values()) {
            if (row.decision_id === decisionId) {
                matches.push(this.mapToModel(row));
            }
        }
        return matches.sort((a, b) => new Date(b.evaluatedAt).getTime() - new Date(a.evaluatedAt).getTime()).slice(0, limit);
    }

    mapToModel(row) {
        return new WatchEvaluation({
            id: row.id,
            watchTargetId: row.watch_target_id,
            decisionId: row.decision_id,
            evaluatedAt: row.evaluated_at,
            previousThesisState: row.previous_thesis_state,
            currentThesisState: row.current_thesis_state,
            previousActionState: row.previous_action_state,
            currentActionState: row.current_action_state,
            materiality: row.materiality,
            detectedChanges: row.detected_changes,
            sourceFreshness: row.source_freshness,
            engineVersion: row.engine_version
        });
    }
}

module.exports = PostgresWatchEvaluationRepository;
