'use strict';

const crypto = require('crypto');
const SettlementEngine = require('./SettlementEngine');
const EntryExecutionEngine = require('./EntryExecutionEngine');
const ClosingPriceResolver = require('./ClosingPriceResolver');
const PriceQualityEngine = require('./PriceQualityEngine');
const RuleDisciplineEngine = require('./RuleDisciplineEngine');
const PreGameStateResolver = require('./PreGameStateResolver');
const ThesisReviewEngine = require('./ThesisReviewEngine');
const DecisionQualityEngine = require('./DecisionQualityEngine');
const ReviewResult = require('../models/ReviewResult');
const ReviewCard = require('../models/ReviewCard');

/**
 * src/review/ReviewEngine.js
 * Sport-agnostic post-game decision review engine.
 */
class ReviewEngine {
    static reviewDecision({
        contract,
        settlementData = null,
        entryExecutionData = null,
        marketObservations = [],
        decisionEvents = [],
        watchEvaluations = [],
        contextSnapshots = [],
        eventStartTime = null
    }) {
        if (!contract) {
            throw new Error('ReviewEngine requires contract');
        }

        // 1. Resolve Outcome Axis
        const settlement = SettlementEngine.resolveSettlement(settlementData, contract);

        // 2. Resolve Entry Execution
        const entryExecution = EntryExecutionEngine.resolveExecution(entryExecutionData, contract);

        // 3. Resolve Closing Price
        const closingPrice = ClosingPriceResolver.resolveClosingPrice(marketObservations, contract, eventStartTime);

        // 4. Evaluate Price Quality Axis
        const priceQuality = PriceQualityEngine.evaluatePriceQuality(entryExecution, closingPrice, contract);

        // 5. Evaluate Rule Discipline Axis
        const ruleDiscipline = RuleDisciplineEngine.evaluateRuleDiscipline(contract, entryExecution, decisionEvents);

        // 6. Resolve Pre-Game Final State
        const preGameFinalState = PreGameStateResolver.resolvePreGameState(watchEvaluations, eventStartTime);

        // 7. Evaluate Thesis Review Axis
        const thesisReview = ThesisReviewEngine.evaluateThesisReview(contract, decisionEvents, contextSnapshots, preGameFinalState, eventStartTime);

        // 8. Derive Decision Quality Axis (STRICT: Outcome NEVER passed)
        const decisionQuality = DecisionQualityEngine.evaluateDecisionQuality(priceQuality, ruleDiscipline, thesisReview);

        // Input fingerprint for idempotency
        const fpInput = `${contract.id}:${settlement.result}:${priceQuality.grade}:${ruleDiscipline.grade}:${thesisReview.grade}:${decisionQuality.grade}`;
        const inputFingerprint = crypto.createHash('sha256').update(fpInput).digest('hex');

        const reviewResult = new ReviewResult({
            decisionId: contract.id,
            outcome: {
                result: settlement.result,
                settlementStatus: settlement.verified ? 'VERIFIED' : 'PENDING',
                sourceRef: settlement.source
            },
            priceQuality,
            ruleDiscipline,
            thesisReview,
            decisionQuality,
            inputFingerprint,
            reviewVersion: 'v1.0.0'
        });

        // 9. Generate User-Facing ReviewCard
        const reviewCard = this.generateReviewCard(contract, reviewResult);

        return {
            reviewResult,
            reviewCard
        };
    }

    static generateReviewCard(contract, review) {
        let headline = '';
        const whatWentWell = [];
        const whatToImprove = [];
        const keyFacts = [];

        const isGoodDecision = review.decisionQuality.grade === 'EXCELLENT' || review.decisionQuality.grade === 'GOOD';
        const isWin = review.outcome.result === 'WIN';
        const isLoss = review.outcome.result === 'LOSS';

        // Deterministic, disciplined Korean copy (No "운", no arrogance)
        if (isGoodDecision && isLoss) {
            headline = '결과는 좋지 않았지만, 사전에 정한 가격과 의사결정 규칙은 충실히 지켰습니다.';
        } else if (!isGoodDecision && isWin) {
            headline = '결과는 좋았지만, 사전에 정한 진입 기준과 판단 조건은 지켜지지 않았습니다.';
        } else if (isGoodDecision && isWin) {
            headline = '사전 의사결정 원칙을 지켰으며, 좋은 결과로 마무리되었습니다.';
        } else if (!isGoodDecision && isLoss) {
            headline = '사전 원칙이 지켜지지 않았으며, 결과 역시 손실로 이어졌습니다.';
        } else {
            headline = '경기 종료 후 사전 의사결정 과정에 대한 복기입니다.';
        }

        // Key facts
        keyFacts.push(`진입 배당: ${review.priceQuality.entryOdds || contract.offeredOddsAtSeal}`);
        if (review.priceQuality.closingOdds) {
            keyFacts.push(`마감 배당: ${review.priceQuality.closingOdds} (CLV: ${(review.priceQuality.clv * 100).toFixed(1)}%)`);
        }
        keyFacts.push(`사전 규칙 준수: ${review.ruleDiscipline.grade}`);
        keyFacts.push(`사전 가설 유지: ${review.thesisReview.grade}`);

        // What went well / to improve
        if (review.priceQuality.grade === 'EXCELLENT' || review.priceQuality.grade === 'GOOD') {
            whatWentWell.push('마감 시장보다 유리한 배당을 확보했습니다.');
        } else if (review.priceQuality.grade === 'POOR') {
            whatToImprove.push('마감 시점보다 불리한 배당에 진입했습니다.');
        }

        if (review.ruleDiscipline.grade === 'FOLLOWED') {
            whatWentWell.push('최소 진입 배당 및 사전 규칙을 철저히 지켰습니다.');
        } else {
            whatToImprove.push('사전에 정한 진입 한도 또는 파기 조건을 위반했습니다.');
        }

        if (review.thesisReview.grade === 'SOUND') {
            whatWentWell.push('경기 직전까지 분석 논리가 유효하게 작동했습니다.');
        } else if (review.thesisReview.grade === 'UNSOUND') {
            whatToImprove.push('전제가 훼손되었음에도 무리하게 진입을 진행했습니다.');
        }

        return new ReviewCard({
            decisionId: contract.id,
            sport: contract.sport,
            league: contract.league,
            event: contract.eventId,
            market: contract.marketId,
            selection: contract.selectionId,
            outcome: review.outcome.result,
            priceQuality: review.priceQuality.grade,
            ruleDiscipline: review.ruleDiscipline.grade,
            thesisQuality: review.thesisReview.grade,
            decisionQuality: review.decisionQuality.grade,
            headline,
            keyFacts,
            whatWentWell,
            whatToImprove,
            reviewedAt: review.reviewedAt
        });
    }
}

module.exports = ReviewEngine;
