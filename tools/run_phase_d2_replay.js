'use strict';
/**
 * tools/run_phase_d2_replay.js
 *
 * Replayability & Audit Chain Harness.
 * - Replays sequential observations against sealed contracts.
 * - Verifies cryptographic hash continuity.
 * - Injects tampering and confirms audit failure.
 * - Generates reports/PHASE_D2_REPLAY_AUDIT.md.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const DecisionContract = require('../src/models/DecisionContract');
const DecisionEvent = require('../src/models/DecisionEvent');
const BreakCondition = require('../src/models/BreakCondition');
const WatchEngine = require('../src/watch/WatchEngine');
const WatchTarget = require('../src/watch/WatchTarget');
const WatchReplayEngine = require('../src/watch/WatchReplayEngine');

async function runReplayAudit() {
    console.log('=== A.PICK PHASE D.2: AUDIT CHAIN & REPLAYABILITY HARNESS ===\n');

    const contract = new DecisionContract({
        id: 'c_replay_01', provider: 'BETMAN', roundId: '260097', sport: 'BASEBALL', league: 'MLB',
        eventId: 'e_rep_01', marketId: 'm_rep_01', selectionId: 's_rep_01', offeredOddsAtSeal: 1.85,
        entryRule: { minimumEntryOdds: 1.82 },
        breakConditions: [new BreakCondition({ type: 'PRICE_LT', threshold: 1.70 })]
    });

    const engine = new WatchEngine();
    const target = new WatchTarget({ id: 'wt_rep_01', decisionId: contract.id, eventId: contract.eventId, marketId: contract.marketId, selectionId: contract.selectionId });
    engine.registerWatch(contract, target);

    // 1. Generate observation sequence
    const mKey = 'BETMAN:260097:m_rep_01';
    engine.processMarketObservation(mKey, { currentMarketOdds: [1.85, 1.85] });
    engine.processMarketObservation(mKey, { currentMarketOdds: [1.80, 1.90] });
    engine.processMarketObservation(mKey, { currentMarketOdds: [1.68, 2.05] }); // Triggers break

    const chain = engine.eventChains.get(contract.id);
    console.log(`Generated event chain of ${chain.length} linked DecisionEvents.`);

    // 2. Verify clean audit chain
    const cleanAudit = WatchReplayEngine.verifyAuditChain(chain);
    assert.strictEqual(cleanAudit.valid, true, 'Clean chain must pass verification');
    console.log('  ✅ Clean audit chain cryptographically verified (100% PASS).');

    // 3. Inject tampering in historical event
    console.log('Injecting synthetic tampering into event #1 payload...');
    const tamperedChain = chain.map((e, idx) => {
        if (idx === 1) {
            return { ...e, payload: { ...e.payload, tamperedField: 'HACKED' } };
        }
        return e;
    });

    const tamperedAudit = WatchReplayEngine.verifyAuditChain(tamperedChain);
    assert.strictEqual(tamperedAudit.valid, false, 'Tampered chain must fail audit');
    assert.strictEqual(tamperedAudit.tamperedIndex, 1, 'Tampered index must be exactly 1');
    console.log(`  ✅ Tampering correctly caught at index ${tamperedAudit.tamperedIndex}: "${tamperedAudit.reason}"`);

    // 4. Test deterministic replay
    console.log('Testing deterministic replay of observation sequence...');
    const replayed = WatchReplayEngine.replayObservations(contract, [
        { currentMarketOdds: [1.85, 1.85] },
        { currentMarketOdds: [1.80, 1.90] },
        { currentMarketOdds: [1.68, 2.05] }
    ]);
    assert.strictEqual(replayed.length, 3);
    assert.strictEqual(replayed[0].thesisState, 'VALID');
    assert.strictEqual(replayed[1].thesisState, 'VALID');
    assert.strictEqual(replayed[2].thesisState, 'BROKEN');
    console.log('  ✅ Replay reproduced exact state sequence: VALID -> VALID -> BROKEN.');

    // ── Generate Report: reports/PHASE_D2_REPLAY_AUDIT.md ─────────────────
    let md = `# Phase D.2 Audit Chain & Replayability Report\n\n`;
    md += `> **실행시각:** ${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}\n`;
    md += `> **목적:** 해시 체인 기반 무결성 및 결정론적 재현성(Deterministic Replayability) 검증\n\n`;
    md += `---\n\n## 1. 감사 체인 포렌식 결과\n\n`;
    md += `| 테스트 항목 | 이벤트 수 | 체인 상태 | 검증 결과 |\n`;
    md += `|---|---|---|---|\n`;
    md += `| **정상 체인 검증** | ${chain.length} | SHA-256 Chained | ✅ **100% VALID** |\n`;
    md += `| **과거 이벤트 위변조 감지** | ${tamperedChain.length} | Index 1 Payload Modified | ❌ **TAMPERING DETECTED** (정상 차단) |\n`;
    md += `| **결정론적 재현성 (Replay)** | 3회 순차 주입 | VALID → VALID → BROKEN | ✅ **100% REPRODUCED** |\n`;

    fs.writeFileSync('./reports/PHASE_D2_REPLAY_AUDIT.md', md);
    console.log('\n✅ Saved: reports/PHASE_D2_REPLAY_AUDIT.md\n');
}

if (require.main === module) {
    runReplayAudit().catch(console.error);
}

module.exports = runReplayAudit;
