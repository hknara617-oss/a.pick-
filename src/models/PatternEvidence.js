'use strict';

/**
 * src/models/PatternEvidence.js
 * Inspectable trace of specific decision records supporting a pattern.
 */
class PatternEvidence {
    constructor({
        patternId,
        decisionId,
        date = new Date().toISOString(),
        sport,
        market,
        observedBehavior,
        reviewAxis,
        evidenceRef = null
    }) {
        if (!patternId || !decisionId) {
            throw new Error('PatternEvidence requires patternId and decisionId');
        }

        this.patternId = patternId;
        this.decisionId = decisionId;
        this.date = date;
        this.sport = sport;
        this.market = market;
        this.observedBehavior = observedBehavior;
        this.reviewAxis = reviewAxis;
        this.evidenceRef = evidenceRef;

        Object.freeze(this);
    }
}

module.exports = PatternEvidence;
