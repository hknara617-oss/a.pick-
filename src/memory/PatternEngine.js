'use strict';

const BehaviorPattern = require('../models/BehaviorPattern');
const PatternEvidence = require('../models/PatternEvidence');
const BehaviorFeatureExtractor = require('./BehaviorFeatureExtractor');

/**
 * src/memory/PatternEngine.js
 * Evaluates behavioral patterns across memory records using strict sample gating and denominator policy.
 */
class PatternEngine {
    static detectPatterns(records = [], userId) {
        if (!userId || !records || records.length === 0) {
            return { patterns: [], evidence: [] };
        }

        const patternCatalog = [
            {
                code: 'CHASE_AFTER_THRESHOLD',
                isApplicable: (r) => r.entryThreshold !== null && r.executed,
                isOccurrence: (r) => r.enteredBelowThreshold,
                descriptionTemplate: '최근 {applicable}번의 기준 배당 설정 상황 중 {occurrences}번에서 기준 아래 가격에 진입했습니다 ({rate}%).',
                implicationTemplate: '가격이 나빠진 뒤 신규 진입을 강행하여 가격 품질이 훼손되는 경향이 반복됩니다.'
            },
            {
                code: 'BREAK_CONDITION_OVERRIDE',
                isApplicable: (r) => r.breakConditionHits > 0,
                isOccurrence: (r) => r.enteredAfterBreak || (r.userOverrideUsed && r.executed),
                descriptionTemplate: '판단 파기 조건이 발생한 {applicable}번의 상황 중 {occurrences}번에서 진입을 강행했습니다 ({rate}%).',
                implicationTemplate: '사전 전제가 훼손된 이후에도 직관에 의해 원칙을 우회하는 패턴이 감지됩니다.'
            },
            {
                code: 'PRICE_DISCIPLINE',
                isApplicable: (r) => r.entryThreshold !== null && r.executed,
                isOccurrence: (r) => r.entryOdds >= r.entryThreshold,
                descriptionTemplate: '최근 {applicable}번의 진입 중 {occurrences}번에서 사전 진입 기준 가격을 철저히 지켰습니다 ({rate}%).',
                implicationTemplate: '사전에 정한 배당 기준을 일관되게 고수하는 우수한 가격 원칙을 보유하고 있습니다.'
            },
            {
                code: 'POSITIVE_CLV_PATTERN',
                isApplicable: (r) => r.closingLineAvailable && r.executed,
                isOccurrence: (r) => r.priceQuality === 'EXCELLENT' || r.priceQuality === 'GOOD',
                descriptionTemplate: '마감 배당이 확인된 {applicable}경기 중 {occurrences}경기에서 마감 대비 유리한 배당을 확보했습니다 ({rate}%).',
                implicationTemplate: '시장 마감선 대비 지속적으로 우수한 가격 엣지를 확보하고 있습니다.'
            },
            {
                code: 'NEGATIVE_CLV_PATTERN',
                isApplicable: (r) => r.closingLineAvailable && r.executed,
                isOccurrence: (r) => r.priceQuality === 'POOR',
                descriptionTemplate: '마감 배당이 확인된 {applicable}경기 중 {occurrences}경기에서 마감보다 불리한 배당에 체결되었습니다 ({rate}%).',
                implicationTemplate: '시장 가격 변동에 후행하여 불리한 가격에 진입하는 경향이 있습니다.'
            },
            {
                code: 'WEAKENED_THESIS_ENTRY',
                isApplicable: (r) => r.preGameFinalState === 'WEAKENED',
                isOccurrence: (r) => r.executed,
                descriptionTemplate: '경기 전 가설이 약화된 {applicable}번의 상황 중 {occurrences}번에서 진입을 진행했습니다 ({rate}%).',
                implicationTemplate: '불확실성이 증가한 상황에서도 관성에 의해 진입을 멈추지 않는 경향이 있습니다.'
            },
            {
                code: 'THESIS_DISCIPLINE',
                isApplicable: (r) => r.reviewedAt !== undefined,
                isOccurrence: (r) => r.thesisQuality === 'SOUND',
                descriptionTemplate: '분석된 {applicable}건의 판단 중 {occurrences}건에서 경기 시작 직전까지 분석 논리가 온전히 유지되었습니다 ({rate}%).',
                implicationTemplate: '경기 전 사전 분석과 가설 수립이 견고하게 작동하고 있습니다.'
            }
        ];

        const patterns = [];
        const evidenceList = [];

        for (const cat of patternCatalog) {
            const applicableRecords = records.filter(cat.isApplicable);
            const applicableCount = applicableRecords.length;

            if (applicableCount === 0) continue;

            const occurrenceRecords = applicableRecords.filter(cat.isOccurrence);
            const occurrences = occurrenceRecords.length;
            const rate = parseFloat((occurrences / applicableCount).toFixed(4));

            // Sample Size Gating Policy
            let status = 'INSUFFICIENT';
            let confidence = 0;

            if (applicableCount >= 20 && rate >= 0.60) {
                status = 'STRONG';
                confidence = Math.min(0.95, 0.70 + (applicableCount / 100));
            } else if (applicableCount >= 10 && rate >= 0.50) {
                status = 'ESTABLISHED';
                confidence = Math.min(0.85, 0.50 + (applicableCount / 50));
            } else if (applicableCount >= 5 && rate >= 0.40) {
                status = 'EMERGING';
                confidence = 0.40 + (applicableCount / 25) * 0.20;
            } else {
                status = 'INACTIVE';
                confidence = 0.20;
            }

            // Trend calculation (Last 10 vs All Time)
            let trend = 'STABLE';
            if (records.length >= 10) {
                const recentRecords = records.slice(0, 10).filter(cat.isApplicable);
                if (recentRecords.length >= 3) {
                    const recentOccurrences = recentRecords.filter(cat.isOccurrence).length;
                    const recentRate = recentOccurrences / recentRecords.length;
                    if (cat.code.includes('CHASE') || cat.code.includes('NEGATIVE') || cat.code.includes('OVERRIDE')) {
                        if (recentRate < rate - 0.15) trend = 'IMPROVING';
                        else if (recentRate > rate + 0.15) trend = 'WORSENING';
                    } else {
                        if (recentRate > rate + 0.15) trend = 'IMPROVING';
                        else if (recentRate < rate - 0.15) trend = 'WORSENING';
                    }
                }
            }

            const desc = cat.descriptionTemplate
                .replace('{applicable}', applicableCount)
                .replace('{occurrences}', occurrences)
                .replace('{rate}', (rate * 100).toFixed(1));

            const supportingDecisionIds = occurrenceRecords.map(r => r.decisionId);

            const pattern = new BehaviorPattern({
                id: `pat_${userId}_${cat.code}`,
                userId,
                patternCode: cat.code,
                status,
                sampleCount: occurrences,
                applicableCount,
                occurrenceRate: rate,
                confidence: parseFloat(confidence.toFixed(2)),
                firstObservedAt: records[records.length - 1].createdAt,
                lastObservedAt: records[0].createdAt,
                supportingDecisionIds,
                descriptionTemplate: desc,
                implicationTemplate: cat.implicationTemplate,
                trend
            });

            patterns.push(pattern);

            // Record inspectable evidence traces
            for (const rec of occurrenceRecords) {
                evidenceList.push(new PatternEvidence({
                    patternId: pattern.id,
                    decisionId: rec.decisionId,
                    date: rec.createdAt,
                    sport: rec.sport,
                    market: rec.marketType,
                    observedBehavior: `${cat.code} (배당 ${rec.entryOdds || 'N/A'}, 기준 ${rec.entryThreshold || 'N/A'})`,
                    reviewAxis: rec.ruleDiscipline,
                    evidenceRef: `decision_${rec.decisionId}`
                }));
            }
        }

        return { patterns, evidence: evidenceList };
    }
}

module.exports = PatternEngine;
