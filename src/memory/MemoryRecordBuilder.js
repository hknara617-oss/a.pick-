'use strict';

const DecisionMemoryRecord = require('../models/DecisionMemoryRecord');

/**
 * src/memory/MemoryRecordBuilder.js
 * Builds an immutable DecisionMemoryRecord from contract, execution, events, and reviewResult.
 */
class MemoryRecordBuilder {
    static buildRecord({ contract, entryExecution = null, decisionEvents = [], watchEvaluations = [], reviewResult }) {
        if (!contract || !reviewResult) {
            throw new Error('MemoryRecordBuilder requires contract and reviewResult');
        }

        const minEntryOdds = contract.entryRule?.minimumEntryOdds || null;
        const actualEntryOdds = entryExecution && entryExecution.executed && entryExecution.entryOdds !== null
            ? entryExecution.entryOdds
            : contract.offeredOddsAtSeal;

        // Check if entered below threshold
        const enteredBelowThreshold = minEntryOdds !== null && actualEntryOdds < minEntryOdds;

        // Check if break conditions were hit before execution
        const breakConditionCount = contract.breakConditions?.length || 0;
        const breakEvents = decisionEvents.filter(e => e.eventType === 'BREAK_CONDITION_HIT' || e.payload?.currentThesisState === 'BROKEN');
        const breakConditionHits = breakEvents.length;
        const enteredAfterBreak = breakConditionHits > 0 && entryExecution?.executed;

        // Check overrides
        const userOverrideUsed = decisionEvents.some(e => e.eventType === 'USER_OVERRIDE');

        // Check state at entry
        const enteredWhileWait = decisionEvents.some(e => e.eventType === 'ACTION_STATE_CHANGED' && e.payload?.actionState === 'WAIT') && entryExecution?.executed;
        const enteredWhileReview = decisionEvents.some(e => e.eventType === 'ACTION_STATE_CHANGED' && e.payload?.actionState === 'REVIEW') && entryExecution?.executed;

        // Market type
        let marketType = 'STANDARD';
        if (contract.marketId?.includes('hd') || contract.marketId?.includes('handi')) marketType = 'HANDICAP';
        else if (contract.marketId?.includes('uo') || contract.marketId?.includes('under')) marketType = 'UNDER_OVER';
        else if (contract.marketId?.includes('ml') || contract.marketId?.includes('money')) marketType = 'MONEYLINE';

        return new DecisionMemoryRecord({
            userId: contract.userId,
            decisionId: contract.id,
            sport: contract.sport,
            league: contract.league,
            marketType,
            createdAt: contract.createdAt || new Date().toISOString(),
            reviewedAt: reviewResult.reviewedAt,
            executed: entryExecution ? Boolean(entryExecution.executed) : true,
            entryOdds: actualEntryOdds,
            entryThreshold: minEntryOdds,
            priceQuality: reviewResult.priceQuality.grade,
            ruleDiscipline: reviewResult.ruleDiscipline.grade,
            thesisQuality: reviewResult.thesisReview.grade,
            decisionQuality: reviewResult.decisionQuality.grade,
            preGameFinalState: reviewResult.thesisReview.preGameFinalState,
            breakConditionCount,
            breakConditionHits,
            userOverrideUsed,
            thresholdCrossedBeforeEntry: enteredBelowThreshold,
            enteredBelowThreshold,
            enteredAfterBreak,
            enteredWhileReview,
            enteredWhileWait,
            closingLineAvailable: reviewResult.priceQuality.closingOddsStatus !== 'UNAVAILABLE',
            clv: reviewResult.priceQuality.clv,
            outcome: reviewResult.outcome.result,
            memoryVersion: 'v1.0.0'
        });
    }
}

module.exports = MemoryRecordBuilder;
