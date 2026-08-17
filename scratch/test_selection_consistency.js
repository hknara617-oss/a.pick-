'use strict';

const fs = require('fs');
const EvidenceEngine = require('../src/intelligence/EvidenceEngine');
const BetmanLiveFeedResolver = require('../src/feed/BetmanLiveFeedResolver');
const TodayService = require('../src/services/TodayService');

console.log('======================================================');
console.log('A.PICK P0 — SELECTION/EVIDENCE CONSISTENCY REGRESSION');
console.log('======================================================\n');

// 1. Test Inversion on Chungnam Asan vs Daejeon
const live = BetmanLiveFeedResolver.getActiveLiveRound();
const chungnamHomeMarket = live.markets.find(m => m.eventName.includes('충남아산') && m.selectionName.includes('충남아산'));
const daejeonAwayMarket = {
    ...chungnamHomeMarket,
    selectionId: 's_lose',
    selectionName: '대전 하나시티즌 승',
    odds: 1.68
};

console.log('[SCENARIO 1] 충남아산 vs 대전 — 선택: 충남아산 승 (@4.00)');
const asanAnalysis = EvidenceEngine.analyzeMarket(chungnamHomeMarket);
console.log('  • Action State:', asanAnalysis.actionState);
console.log('  • Action Headline:', asanAnalysis.actionHeadline);
console.log('  • Case For (' + asanAnalysis.caseFor.length + '건):', asanAnalysis.caseFor.map(e => e.claim));
console.log('  • Case Against (' + asanAnalysis.caseAgainst.length + '건):', asanAnalysis.caseAgainst.map(e => e.claim));

if (asanAnalysis.caseFor.length === 0 && asanAnalysis.caseAgainst.length >= 1 && asanAnalysis.actionState === 'DO_NOT_ENTER') {
    console.log('  👉 PASS: 충남아산 승 선택 시 대전 우세 팩트가 완벽히 Case Against로 분류되고 WAIT/DO_NOT_ENTER 판정됨.\n');
} else {
    console.error('  ❌ FAIL: Direction inversion logic failed for Chungnam Asan!');
    process.exit(1);
}

console.log('[SCENARIO 2] 충남아산 vs 대전 — 선택: 대전 하나시티즌 승 (@1.68)');
const daejeonAnalysis = EvidenceEngine.analyzeMarket(daejeonAwayMarket);
console.log('  • Action State:', daejeonAnalysis.actionState);
console.log('  • Case For (' + daejeonAnalysis.caseFor.length + '건):', daejeonAnalysis.caseFor.map(e => e.claim));
console.log('  • Case Against (' + daejeonAnalysis.caseAgainst.length + '건):', daejeonAnalysis.caseAgainst.map(e => e.claim));

if (daejeonAnalysis.caseFor.length >= 1) {
    console.log('  👉 PASS: 대전 승 선택 시 동일한 팩트가 정확히 Case For(찬성)로 반전됨.\n');
} else {
    console.error('  ❌ FAIL: Direction inversion logic failed for Daejeon!');
    process.exit(1);
}

// 2. Test Setup Ranking: Chungnam Asan MUST NOT be in the top 3 Decision Setups!
const ts = new TodayService();
ts.getTodayViewModel({ liveMarketObservations: live.markets }).then(vm => {
    console.log('[SCENARIO 3] Decision Setup Ranking Inspection (Top 3):');
    vm.candidates.forEach((c, idx) => {
        console.log(`  #${idx+1}: ${c.eventName} (${c.selectionName}) — Support: ${c.caseFor.length}, Oppose: ${c.caseAgainst.length}, Action: ${c.actionState}`);
    });

    const hasZeroSupport = vm.candidates.some(c => c.caseFor.length === 0);
    if (!hasZeroSupport) {
        console.log('  👉 PASS: Support가 0건인 선택지는 오늘 확인할 시장 상위 3건에서 완벽히 배제됨.\n');
    } else {
        console.error('  ❌ FAIL: Found zero-support candidate in top 3 setups!');
        process.exit(1);
    }
});
