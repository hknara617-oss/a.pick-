'use strict';
/**
 * src/models/DecisionContextResult.js
 */
class DecisionContextResult {
    constructor({
        contractId,
        evaluatedAt = new Date().toISOString(),
        currentOdds,
        marketFairOdds,
        marketNoVigProbability,
        minimumEntryOdds,
        priceState,      // 'ATTRACTIVE' | 'FAIR' | 'UNATTRACTIVE' | 'UNPRICED' | 'STALE'
        thesisState,     // 'VALID' | 'WEAKENED' | 'BROKEN' | 'WAIT'
        actionState,     // 'ENTER' | 'WAIT' | 'DO_NOT_ENTER' | 'REVIEW'
        freshness,       // 'FRESH' | 'STALE' | 'DEGRADED' | 'UNKNOWN'
        brokenReasons = [],
        weakenedReasons = [],
        signalsEvaluated = [],
        explanation = ''
    }) {
        this.contractId = contractId;
        this.evaluatedAt = evaluatedAt;
        this.currentOdds = currentOdds;
        this.marketFairOdds = marketFairOdds;
        this.marketNoVigProbability = marketNoVigProbability;
        this.minimumEntryOdds = minimumEntryOdds;
        this.priceState = priceState;
        this.thesisState = thesisState;
        this.actionState = actionState;
        this.freshness = freshness;
        this.brokenReasons = Object.freeze([...brokenReasons]);
        this.weakenedReasons = Object.freeze([...weakenedReasons]);
        this.signalsEvaluated = Object.freeze([...signalsEvaluated]);
        this.explanation = explanation;
        Object.freeze(this);
    }
}

module.exports = DecisionContextResult;
