'use strict';

/**
 * src/memory/BehaviorFeatureExtractor.js
 * Extracts explainable behavioral features from memory records.
 */
class BehaviorFeatureExtractor {
    static extractFeatures(record) {
        return {
            CHASE_AFTER_THRESHOLD: record.enteredBelowThreshold,
            BREAK_CONDITION_OVERRIDE: record.enteredAfterBreak || (record.userOverrideUsed && record.breakConditionHits > 0),
            WAIT_DISCIPLINE: !record.enteredWhileWait && record.ruleDiscipline === 'FOLLOWED',
            PRICE_DISCIPLINE: record.entryThreshold !== null ? record.entryOdds >= record.entryThreshold : true,
            NEGATIVE_CLV_PATTERN: record.priceQuality === 'POOR' || (record.clv !== null && record.clv < -0.02),
            POSITIVE_CLV_PATTERN: record.priceQuality === 'EXCELLENT' || record.priceQuality === 'GOOD' || (record.clv !== null && record.clv >= 0.02),
            THESIS_DISCIPLINE: record.preGameFinalState === 'BROKEN' ? !record.executed : record.thesisQuality === 'SOUND',
            WEAKENED_THESIS_ENTRY: record.preGameFinalState === 'WEAKENED' && record.executed,
            GOOD_DECISION_BAD_OUTCOME: (record.decisionQuality === 'EXCELLENT' || record.decisionQuality === 'GOOD') && record.outcome === 'LOSS',
            BAD_DECISION_GOOD_OUTCOME: (record.decisionQuality === 'POOR' || record.decisionQuality === 'FAIR') && record.outcome === 'WIN'
        };
    }
}

module.exports = BehaviorFeatureExtractor;
