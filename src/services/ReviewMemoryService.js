'use strict';

const ReviewEngine = require('../review/ReviewEngine');
const DecisionMemoryEngine = require('../memory/DecisionMemoryEngine');

/**
 * src/services/ReviewMemoryService.js
 * Produces user-facing Review & Memory view models.
 * Strictly separates Outcome from Decision Quality and displays compact 4-field Memory summary.
 */
class ReviewMemoryService {
    constructor({ reviewRepo = null, memoryRepo = null } = {}) {
        this.reviewRepo = reviewRepo;
        this.memoryRepo = memoryRepo;
    }

    async getReviewViewModel({ userId, reviewResults = [], memoryRecords = [], acceptedRules = [] } = {}) {
        const generatedAt = new Date().toISOString();

        // 1. Process recent reviews
        const recentReviews = reviewResults.map(rev => ({
            id: rev.id,
            decisionId: rev.decisionId,
            sport: rev.sport || 'BASEBALL',
            outcomeResult: rev.outcome.result, // WIN / LOSS / PUSH
            priceQualityGrade: rev.priceQuality.grade, // EXCELLENT / GOOD / FAIR / POOR
            ruleDisciplineGrade: rev.ruleDiscipline.grade, // FOLLOWED / PARTIAL / VIOLATED
            thesisReviewGrade: rev.thesisReview.grade, // SOUND / MIXED / UNSOUND
            decisionQualityGrade: rev.decisionQuality.grade, // EXCELLENT / GOOD / FAIR / POOR
            entryOdds: rev.priceQuality.entryOdds,
            closingOdds: rev.priceQuality.closingOdds,
            clv: rev.priceQuality.clv,
            headline: rev.headline || (
                rev.decisionQuality.grade === 'EXCELLENT' && rev.outcome.result === 'LOSS'
                    ? '결과는 좋지 않았지만, 사전에 정한 가격과 규칙은 지켰습니다.'
                    : rev.decisionQuality.grade === 'POOR' && rev.outcome.result === 'WIN'
                        ? '결과는 좋았지만, 사전에 정한 진입 기준과 판단 조건은 지켜지지 않았습니다.'
                        : '사전 의사결정 원칙을 지켰습니다.'
            ),
            reviewedAt: rev.reviewedAt
        }));

        // 2. Process memory patterns and one next behavior
        const memoryState = DecisionMemoryEngine.evaluateUserMemory(memoryRecords, userId, acceptedRules);

        return {
            recentReviews,
            memorySummary: memoryState.summary,
            scorecard: memoryState.scorecard,
            topPattern: memoryState.topPattern,
            proposedRule: memoryState.proposedRule,
            isColdStart: memoryState.status === 'INSUFFICIENT_DATA',
            generatedAt
        };
    }
}

module.exports = ReviewMemoryService;
