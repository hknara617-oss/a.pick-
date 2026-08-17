'use strict';

/**
 * tools/run_phase_f5_dogfood_simulation.js
 *
 * Runs a deterministic Founder Dogfood cycle with real Betman 260097 markets:
 * 1. Founder starts cold-start session.
 * 2. Browses live markets via [시장 둘러보기] and selects real market.
 * 3. Understands market fair vs entry threshold.
 * 4. Writes genuine thesis and sets break conditions.
 * 5. Seals DecisionContract into Supabase.
 * 6. Records actual execution status.
 * 7. Verifies active Watch state.
 * 8. Submits founder feedback and answers dogfood questions.
 */

const assert = require('assert');
const fs = require('fs');
const http = require('http');

async function runFounderDogfoodSimulation() {
    console.log('=== A.PICK PHASE F.5: FOUNDER DOGFOOD CYCLE SIMULATION ===\n');

    const server = require('./dogfood_server');
    const port = 3005;

    await new Promise((resolve) => {
        server.listen(port, resolve);
    });

    console.log(`1. Dogfood Server listening on http://localhost:${port}`);

    // Helper fetcher
    async function request(path, options = {}) {
        return new Promise((resolve, reject) => {
            const req = http.request(`http://localhost:${port}${path}`, options, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        resolve({ status: res.statusCode, data: JSON.parse(data || '{}') });
                    } catch (_) {
                        resolve({ status: res.statusCode, data });
                    }
                });
            });
            req.on('error', reject);
            if (options.body) req.write(options.body);
            req.end();
        });
    }

    // Step 1: Query Today API
    console.log('2. Fetching Today markets & full market browser data...');
    const todayRes = await request('/api/today');
    assert.strictEqual(todayRes.status, 200);
    assert.strictEqual(todayRes.data.currentRound, '260097');
    assert(todayRes.data.allMarkets.length >= 4);
    console.log(`   Found ${todayRes.data.allMarkets.length} live Betman 260097 markets.`);

    // Step 2: Founder selects real market: Toronto vs Vancouver (MLB)
    const selectedMarket = todayRes.data.allMarkets[0];
    console.log(`3. Founder selected real market: ${selectedMarket.eventName} (${selectedMarket.selectionName} @ ${selectedMarket.odds})`);

    // Step 3: Seal DecisionContract
    console.log('4. Sealing DecisionContract with thesis and break conditions...');
    const sealRes = await request('/api/decision/seal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            roundId: '260097',
            sport: selectedMarket.sport,
            league: selectedMarket.league,
            eventId: selectedMarket.eventId,
            marketId: selectedMarket.marketId,
            selectionId: selectedMarket.selectionId,
            offeredOdds: selectedMarket.odds,
            entryThreshold: 1.82,
            thesisSummary: '선발 투수 매치업 우위 및 마진 확보',
            evidenceChips: ['선발 확인', '가격 메리트'],
            breakConditions: [
                { code: 'ODDS_BELOW_MINIMUM', threshold: 1.82, action: 'INVALIDATE' },
                { code: 'STARTER_SCRATCHED', action: 'INVALIDATE' }
            ]
        })
    });
    assert.strictEqual(sealRes.status, 201);
    assert(sealRes.data.contract.id !== undefined);
    console.log(`   Sealed Decision ID: ${sealRes.data.contract.id}`);

    // Step 4: Record Real Execution
    console.log('5. Recording founder execution status...');
    const execRes = await request('/api/decision/execution', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            decisionId: sealRes.data.contract.id,
            executed: true,
            entryOdds: 1.86
        })
    });
    assert.strictEqual(execRes.status, 200);
    assert.strictEqual(execRes.data.success, true);
    console.log('   Real execution recorded (Entry Odds: 1.86).');

    // Step 5: Verify Watch
    console.log('6. Verifying active Watch state...');
    const watchRes = await request('/api/watch');
    assert.strictEqual(watchRes.status, 200);
    assert.strictEqual(watchRes.data.activeCount, 1);
    assert.strictEqual(watchRes.data.stable.length, 1);
    console.log(`   WATCH Active Count: ${watchRes.data.activeCount} (Status: ${watchRes.data.stable[0].mostImportantChange})`);

    // Step 6: Submit Founder Feedback
    console.log('7. Submitting Founder Feedback...');
    const fbRes = await request('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            screen: 'TODAY',
            issueType: 'COPY',
            note: '오늘의 픽 탭 이름보다 "시장" 또는 "판단"이 더 개인 에이전트 느낌에 부합함.'
        })
    });
    assert.strictEqual(fbRes.status, 200);
    assert.strictEqual(fbRes.data.success, true);

    // Step 7: Stats Check
    const statsRes = await request('/api/dogfood/stats');
    assert.strictEqual(statsRes.data.sealedContractsCount, 1);
    assert.strictEqual(statsRes.data.executionsCount, 1);
    assert.strictEqual(statsRes.data.feedbackCount, 1);
    console.log('   Dogfood stats verified.');

    server.close();
    console.log('\n✅ Phase F.5 Founder Dogfood Simulation Completed Successfully!\n');

    return true;
}

if (require.main === module) {
    runFounderDogfoodSimulation().catch(console.error);
}

module.exports = runFounderDogfoodSimulation;
