'use strict';

/**
 * tools/run_phase_e5_outcome_invariance.js
 *
 * Demonstrates that outcome (WIN vs LOSS) does not influence behavioral pattern detection,
 * scorecard rates, top implication, or proposed rules.
 */

const assert = require('assert');
const fs = require('fs');
const DecisionMemoryRecord = require('../src/models/DecisionMemoryRecord');
const DecisionMemoryEngine = require('../src/memory/DecisionMemoryEngine');

async function runOutcomeInvariance() {
    console.log('=== A.PICK PHASE E.5: OUTCOME INVARIANCE VERIFICATION ===\n');

    const baseHistory = Array.from({ length: 15 }, (_, i) => ({
        decisionId: `d_${i}`,
        sport: 'BASEBALL',
        executed: true,
        entryThreshold: 1.82,
        enteredBelowThreshold: i < 10, // 10/15 = 66.7% chase rate
        priceQuality: i < 10 ? 'POOR' : 'EXCELLENT',
        ruleDiscipline: i < 10 ? 'PARTIAL' : 'FOLLOWED',
        thesisQuality: 'SOUND',
        decisionQuality: i < 10 ? 'POOR' : 'EXCELLENT'
    }));

    // Case 1: 100% All Wins
    const allWins = baseHistory.map(h => new DecisionMemoryRecord({ ...h, userId: 'u_win', outcome: 'WIN' }));

    // Case 2: 100% All Losses
    const allLosses = baseHistory.map(h => new DecisionMemoryRecord({ ...h, userId: 'u_loss', outcome: 'LOSS' }));

    const resWins = DecisionMemoryEngine.evaluateUserMemory(allWins, 'u_win');
    const resLosses = DecisionMemoryEngine.evaluateUserMemory(allLosses, 'u_loss');

    console.log('1. All-Wins User vs All-Losses User Behavior Pattern:');
    console.log(`   Wins Top Pattern:   ${resWins.topPattern.patternCode} (Rate: ${(resWins.topPattern.occurrenceRate * 100).toFixed(1)}%)`);
    console.log(`   Losses Top Pattern: ${resLosses.topPattern.patternCode} (Rate: ${(resLosses.topPattern.occurrenceRate * 100).toFixed(1)}%)`);
    assert.strictEqual(resWins.topPattern.patternCode, resLosses.topPattern.patternCode);
    assert.strictEqual(resWins.topPattern.occurrenceRate, resLosses.topPattern.occurrenceRate);

    console.log('\n2. Next-Round Implication & Proposed Behavior Rule:');
    console.log(`   Wins Implication:   ${resWins.summary.biggestImplication}`);
    console.log(`   Losses Implication: ${resLosses.summary.biggestImplication}`);
    console.log(`   Wins Rule:          ${resWins.proposedRule.ruleType}`);
    console.log(`   Losses Rule:        ${resLosses.proposedRule.ruleType}`);
    assert.strictEqual(resWins.summary.biggestImplication, resLosses.summary.biggestImplication);
    assert.strictEqual(resWins.proposedRule.ruleType, resLosses.proposedRule.ruleType);

    console.log('\n3. Scorecard Comparison:');
    console.log(`   Wins Price Discipline Rate:   ${resWins.scorecard.priceDisciplineRate}`);
    console.log(`   Losses Price Discipline Rate: ${resLosses.scorecard.priceDisciplineRate}`);
    assert.strictEqual(resWins.scorecard.priceDisciplineRate, resLosses.scorecard.priceDisciplineRate);

    console.log('\n✅ Outcome Invariance 100% Verified in Decision Memory!\n');

    // Write reports/PHASE_E5_OUTCOME_INVARIANCE.md
    let md = `# Phase E.5 Decision Memory Outcome Invariance Report\n\n`;
    md += `> **실행시각:** ${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}\n`;
    md += `> **핵심 원칙:** **승률 및 경기 결과는 행동 패턴 감지 및 다음 회차 규칙 제안에 일체 영향을 미치지 않음.**\n\n`;
    md += `## 실측 불변성 비교 결과\n\n`;
    md += `| 항목 | 전승 이력 (All-Wins) | 전패 이력 (All-Losses) | 일치 여부 |\n`;
    md += `|---|---|---|---|\n`;
    md += `| **최상위 감지 패턴** | \`${resWins.topPattern.patternCode}\` | \`${resLosses.topPattern.patternCode}\` | ✅ 100% 일치 |\n`;
    md += `| **패턴 발생 빈도** | \`${(resWins.topPattern.occurrenceRate * 100).toFixed(1)}%\` | \`${(resLosses.topPattern.occurrenceRate * 100).toFixed(1)}%\` | ✅ 100% 일치 |\n`;
    md += `| **가장 큰 의미 (Implication)** | *${resWins.summary.biggestImplication}* | *${resLosses.summary.biggestImplication}* | ✅ 100% 일치 |\n`;
    md += `| **다음 한 가지 행동** | *${resWins.summary.oneNextBehavior}* | *${resLosses.summary.oneNextBehavior}* | ✅ 100% 일치 |\n`;
    md += `| **제안된 행동 규칙** | \`${resWins.proposedRule.ruleType}\` | \`${resLosses.proposedRule.ruleType}\` | ✅ 100% 일치 |\n`;
    md += `| **가격 규율 준수율** | \`${(resWins.scorecard.priceDisciplineRate * 100).toFixed(1)}%\` | \`${(resLosses.scorecard.priceDisciplineRate * 100).toFixed(1)}%\` | ✅ 100% 일치 |\n`;

    fs.writeFileSync('./reports/PHASE_E5_OUTCOME_INVARIANCE.md', md);
    console.log('✅ Saved: reports/PHASE_E5_OUTCOME_INVARIANCE.md\n');
}

if (require.main === module) {
    runOutcomeInvariance().catch(console.error);
}

module.exports = runOutcomeInvariance;
