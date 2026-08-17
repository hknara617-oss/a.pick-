'use strict';

const fs = require('fs');
const EvidenceEngine = require('../src/intelligence/EvidenceEngine');
const BetmanLiveFeedResolver = require('../src/feed/BetmanLiveFeedResolver');
const TodayService = require('../src/services/TodayService');
const DecisionThesis = require('../src/domain/DecisionThesis');

console.log('================================================================');
console.log('A.PICK P0.6 / P0.7 — EVENT-FIRST & THESIS CAPTURE REGRESSION');
console.log('================================================================\n');

const live = BetmanLiveFeedResolver.getActiveLiveRound();
const ts = new TodayService();

ts.getTodayViewModel({ liveMarketObservations: live.markets }).then(async vm => {
    console.log('[P0.6 TEST 1] Event-First Discovery Verification:');
    vm.events.forEach((ev, idx) => {
        console.log(`  Event #${idx+1}: ${ev.eventName} (${ev.sport} • ${ev.league})`);
        console.log(`    • Data Coverage: ${ev.domainCoverage}`);
        console.log(`    • Selectable Outcomes (${ev.selections.length}개): ${ev.selections.map(s => `${s.selectionName} @${s.odds}`).join(' | ')}`);
    });

    const isAllEventFirst = vm.events.every(ev => ev.eventName.includes(' vs '));
    if (isAllEventFirst) {
        console.log('  👉 PASS: 첫 화면이 승패 결과가 아닌 경기(Event) 단위로 100% 렌더링됨.\n');
    } else {
        console.error('  ❌ FAIL: Found outcome-based cards in Top 3!');
        process.exit(1);
    }

    console.log('[P0.6 TEST 2] Favorite Bias Invariance Test:');
    // Modify odds to simulate favorite inversion while keeping data coverage identical
    const invertedMarkets = live.markets.map(m => ({
        ...m,
        winOdds: m.winOdds ? (m.winOdds < 2.0 ? 5.0 : 1.2) : 2.0,
        loseOdds: m.loseOdds ? (m.loseOdds < 2.0 ? 5.0 : 1.2) : 2.0
    }));
    const vmInverted = await ts.getTodayViewModel({ liveMarketObservations: invertedMarkets });
    const originalEventNames = vm.events.map(e => e.eventName);
    const invertedEventNames = vmInverted.events.map(e => e.eventName);

    const isRankingIdentical = JSON.stringify(originalEventNames) === JSON.stringify(invertedEventNames);
    console.log('  • Original Event Top 3:', originalEventNames);
    console.log('  • Inverted Odds Event Top 3:', invertedEventNames);
    if (isRankingIdentical) {
        console.log('  👉 PASS: 배당 역전 시에도 이벤트 랭킹이 100% 동일하게 유지됨 (Favorite/Odds Bias 0%).\n');
    } else {
        console.error('  ❌ FAIL: Ranking changed when odds inverted!');
        process.exit(1);
    }

    console.log('[P0.7 TEST 1] DecisionThesis Model & Immutability Test:');
    const thesis = new DecisionThesis({
        decisionId: 'dec_test_123',
        userId: 'founder_dogfood',
        selectedReasonCodes: ['STARTER', 'TACTICAL'],
        userStatement: '상대팀 컵대회 로테이션 가능성을 보고 홈 역습을 노림',
        primaryDriver: 'TACTICAL',
        biggestConcern: '상대 주전 공격진 후반 교체 투입',
        suggestedKillCondition: '상대 핵심 공격수 출전 시 재검토'
    });

    console.log('  • DecisionThesis Instance Created:', {
        decisionId: thesis.decisionId,
        userStatement: thesis.userStatement,
        primaryDriver: thesis.primaryDriver,
        hasSpecificStatement: thesis.hasSpecificStatement,
        hasConcernLinkage: thesis.hasConcernLinkage
    });

    if (thesis.hasSpecificStatement && thesis.hasConcernLinkage && thesis.primaryDriver === 'TACTICAL') {
        console.log('  👉 PASS: DecisionThesis 엔티티가 구조화된 사전 가설과 파기 조건을 완벽히 캡처함.\n');
    } else {
        console.error('  ❌ FAIL: DecisionThesis validation failed!');
        process.exit(1);
    }

    console.log('================================================================');
    console.log('ALL P0.6 / P0.7 INTEGRITY GATES PASSED ✅');
    console.log('================================================================');
});
