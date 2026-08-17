'use strict';

const fs = require('fs');
const path = require('path');
const EvidenceEngine = require('../src/intelligence/EvidenceEngine');
const BetmanLiveFeedResolver = require('../src/feed/BetmanLiveFeedResolver');
const TodayService = require('../src/services/TodayService');

async function runRealityAudit() {
    const live = BetmanLiveFeedResolver.getActiveLiveRound();
    const ts = new TodayService();
    const vm = await ts.getTodayViewModel({ liveMarketObservations: live.markets });

    console.log('==================================================');
    console.log('A.PICK FOUNDER REALITY AUDIT — RUNTIME VERIFICATION');
    console.log('==================================================');
    console.log(`Total live markets: ${live.markets.length}`);
    console.log(`Curated setups: ${vm.candidates.length}\n`);

    vm.candidates.forEach((c, idx) => {
        console.log(`[SETUP #${idx+1}] ${c.eventName} — ${c.selectionName}`);
        console.log(`  • Market ID: ${c.marketId}`);
        console.log(`  • Offered Odds: @${c.currentOdds} | Betman No-Vig Ref: @${c.betmanNoVigFairOdds}`);
        console.log(`  • Setup Quality:`, c.setupQuality);
        console.log(`  • Action Headline: ${c.actionHeadline}`);
        console.log(`  • Strongest Support: ${c.caseFor?.[0]?.claim || '충분한 찬성 근거 없음'}`);
        console.log(`    [Source: ${c.caseFor?.[0]?.source || 'N/A'}, Reliability: ${c.caseFor?.[0]?.reliability || 'N/A'}]`);
        console.log(`  • Strongest Oppose: ${c.caseAgainst?.[0]?.claim || '충분한 반대 근거 없음'}`);
        console.log(`    [Source: ${c.caseAgainst?.[0]?.source || 'N/A'}, Reliability: ${c.caseAgainst?.[0]?.reliability || 'N/A'}]`);
        console.log(`  • Unknowns (${c.unknowns?.length || 0}건):`, c.unknowns?.map(u => u.claim) || []);
        console.log(`  • Kill Condition: ${c.killConditions?.[0] || '조건 없음'}`);
        console.log('--------------------------------------------------');
    });
}

runRealityAudit().catch(err => console.error(err));
