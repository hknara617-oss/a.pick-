'use strict';

const DecisionMemoryScorecard = require('../models/DecisionMemoryScorecard');

/**
 * src/memory/MemoryScorecardEngine.js
 * Generates rolling multi-dimensional scorecards (LAST_10, ALL_TIME).
 */
class MemoryScorecardEngine {
    static generateScorecard(records = [], userId, windowType = 'ALL_TIME') {
        if (!userId) {
            throw new Error('MemoryScorecardEngine requires userId');
        }

        let slice = [...records];
        if (windowType === 'LAST_10') slice = records.slice(0, 10);
        else if (windowType === 'LAST_25') slice = records.slice(0, 25);
        else if (windowType === 'LAST_50') slice = records.slice(0, 50);

        const totalReviewed = slice.length;
        if (totalReviewed === 0) {
            return new DecisionMemoryScorecard({ userId, windowType });
        }

        const executedList = slice.filter(r => r.executed);
        const totalExecuted = executedList.length;

        // 1. Price Discipline Rate (entryOdds >= entryThreshold)
        const thresholdApplicable = executedList.filter(r => r.entryThreshold !== null);
        const priceDisciplineCount = thresholdApplicable.filter(r => !r.enteredBelowThreshold).length;
        const priceDisciplineRate = thresholdApplicable.length > 0
            ? parseFloat((priceDisciplineCount / thresholdApplicable.length).toFixed(4))
            : 1.0;

        // 2. Rule Compliance Rate
        const ruleFollowedCount = slice.filter(r => r.ruleDiscipline === 'FOLLOWED').length;
        const ruleComplianceRate = parseFloat((ruleFollowedCount / totalReviewed).toFixed(4));

        // 3. Sound Thesis Rate
        const soundThesisCount = slice.filter(r => r.thesisQuality === 'SOUND').length;
        const soundThesisRate = parseFloat((soundThesisCount / totalReviewed).toFixed(4));

        // 4. Good Price Rate (EXCELLENT or GOOD price quality)
        const closingAvailable = slice.filter(r => r.closingLineAvailable);
        const goodPriceCount = closingAvailable.filter(r => r.priceQuality === 'EXCELLENT' || r.priceQuality === 'GOOD').length;
        const goodPriceRate = closingAvailable.length > 0
            ? parseFloat((goodPriceCount / closingAvailable.length).toFixed(4))
            : 0;

        // 5. Override Rate
        const breakApplicable = slice.filter(r => r.breakConditionHits > 0);
        const overrideCount = breakApplicable.filter(r => r.userOverrideUsed || r.enteredAfterBreak).length;
        const overrideRate = breakApplicable.length > 0
            ? parseFloat((overrideCount / breakApplicable.length).toFixed(4))
            : 0;

        // 6. Below Threshold Entry Rate
        const belowCount = thresholdApplicable.filter(r => r.enteredBelowThreshold).length;
        const belowThresholdEntryRate = thresholdApplicable.length > 0
            ? parseFloat((belowCount / thresholdApplicable.length).toFixed(4))
            : 0;

        return new DecisionMemoryScorecard({
            userId,
            windowType,
            priceDisciplineRate,
            ruleComplianceRate,
            soundThesisRate,
            goodPriceRate,
            overrideRate,
            belowThresholdEntryRate,
            reviewedDecisions: totalReviewed,
            executedDecisions: totalExecuted
        });
    }
}

module.exports = MemoryScorecardEngine;
