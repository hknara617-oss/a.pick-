'use strict';

const MemoryImplication = require('../models/MemoryImplication');
const ProposedBehaviorRule = require('../models/ProposedBehaviorRule');

/**
 * src/memory/MemoryImplicationEngine.js
 * Derives exactly ONE next behavior rule and implication from the top-ranked pattern.
 */
class MemoryImplicationEngine {
    static generateImplication(topPattern, userId) {
        if (!topPattern || !userId) {
            return {
                implication: null,
                proposedRule: null
            };
        }

        let insight = topPattern.descriptionTemplate || '행동 패턴 감지';
        let implication = '';
        let nextBehavior = '';
        let ruleType = 'MIN_ENTRY_MARGIN_FLOOR';
        let rulePayload = {};
        let reason = '';

        switch (topPattern.patternCode) {
            case 'CHASE_AFTER_THRESHOLD':
                insight = topPattern.descriptionTemplate || '기준 배당 아래 가격 진입 빈번';
                implication = '분석보다 가격 추격에서 판단 품질이 더 자주 훼손되고 있습니다.';
                nextBehavior = '다음 회차에는 기준 배당 아래 신규 진입을 원천 차단하는 규칙을 적용합니다.';
                ruleType = 'NO_ENTRY_AFTER_THRESHOLD_BREAK';
                rulePayload = { autoInvalidateOnDrop: true };
                reason = '반복된 가격 추격 진입 패턴 방지';
                break;

            case 'BREAK_CONDITION_OVERRIDE':
                insight = topPattern.descriptionTemplate || '파기 조건 발생 후 진입 강행';
                implication = '파기 조건이 발생한 후에도 직관에 의해 원칙을 우회하는 경향이 있습니다.';
                nextBehavior = '다음 회차에서는 파기 조건 발생 시 1시간 필수 대기 및 재검토 규칙을 적용합니다.';
                ruleType = 'REQUIRE_REVIEW_AFTER_BREAK';
                rulePayload = { lockMinutes: 60 };
                reason = '파기 조건 발생 후 즉각 진입 방지';
                break;

            case 'NEGATIVE_CLV_PATTERN':
                insight = topPattern.descriptionTemplate || '마감 대비 불리한 배당 체결 빈번';
                implication = '시장 마감선 대비 늦은 진입으로 불리한 가격에 체결되고 있습니다.';
                nextBehavior = '다음 회차에서는 최소 요구 마진을 상향하여 안정적 가격대를 확보합니다.';
                ruleType = 'MIN_ENTRY_MARGIN_FLOOR';
                rulePayload = { minMargin: 0.04 };
                reason = '마감 배당 대비 불리한 체결 빈도 완화';
                break;

            case 'WEAKENED_THESIS_ENTRY':
                insight = topPattern.descriptionTemplate || '가설 약화 상태에서 진입 진행';
                implication = '사전 가설이 약화된 상태에서 불확실성을 무시하고 진입하는 경향이 있습니다.';
                nextBehavior = '다음 회차에서는 가설 약화 시 진입 허용 배당 기준을 5% 상향 조정합니다.';
                ruleType = 'NO_ENTRY_WHILE_WAIT';
                rulePayload = { strictThesisRequired: true };
                reason = '약화된 가설 상태에서의 진입 방지';
                break;

            case 'PRICE_DISCIPLINE':
            default:
                insight = topPattern.descriptionTemplate || '사전 진입 규칙 준수';
                implication = '사전 진입 규칙을 안정적으로 고수하고 있습니다.';
                nextBehavior = '현재의 기준 배당 준수 원칙을 다음 회차에도 그대로 유지합니다.';
                ruleType = 'MIN_ENTRY_MARGIN_FLOOR';
                rulePayload = { preserveCurrentRule: true };
                reason = '우수한 가격 원칙 지속 유지';
                break;
        }

        const memoryImplication = new MemoryImplication({
            userId,
            patternCode: topPattern.patternCode,
            insight,
            implication,
            nextBehavior,
            appliesTo: 'GLOBAL',
            evidenceCount: topPattern.sampleCount,
            confidence: topPattern.confidence
        });

        const proposedRule = new ProposedBehaviorRule({
            userId,
            sourcePatternId: topPattern.id,
            ruleType,
            rulePayload,
            reason,
            status: 'PROPOSED'
        });

        return {
            implication: memoryImplication,
            proposedRule
        };
    }
}

module.exports = MemoryImplicationEngine;
