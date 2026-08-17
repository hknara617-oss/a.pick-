'use strict';

/**
 * src/watch/WatchTarget.js
 * Represents a persistent watch target referencing an immutable, sealed DecisionContract.
 */
class WatchTarget {
    constructor({
        id,
        decisionId,
        provider = 'BETMAN',
        roundId,
        eventId,
        marketId,
        selectionId,
        enabled = true,
        createdAt = new Date().toISOString(),
        expiresAt = null,
        watchPolicy = null,
        lastSuccessfulEvaluationAt = null,
        lastProviderObservationAt = null,
        lastContextObservationAt = null,
        status = 'ACTIVE' // 'ACTIVE' | 'PAUSED' | 'EXPIRED' | 'CLOSED' | 'ERROR'
    }) {
        if (!id || !decisionId || !eventId || !marketId || !selectionId) {
            throw new Error('WatchTarget requires id, decisionId, eventId, marketId, selectionId');
        }
        this.id = id;
        this.decisionId = decisionId;
        this.provider = provider;
        this.roundId = roundId;
        this.eventId = eventId;
        this.marketId = marketId;
        this.selectionId = selectionId;
        this.enabled = Boolean(enabled);
        this.createdAt = createdAt;
        this.expiresAt = expiresAt;
        this.watchPolicy = watchPolicy ? Object.freeze({ ...watchPolicy }) : null;
        this.lastSuccessfulEvaluationAt = lastSuccessfulEvaluationAt;
        this.lastProviderObservationAt = lastProviderObservationAt;
        this.lastContextObservationAt = lastContextObservationAt;
        this.status = status;

        Object.freeze(this);
    }
}

module.exports = WatchTarget;
