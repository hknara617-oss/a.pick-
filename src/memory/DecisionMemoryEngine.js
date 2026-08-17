'use strict';

const MemoryRecordBuilder = require('./MemoryRecordBuilder');
const PatternEngine = require('./PatternEngine');
const PatternPriorityEngine = require('./PatternPriorityEngine');
const MemoryScorecardEngine = require('./MemoryScorecardEngine');
const MemoryImplicationEngine = require('./MemoryImplicationEngine');
const MemorySummary = require('../models/MemorySummary');

/**
 * src/memory/DecisionMemoryEngine.js
 * Core engine orchestrating memory records, pattern extraction, scorecards, implications, and rules.
 */
class DecisionMemoryEngine {
    static evaluateUserMemory(memoryRecords = [], userId, acceptedRules = []) {
        if (!userId) {
            throw new Error('DecisionMemoryEngine requires userId');
        }

        // Cold start check (sample size < 5)
        if (!memoryRecords || memoryRecords.length < 5) {
            const currentCount = memoryRecords ? memoryRecords.length : 0;
            const scorecard = MemoryScorecardEngine.generateScorecard(memoryRecords, userId, 'ALL_TIME');
            return {
                status: 'INSUFFICIENT_DATA',
                summary: new MemorySummary({
                    userId,
                    repeatingPattern: `아직 반복 패턴을 판단하기에 기록이 부족합니다 (${currentCount}/5건 검토됨).`,
                    biggestImplication: '판단 기록이 최소 5건 이상 누적되면 행동 패턴 분석이 활성화됩니다.',
                    oneNextBehavior: '사전에 수립한 기준 배당과 파기 조건을 준수하며 기록을 축적하세요.',
                    nextRoundApplied: false,
                    evidenceCount: currentCount,
                    confidence: 0,
                    status: 'INSUFFICIENT_DATA'
                }),
                patterns: [],
                evidence: [],
                scorecard,
                topPattern: null,
                implication: null,
                proposedRule: null
            };
        }

        // 1. Detect patterns and evidence
        const { patterns, evidence } = PatternEngine.detectPatterns(memoryRecords, userId);

        // 2. Rank patterns by priority
        const rankedPatterns = PatternPriorityEngine.rankPatterns(patterns);
        const topPattern = rankedPatterns.length > 0 ? rankedPatterns[0] : null;

        // 3. Generate Implication & Proposed Rule for top pattern
        const { implication, proposedRule } = MemoryImplicationEngine.generateImplication(topPattern, userId);

        // 4. Generate Scorecard
        const scorecard = MemoryScorecardEngine.generateScorecard(memoryRecords, userId, 'ALL_TIME');

        // 5. Check if user already accepted the proposed rule for next round
        const isNextRoundApplied = acceptedRules.some(r =>
            r.userId === userId &&
            r.status === 'ACCEPTED' &&
            proposedRule &&
            r.ruleType === proposedRule.ruleType
        );

        const summary = new MemorySummary({
            userId,
            repeatingPattern: topPattern ? topPattern.descriptionTemplate : '특이 부정 패턴 미감지',
            biggestImplication: implication ? implication.implication : '규칙을 일관되게 준수하고 있습니다.',
            oneNextBehavior: implication ? implication.nextBehavior : '현재의 사전 원칙을 지속 유지하세요.',
            nextRoundApplied: isNextRoundApplied,
            evidenceCount: topPattern ? topPattern.sampleCount : 0,
            confidence: topPattern ? topPattern.confidence : 0.8,
            status: 'ACTIVE'
        });

        return {
            status: 'ACTIVE',
            summary,
            patterns,
            evidence,
            scorecard,
            topPattern,
            implication,
            proposedRule
        };
    }
}

module.exports = DecisionMemoryEngine;
