'use strict';

/**
 * src/models/DecisionMemoryScorecard.js
 * Multi-dimensional scorecard over rolling windows without single gamified IQ score.
 */
class DecisionMemoryScorecard {
    constructor({
        userId,
        windowType = 'ALL_TIME', // LAST_10 | LAST_25 | LAST_50 | ALL_TIME
        priceDisciplineRate = 0,
        ruleComplianceRate = 0,
        soundThesisRate = 0,
        goodPriceRate = 0,
        overrideRate = 0,
        belowThresholdEntryRate = 0,
        reviewedDecisions = 0,
        executedDecisions = 0,
        generatedAt = new Date().toISOString()
    }) {
        if (!userId) {
            throw new Error('DecisionMemoryScorecard requires userId');
        }

        this.userId = userId;
        this.windowType = windowType;
        this.priceDisciplineRate = parseFloat(priceDisciplineRate) || 0;
        this.ruleComplianceRate = parseFloat(ruleComplianceRate) || 0;
        this.soundThesisRate = parseFloat(soundThesisRate) || 0;
        this.goodPriceRate = parseFloat(goodPriceRate) || 0;
        this.overrideRate = parseFloat(overrideRate) || 0;
        this.belowThresholdEntryRate = parseFloat(belowThresholdEntryRate) || 0;
        this.reviewedDecisions = parseInt(reviewedDecisions, 10) || 0;
        this.executedDecisions = parseInt(executedDecisions, 10) || 0;
        this.generatedAt = generatedAt;

        Object.freeze(this);
    }
}

module.exports = DecisionMemoryScorecard;
