'use strict';

/**
 * src/review/DecisionQualityEngine.js
 * Combines PriceQuality, RuleDiscipline, and ThesisReview.
 * STRICT INVARIANT: Outcome is NEVER an input and CANNOT affect grade.
 */
class DecisionQualityEngine {
    static evaluateDecisionQuality(priceQuality, ruleDiscipline, thesisReview) {
        const reasons = [];

        // Explicit Design V1 Scoring Mapping (UNCALIBRATED_V1)
        let score = 0;

        // 1. Price Quality Score
        switch (priceQuality.grade) {
            case 'EXCELLENT':
                score += 2;
                reasons.push('마감 배당 대비 우수한 진입 가격 확보 (+2)');
                break;
            case 'GOOD':
                score += 1;
                reasons.push('유리한 진입 가격 확보 (+1)');
                break;
            case 'FAIR':
                score += 0;
                break;
            case 'POOR':
                score -= 2;
                reasons.push('마감 배당 대비 불리한 가격 체결 (-2)');
                break;
            case 'UNKNOWN':
            default:
                score += 0;
                break;
        }

        // 2. Rule Discipline Score
        switch (ruleDiscipline.grade) {
            case 'FOLLOWED':
                score += 2;
                reasons.push('사전 진입 규칙 및 한도 준수 (+2)');
                break;
            case 'PARTIAL':
                score += 0;
                reasons.push('사전 규칙 일부 미준수 (0)');
                break;
            case 'VIOLATED':
                score -= 3;
                reasons.push('핵심 진입 규칙 위반 (-3)');
                break;
        }

        // 3. Thesis Review Score
        switch (thesisReview.grade) {
            case 'SOUND':
                score += 2;
                reasons.push('사전 분석 가설 및 정보 무결성 유지 (+2)');
                break;
            case 'MIXED':
                score += 0;
                reasons.push('사전 가설의 혼재된 신호 (0)');
                break;
            case 'UNSOUND':
                score -= 3;
                reasons.push('사전 파기된 전제 무시 (-3)');
                break;
            case 'UNREVIEWABLE':
            default:
                score += 0;
                break;
        }

        // Final Grade Thresholds (Design v1)
        let grade = 'FAIR';
        if (score >= 5) {
            grade = 'EXCELLENT';
        } else if (score >= 2) {
            grade = 'GOOD';
        } else if (score >= 0) {
            grade = 'FAIR';
        } else {
            grade = 'POOR';
        }

        // If price is UNKNOWN and no rules/thesis available, UNRATED
        if (priceQuality.grade === 'UNKNOWN' && thesisReview.grade === 'UNREVIEWABLE') {
            grade = 'UNRATED';
        }

        return {
            grade,
            score,
            scoringModel: 'UNCALIBRATED_V1',
            reasons
        };
    }
}

module.exports = DecisionQualityEngine;
