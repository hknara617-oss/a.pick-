'use strict';

/**
 * src/watch/NotificationCandidate.js
 * Structure for user notification candidates.
 */
class NotificationCandidate {
    constructor({
        id,
        decisionId,
        createdAt = new Date().toISOString(),
        severity = 'MEDIUM', // 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
        reasonCode,          // 'PRICE_THRESHOLD_CROSSED_DOWN' | 'PRICE_THRESHOLD_CROSSED_UP' | 'BREAK_CONDITION_HIT' | 'THESIS_STATE_CHANGED' | 'LINE_CHANGED' | 'COMPRESSED_MULTI_CHANGE'
        title,
        body,
        dedupeKey,
        actionState,
        thesisState,
        expiresAt = null,
        evidenceRefs = [],
        deliveryStatus = 'PENDING'
    }) {
        if (!decisionId || !reasonCode || !title || !body) {
            throw new Error('NotificationCandidate requires decisionId, reasonCode, title, body');
        }
        this.id = id || `notif_${Math.random().toString(36).slice(2, 10)}`;
        this.decisionId = decisionId;
        this.createdAt = createdAt;
        this.severity = severity;
        this.reasonCode = reasonCode;
        this.title = title;
        this.body = body;
        this.dedupeKey = dedupeKey || `${decisionId}:${reasonCode}:${actionState}`;
        this.actionState = actionState;
        this.thesisState = thesisState;
        this.expiresAt = expiresAt;
        this.evidenceRefs = Object.freeze([...evidenceRefs]);
        this.deliveryStatus = deliveryStatus;

        Object.freeze(this);
    }
}

module.exports = NotificationCandidate;
