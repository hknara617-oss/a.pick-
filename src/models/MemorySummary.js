'use strict';

/**
 * src/models/MemorySummary.js
 * Compact user-facing product summary contract (4 core fields).
 * 1. 반복 패턴
 * 2. 가장 큰 의미
 * 3. 다음 한 가지 행동
 * 4. 다음 회차에 반영 여부
 */
class MemorySummary {
    constructor({
        userId,
        repeatingPattern,
        biggestImplication,
        oneNextBehavior,
        nextRoundApplied = false,
        evidenceCount = 0,
        confidence = 0,
        status = 'ACTIVE', // ACTIVE | INSUFFICIENT_DATA
        updatedAt = new Date().toISOString()
    }) {
        if (!userId) {
            throw new Error('MemorySummary requires userId');
        }

        this.userId = userId;
        this.repeatingPattern = repeatingPattern;
        this.biggestImplication = biggestImplication;
        this.oneNextBehavior = oneNextBehavior;
        this.nextRoundApplied = Boolean(nextRoundApplied);
        this.evidenceCount = evidenceCount;
        this.confidence = parseFloat(confidence) || 0;
        this.status = status;
        this.updatedAt = updatedAt;

        Object.freeze(this);
    }
}

module.exports = MemorySummary;
