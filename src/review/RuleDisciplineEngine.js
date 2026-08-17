'use strict';

/**
 * src/review/RuleDisciplineEngine.js
 * Evaluates whether the user respected pre-declared rules and break conditions.
 */
class RuleDisciplineEngine {
    static evaluateRuleDiscipline(contract, entryExecution, decisionEvents = []) {
        const violations = [];
        const compliedRules = [];

        const minEntryOdds = contract.entryRule?.minimumEntryOdds;
        const actualEntryOdds = entryExecution && entryExecution.executed && entryExecution.entryOdds !== null
            ? entryExecution.entryOdds
            : contract.offeredOddsAtSeal;

        // 1. Check minimum entry odds compliance
        if (minEntryOdds !== undefined && minEntryOdds !== null) {
            if (actualEntryOdds < minEntryOdds) {
                violations.push({
                    code: 'MINIMUM_ODDS_VIOLATION',
                    criticality: 'HIGH',
                    message: `사전 진입 기준(${minEntryOdds})보다 낮은 배당(${actualEntryOdds})에 진입했습니다.`
                });
            } else {
                compliedRules.push({
                    code: 'MINIMUM_ODDS_MET',
                    message: `사전 진입 기준(${minEntryOdds})을 충족했습니다 (${actualEntryOdds}).`
                });
            }
        }

        // 2. Check break conditions occurred before execution
        const executionTimestamp = entryExecution?.executedAt ? new Date(entryExecution.executedAt).getTime() : Infinity;
        const breakEvents = decisionEvents.filter(e =>
            (e.eventType === 'BREAK_CONDITION_HIT' || e.eventType === 'THESIS_STATE_CHANGED') &&
            new Date(e.occurred_at || e.timestamp).getTime() <= executionTimestamp
        );

        for (const b of breakEvents) {
            if (b.payload?.thesisState === 'BROKEN' || b.payload?.currentThesisState === 'BROKEN' || b.eventType === 'BREAK_CONDITION_HIT') {
                violations.push({
                    code: 'ENTERED_AFTER_BREAK_CONDITION',
                    criticality: 'CRITICAL',
                    message: '판단 파기 조건(Break Condition)이 발생한 이후에 진입이 이루어졌습니다.'
                });
            }
        }

        // 3. Action state check at execution
        const invalidStateEvents = decisionEvents.filter(e =>
            e.eventType === 'ACTION_STATE_CHANGED' &&
            (e.payload?.currentActionState === 'DO_NOT_ENTER' || e.payload?.actionState === 'DO_NOT_ENTER') &&
            new Date(e.occurred_at || e.timestamp).getTime() <= executionTimestamp
        );

        if (invalidStateEvents.length > 0 && entryExecution?.executed) {
            violations.push({
                code: 'ENTERED_DURING_DO_NOT_ENTER',
                criticality: 'HIGH',
                message: '진입 금지(DO_NOT_ENTER) 상태에서 진입이 실행되었습니다.'
            });
        }

        // Grade determination
        let grade = 'FOLLOWED';
        if (violations.some(v => v.criticality === 'CRITICAL')) {
            grade = 'VIOLATED';
        } else if (violations.length > 0) {
            grade = violations.length >= 2 ? 'VIOLATED' : 'PARTIAL';
        }

        return {
            grade,
            compliedRules,
            violations,
            explanation: grade === 'FOLLOWED'
                ? '사전에 정의한 모든 진입 기준과 규칙을 준수했습니다.'
                : `사전 규칙 중 ${violations.length}건의 미준수 항목이 확인되었습니다.`
        };
    }
}

module.exports = RuleDisciplineEngine;
