'use strict';

/**
 * src/review/ThesisReviewEngine.js
 * Evaluates whether the pre-game reasoning remained sound.
 * CRITICAL GUARD: Excludes post-game outcomes and scores strictly.
 */
class ThesisReviewEngine {
    static evaluateThesisReview(contract, decisionEvents = [], contextSnapshots = [], preGameFinalState = 'VALID', eventStartTime = null) {
        const supportingEvidence = [];
        const contradictingEvidence = [];

        const cutoffTime = eventStartTime ? new Date(eventStartTime).getTime() : Infinity;

        // Hard Guard: Filter out any signal or event after event start
        const preGameEvents = decisionEvents.filter(e => {
            const t = new Date(e.occurred_at || e.timestamp).getTime();
            return t <= cutoffTime;
        });

        const preGameContext = contextSnapshots.filter(cs => {
            const t = new Date(cs.observedAt || cs.observed_at).getTime();
            return t <= cutoffTime;
        });

        // 1. Evaluate pre-game break conditions
        const hadBreakCondition = preGameEvents.some(e =>
            e.eventType === 'BREAK_CONDITION_HIT' ||
            (e.eventType === 'THESIS_STATE_CHANGED' && (e.payload?.currentThesisState === 'BROKEN' || e.payload?.thesisState === 'BROKEN'))
        );

        if (hadBreakCondition || preGameFinalState === 'BROKEN') {
            contradictingEvidence.push({
                code: 'CRITICAL_BREAK_CONDITION_MET',
                description: '경기 전 주요 가설을 훼손하는 파기 신호가 발생했습니다.'
            });
        }

        // 2. Evaluate pre-game context signals
        for (const cs of preGameContext) {
            const signals = cs.signals || [];
            for (const sig of signals) {
                if (sig.status === 'CONFIRMED' || sig.code?.includes('CONFIRMED')) {
                    supportingEvidence.push({
                        code: sig.code,
                        description: sig.description || '사전 확인된 핵심 가설 신호'
                    });
                } else if (sig.status === 'CONTRADICTED' || sig.code?.includes('CONTRADICTED')) {
                    contradictingEvidence.push({
                        code: sig.code,
                        description: sig.description || '가설과 상반되는 사전 정보 신호'
                    });
                }
            }
        }

        // Grade mapping
        let grade = 'SOUND';
        let explanation = '';

        if (hadBreakCondition || preGameFinalState === 'BROKEN') {
            grade = 'UNSOUND';
            explanation = '경기 전 핵심 전제가 파기되었으나 진입 논리가 유지되었습니다.';
        } else if (contradictingEvidence.length > 0 || preGameFinalState === 'WEAKENED') {
            grade = 'MIXED';
            explanation = '가설을 지지하는 신호와 상반되는 신호가 복합적으로 확인되었습니다.';
        } else {
            grade = 'SOUND';
            explanation = '경기 전 수립된 핵심 전제와 정보 신호가 경기 시작 시점까지 일관되게 유지되었습니다.';
        }

        return {
            preGameFinalState,
            grade,
            supportingEvidence,
            contradictingEvidence,
            explanation
        };
    }
}

module.exports = ThesisReviewEngine;
