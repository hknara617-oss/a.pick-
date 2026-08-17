'use strict';

/**
 * src/models/MemoryImplication.js
 * Meaningful takeaway and prospective behavior direction derived from established patterns.
 */
class MemoryImplication {
    constructor({
        id = null,
        userId,
        patternCode,
        insight,
        implication,
        nextBehavior,
        appliesTo = 'GLOBAL',
        evidenceCount = 0,
        confidence = 0,
        status = 'ACTIVE', // ACTIVE | DISMISSED | SUPERSEDED
        generatedAt = new Date().toISOString()
    }) {
        if (!userId || !patternCode || !insight || !nextBehavior) {
            throw new Error('MemoryImplication requires userId, patternCode, insight, nextBehavior');
        }

        this.id = id || `imp_${userId}_${patternCode}_${Date.now()}`;
        this.userId = userId;
        this.patternCode = patternCode;
        this.insight = insight;
        this.implication = implication;
        this.nextBehavior = nextBehavior;
        this.appliesTo = appliesTo;
        this.evidenceCount = evidenceCount;
        this.confidence = parseFloat(confidence) || 0;
        this.status = status;
        this.generatedAt = generatedAt;

        Object.freeze(this);
    }
}

module.exports = MemoryImplication;
