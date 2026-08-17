'use strict';

const MarketFairEngine = require('./MarketFairEngine');
const EntryThresholdEngine = require('./EntryThresholdEngine');
const PriceStateEngine = require('./PriceStateEngine');
const BreakConditionEvaluator = require('./BreakConditionEvaluator');
const ThesisStateMachine = require('./ThesisStateMachine');
const ActionStateMachine = require('./ActionStateMachine');
const ContextFreshnessEngine = require('./ContextFreshnessEngine');
const DecisionContextResult = require('../models/DecisionContextResult');

/**
 * src/core/DecisionContextEngine.js
 * Master orchestrator for evaluating a DecisionContract against latest market observations & sport context.
 *
 * CRITICAL RULE:
 * Zero sport-specific imports.
 * Works 100% with generic market feeds and sport context snapshots.
 */
class DecisionContextEngine {
    /**
     * Evaluate a DecisionContract against new observations.
     *
     * @param {DecisionContract} contract
     * @param {Object} observation
     *   currentMarketOdds: number[] (e.g. [1.85, 1.95])
     *   selectionIndex: number
     *   currentLine: number|string|null
     *   marketStatus: string
     *   observedAt: string (ISO)
     *   contextSnapshot: SportsContextSnapshot
     *   providerHealth: Object
     * @returns {DecisionContextResult}
     */
    static evaluateContract(contract, observation) {
        const {
            currentMarketOdds = [],
            selectionIndex = 0,
            currentLine = null,
            marketStatus = 'OPEN',
            observedAt = new Date().toISOString(),
            contextSnapshot = null,
            providerHealth = { health: 'HEALTHY', isDegraded: false }
        } = observation;

        // 1. Freshness check
        const freshness = providerHealth.isDegraded
            ? 'DEGRADED'
            : ContextFreshnessEngine.evaluateFreshness(observedAt, 600);

        const isStale = (freshness === 'STALE');

        // 2. Compute Market Fair
        let currentOdds = null;
        let marketFairOdds = null;
        let marketNoVigProbability = null;

        if (Array.isArray(currentMarketOdds) && currentMarketOdds.length >= 2 && !isStale) {
            try {
                const fairRes = MarketFairEngine.computeMarketFair(currentMarketOdds);
                currentOdds = currentMarketOdds[selectionIndex] || null;
                marketNoVigProbability = fairRes.noVigProbabilities[selectionIndex] || null;
                marketFairOdds = fairRes.noVigFairOdds[selectionIndex] || null;
            } catch (e) {
                // Unpriced or invalid odds
                currentOdds = null;
                marketFairOdds = null;
                marketNoVigProbability = null;
            }
        }

        // 3. Compute Entry Threshold
        let minimumEntryOdds = null;
        if (contract.entryRule) {
            if (contract.entryRule.minimumEntryOdds !== undefined && contract.entryRule.minimumEntryOdds !== null) {
                minimumEntryOdds = contract.entryRule.minimumEntryOdds;
            } else if (marketFairOdds) {
                const margin = contract.entryRule.requiredMargin !== undefined ? contract.entryRule.requiredMargin : 0.00;
                minimumEntryOdds = EntryThresholdEngine.calculateMinimumEntryOdds(marketFairOdds, margin);
            }
        }

        // 4. Evaluate Price State
        const priceState = PriceStateEngine.evaluatePriceState(currentOdds, marketFairOdds, minimumEntryOdds, isStale);

        // 5. Evaluate Break Conditions
        const breakEvaluation = BreakConditionEvaluator.evaluate(contract.breakConditions, {
            currentOdds,
            currentLine,
            initialLine: contract.validity?.initialLine !== undefined ? contract.validity.initialLine : contract.marketId,
            marketStatus,
            isMarketStale: isStale,
            currentTime: new Date().toISOString(),
            eventScheduledStart: contract.validity?.validUntil || null,
            contextSnapshot
        });

        // 6. Evaluate Thesis State
        const isDataMissing = (contextSnapshot?.criticalData?.missing?.length > 0);
        const isSourceStale = (contextSnapshot?.freshness === 'STALE');
        const thesisRes = ThesisStateMachine.evaluateThesisState({
            breakEvaluation,
            isDataMissing,
            isSourceStale,
            signals: contextSnapshot?.signals || []
        });

        // 7. Evaluate Action State
        const actionState = ActionStateMachine.evaluateActionState(thesisRes.state, priceState, freshness);

        // 8. Generate Deterministic Korean Explanation
        const explanation = this.generateExplanation(thesisRes.state, priceState, actionState, thesisRes.reasons);

        return new DecisionContextResult({
            contractId: contract.id,
            evaluatedAt: new Date().toISOString(),
            currentOdds,
            marketFairOdds,
            marketNoVigProbability,
            minimumEntryOdds,
            priceState,
            thesisState: thesisRes.state,
            actionState,
            freshness,
            brokenReasons: thesisRes.state === 'BROKEN' ? thesisRes.reasons : [],
            weakenedReasons: thesisRes.state === 'WEAKENED' ? thesisRes.reasons : [],
            signalsEvaluated: contextSnapshot?.signals || [],
            explanation
        });
    }

    /**
     * Deterministic Korean Explanation Template Generator.
     */
    static generateExplanation(thesisState, priceState, actionState, reasons = []) {
        if (thesisState === 'BROKEN') {
            const reasonText = reasons.length > 0 ? ` (원인: ${reasons[0]})` : '';
            return `사전에 정한 생각 변경 조건이 발생했습니다.${reasonText}`;
        }
        if (thesisState === 'WAIT') {
            return '판단에 필요한 핵심 정보가 아직 충분하지 않습니다.';
        }
        if (thesisState === 'WEAKENED') {
            const reasonText = reasons.length > 0 ? ` (내용: ${reasons[0]})` : '';
            return `처음 판단을 약화시키는 정보가 확인됐습니다.${reasonText} 즉시 진입보다 재확인이 필요합니다.`;
        }
        if (thesisState === 'VALID') {
            if (priceState === 'ATTRACTIVE') {
                return '판단 조건은 유지되고 있고, 현재 배당은 설정한 진입 기준 이상입니다.';
            } else if (priceState === 'FAIR') {
                return '처음 판단은 유지되지만, 마진 버퍼를 포함한 목표 진입 기준에는 아직 도달하지 않았습니다.';
            } else {
                return '처음 판단은 유지되지만, 현재 가격은 진입 기준보다 낮습니다.';
            }
        }
        return '현재 상태를 검토 중입니다.';
    }
}

module.exports = DecisionContextEngine;
