'use strict';

/**
 * src/models/DecisionMemoryRecord.js
 * Normalized atomic memory unit extracted deterministically from ReviewResult.
 */
class DecisionMemoryRecord {
    constructor({
        id = null,
        userId,
        decisionId,
        sport,
        league,
        marketType,
        createdAt = new Date().toISOString(),
        reviewedAt = new Date().toISOString(),
        executed = false,
        entryOdds = null,
        entryThreshold = null,
        priceQuality = 'UNKNOWN',
        ruleDiscipline = 'FOLLOWED',
        thesisQuality = 'SOUND',
        decisionQuality = 'FAIR',
        preGameFinalState = 'VALID',
        breakConditionCount = 0,
        breakConditionHits = 0,
        userOverrideUsed = false,
        thresholdCrossedBeforeEntry = false,
        enteredBelowThreshold = false,
        enteredAfterBreak = false,
        enteredWhileReview = false,
        enteredWhileWait = false,
        closingLineAvailable = false,
        clv = null,
        outcome = 'UNKNOWN',
        memoryVersion = 'v1.0.0'
    }) {
        if (!userId || !decisionId || !sport) {
            throw new Error('DecisionMemoryRecord requires userId, decisionId, sport');
        }

        this.id = id || `mem_${decisionId}`;
        this.userId = userId;
        this.decisionId = decisionId;
        this.sport = sport;
        this.league = league || 'UNKNOWN';
        this.marketType = marketType || 'STANDARD';
        this.createdAt = createdAt;
        this.reviewedAt = reviewedAt;

        this.executed = Boolean(executed);
        this.entryOdds = entryOdds !== null && entryOdds !== undefined ? parseFloat(entryOdds) : null;
        this.entryThreshold = entryThreshold !== null && entryThreshold !== undefined ? parseFloat(entryThreshold) : null;

        this.priceQuality = priceQuality;
        this.ruleDiscipline = ruleDiscipline;
        this.thesisQuality = thesisQuality;
        this.decisionQuality = decisionQuality;
        this.preGameFinalState = preGameFinalState;

        this.breakConditionCount = parseInt(breakConditionCount, 10) || 0;
        this.breakConditionHits = parseInt(breakConditionHits, 10) || 0;
        this.userOverrideUsed = Boolean(userOverrideUsed);

        this.thresholdCrossedBeforeEntry = Boolean(thresholdCrossedBeforeEntry);
        this.enteredBelowThreshold = Boolean(enteredBelowThreshold);
        this.enteredAfterBreak = Boolean(enteredAfterBreak);
        this.enteredWhileReview = Boolean(enteredWhileReview);
        this.enteredWhileWait = Boolean(enteredWhileWait);

        this.closingLineAvailable = Boolean(closingLineAvailable);
        this.clv = clv !== null && clv !== undefined ? parseFloat(clv) : null;

        this.outcome = outcome; // Contextual only
        this.memoryVersion = memoryVersion;

        Object.freeze(this);
    }
}

module.exports = DecisionMemoryRecord;
