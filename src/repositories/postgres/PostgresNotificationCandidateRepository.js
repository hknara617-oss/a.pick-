'use strict';

const crypto = require('crypto');
const INotificationCandidateRepository = require('../interfaces/INotificationCandidateRepository');
const NotificationCandidate = require('../../watch/NotificationCandidate');

/**
 * src/repositories/postgres/PostgresNotificationCandidateRepository.js
 * Notification candidates repository with dedupe_key uniqueness.
 */
class PostgresNotificationCandidateRepository extends INotificationCandidateRepository {
    constructor(db) {
        super();
        this.db = db;
    }

    async saveCandidate(candidate) {
        if (!candidate || !candidate.decisionId) throw new Error('Valid NotificationCandidate required');
        if (this.db.failureMode === 'DISCONNECTED') throw new Error('DB_CONNECTION_ERROR');

        // Check dedupe_key uniqueness constraint: UNIQUE(dedupe_key)
        for (const existing of this.db.tables.notification_candidates.values()) {
            if (existing.dedupe_key === candidate.dedupeKey) {
                return existing.id; // Suppress duplicate candidate
            }
        }

        const id = candidate.id || crypto.randomUUID();
        const row = {
            id,
            decision_id: candidate.decisionId,
            created_at: candidate.createdAt || new Date().toISOString(),
            severity: candidate.severity,
            reason_code: candidate.reasonCode,
            title: candidate.title,
            body: candidate.body,
            dedupe_key: candidate.dedupeKey,
            action_state: candidate.actionState,
            thesis_state: candidate.thesisState,
            expires_at: candidate.expiresAt || null,
            evidence_refs: candidate.evidenceRefs || [],
            delivery_status: candidate.deliveryStatus || 'PENDING',
            created_db_at: new Date().toISOString()
        };

        this.db.tables.notification_candidates.set(id, Object.freeze(JSON.parse(JSON.stringify(row))));
        return id;
    }

    async getPendingNotifications(limit = 100) {
        if (this.db.failureMode === 'DISCONNECTED') throw new Error('DB_CONNECTION_ERROR');
        const results = [];
        for (const row of this.db.tables.notification_candidates.values()) {
            if (row.delivery_status === 'PENDING') {
                results.push(this.mapToModel(row));
            }
        }
        return results.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()).slice(0, limit);
    }

    async updateDeliveryStatus(id, status) {
        if (this.db.failureMode === 'DISCONNECTED') throw new Error('DB_CONNECTION_ERROR');
        const existing = this.db.tables.notification_candidates.get(id);
        if (!existing) throw new Error(`NotificationCandidate ${id} not found`);

        const updated = { ...existing, delivery_status: status, updated_at: new Date().toISOString() };
        this.db.tables.notification_candidates.set(id, Object.freeze(updated));
    }

    async getNotificationsByDecisionId(decisionId) {
        if (this.db.failureMode === 'DISCONNECTED') throw new Error('DB_CONNECTION_ERROR');
        const results = [];
        for (const row of this.db.tables.notification_candidates.values()) {
            if (row.decision_id === decisionId) {
                results.push(this.mapToModel(row));
            }
        }
        return results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    mapToModel(row) {
        return new NotificationCandidate({
            id: row.id,
            decisionId: row.decision_id,
            severity: row.severity,
            reasonCode: row.reason_code,
            title: row.title,
            body: row.body,
            dedupeKey: row.dedupe_key,
            actionState: row.action_state,
            thesisState: row.thesis_state,
            expiresAt: row.expires_at,
            evidenceRefs: row.evidence_refs,
            deliveryStatus: row.delivery_status,
            createdAt: row.created_at
        });
    }
}

module.exports = PostgresNotificationCandidateRepository;
