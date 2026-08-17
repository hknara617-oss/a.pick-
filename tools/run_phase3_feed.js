'use strict';
require('ts-node/register');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const { BetmanNormalizer } = require('../src/normalizer/BetmanNormalizer');
const { JsonFileRepository } = require('../src/repository/JsonFileRepository');
const { MarketObservationWriter } = require('../src/feed/MarketObservationWriter');
const { ChangeDetector } = require('../src/feed/ChangeDetector');
const { ProviderHealth } = require('../src/feed/ProviderHealth');
const { SchemaDriftDetector } = require('../src/feed/SchemaDriftDetector');
const { TooltipHistoryParser } = require('../src/feed/TooltipHistoryParser');

async function runFeedTests() {
    console.log('[1] Initializing Repository...');
    const dbPath = path.join(__dirname, '../scratch/feed_db.json');
    if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
    const repo = new JsonFileRepository(dbPath);

    const normalizer = new BetmanNormalizer(repo);
    const writer = new MarketObservationWriter(repo);
    const changeDetector = new ChangeDetector(repo, 1);
    const health = new ProviderHealth(repo);
    const schemaDetector = new SchemaDriftDetector();

    // Load fixture A
    const fixturePath = path.join(__dirname, '../fixtures/betman_raw_G101_260096_2026-08-15T10-17-06-514Z_e462ab1d.json');
    const fixtureA = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));

    // Helper to ingest and write observations
    async function ingest(fixture, snapshotId) {
        fixture.gmTs = 260096; // ensure constant gmTs unless overriden
        const summary = await normalizer.normalize(fixture);
        repo.save();
        
        // Write observations for all normalized markets
        const rawMarkets = repo.data.markets.filter(m => repo.data.audits.some(a => a.snapshotId === summary.snapshotId && a.normalizedMarketId === m.id));
        const marketMap = new Map();
        for (const m of rawMarkets) {
            marketMap.set(m.id, m);
        }
        const markets = Array.from(marketMap.values());
        
        const changeIds = [];
        for (const market of markets) {
            const rawSels = repo.data.selections.filter(s => s.marketId === market.id);
            // Deduplicate selections by selectionType (take the most recently added)
            const selMap = new Map();
            for (const s of rawSels) selMap.set(s.selectionType, s);
            const sels = Array.from(selMap.values());
            const obsId = await writer.writeObservation(
                market, sels, summary.snapshotId, '260096', 'hash123', new Date().toISOString()
            );
            const change = await changeDetector.detectChanges(obsId, false);
            if (change) changeIds.push(change.id);
        }
        repo.save();
        
        // Detect removals
        const removals = await changeDetector.detectRemovals(summary.snapshotId, false);
        for (const r of removals) changeIds.push(r.id);
        repo.save();
        
        return { summary, changeIds };
    }

    console.log('[2] Ingesting Fixture A (Golden)...');
    const resA = await ingest(fixtureA, 'SNAP_A');
    console.log(`Initial ingestion produced ${resA.changeIds.length} changes (all MARKET_ADDED)`);

    // We only care about changes after initial ingestion. Let's reset the market changes to ignore the initial MARKET_ADDED
    // Or we can just count the newly created ones by keeping track of the count.
    let initialChangeCount = repo.data.marketChanges.length;

    console.log('[3] Generating Fixture B with controlled changes...');
    const fixtureB = JSON.parse(JSON.stringify(fixtureA));
    const datas = fixtureB.compSchedules.datas;
    const keys = fixtureB.compSchedules.keys;
    const betIdIdx = keys.indexOf('betId');
    const winAllotIdx = keys.indexOf('winAllot');
    const handiIdx = keys.indexOf('handi');
    const matchSeqIdx = keys.indexOf('matchSeq');

    let moneylineChanged = false;
    let handicapChanged = false;
    let totalChanged = false;

    for (let i = 0; i < datas.length; i++) {
        const betId = datas[i][betIdIdx];
        if (betId === '1' && !moneylineChanged) {
            datas[i][winAllotIdx] = String(Number(datas[i][winAllotIdx]) - 0.15); // MONEYLINE odds change
            moneylineChanged = true;
        } else if (betId === '5' && !handicapChanged) {
            datas[i][handiIdx] = String(Number(datas[i][handiIdx]) - 1); // HANDICAP line change
            handicapChanged = true;
        } else if (betId === '78' && !totalChanged) {
            datas[i][winAllotIdx] = String(Number(datas[i][winAllotIdx]) + 0.10); // TOTAL odds change
            totalChanged = true;
        }
    }

    // Remove one market (pop the last one)
    datas.pop(); 

    // Add a synthetic market
    const newRow = JSON.parse(JSON.stringify(datas[0]));
    newRow[matchSeqIdx] = '999999'; // new matchSeq
    datas.push(newRow);

    console.log('[4] Ingesting Fixture B...');
    const resB = await ingest(fixtureB, 'SNAP_B');
    
    // Evaluate new changes
    const newChanges = repo.data.marketChanges.slice(initialChangeCount);
    console.log(`Changes detected: ${newChanges.length}`);
    
    let oddsChanges = newChanges.filter(c => c.changeType === 'ODDS_CHANGE');
    let lineChanges = newChanges.filter(c => c.changeType === 'LINE_CHANGE');
    let added = newChanges.filter(c => c.changeType === 'MARKET_ADDED');
    let removed = newChanges.filter(c => c.changeType === 'MARKET_REMOVED');
    
    console.log(`ODDS_CHANGE: ${oddsChanges.length}`);
    console.log(`LINE_CHANGE: ${lineChanges.length}`);
    console.log(`MARKET_ADDED: ${added.length}`);
    console.log(`MARKET_REMOVED: ${removed.length}`);

    if (oddsChanges.length !== 2 || lineChanges.length !== 1 || added.length !== 1 || removed.length !== 1) {
        console.error('FAIL: Change detection counts mismatch.');
        process.exit(1);
    }
    console.log('PASS: Exact changes detected.');

    console.log('[5] Idempotency test (ingest A twice)...');
    initialChangeCount = repo.data.marketChanges.length;
    // We ingest A again (technically changing back, so it WILL produce changes!)
    // Wait, idempotency test means ingest the SAME fixture twice.
    const resB2 = await ingest(fixtureB, 'SNAP_B2');
    const idempotencyChanges = repo.data.marketChanges.slice(initialChangeCount);
    if (idempotencyChanges.length !== 0) {
        console.error(`FAIL: Idempotency failed. Produced ${idempotencyChanges.length} changes.`);
        console.log(JSON.stringify(idempotencyChanges, null, 2));
        process.exit(1);
    }
    console.log('PASS: Idempotency test.');

    console.log('[6] Round transition test...');
    const fixtureC = JSON.parse(JSON.stringify(fixtureB));
    fixtureC.gmTs = 999999; 
    fixtureC.currentLottery = { gmTs: 999999 };
    // Normalizer uses gmTs.
    const summaryC = await normalizer.normalize(fixtureC);
    repo.save();
    // We see if the market ID for matchSeq 999999 is different
    const marketB = repo.data.markets.find(m => m.providerMarketId === '999999'); // Should be from B
    const marketC = repo.data.markets.filter(m => m.providerMarketId === '999999').pop(); // Should be from C
    if (marketB.id === marketC.id) {
        console.error('FAIL: Round transition failed, market IDs match.');
        process.exit(1);
    }
    console.log('PASS: Round transition.');

    console.log('[7] Partial payload safety...');
    const fixturePartial = JSON.parse(JSON.stringify(fixtureB));
    fixturePartial.compSchedules.datas = fixturePartial.compSchedules.datas.slice(0, 300);
    const summaryPartial = await normalizer.normalize(fixturePartial);
    repo.save();
    const partialRemovals = await changeDetector.detectRemovals(summaryPartial.snapshotId, true);
    if (partialRemovals.length > 0) {
        console.error(`FAIL: Partial payload produced ${partialRemovals.length} removals!`);
        process.exit(1);
    }
    console.log('PASS: Partial payload safety (0 removals).');

    console.log('[8] Audit chain test...');
    const sampleChange = oddsChanges[0];
    const obs = repo.data.marketObservations.find(o => o.id === sampleChange.currentObservationId);
    const snap = repo.data.snapshots.find(s => s.snapshotId === obs.snapshotId);
    if (!sampleChange || !obs || !snap) {
        console.error('FAIL: Audit chain broken.');
        process.exit(1);
    }
    console.log('PASS: Audit chain traceable.');

    console.log('[9] Staleness test...');
    await health.updateHealth('betman', false, null, null, null);
    await health.updateHealth('betman', false, null, null, null);
    const st = await health.updateHealth('betman', false, null, null, null);
    if (st.state !== 'STALE') {
        console.error(`FAIL: Provider health state is ${st.state}, expected STALE.`);
        process.exit(1);
    }
    console.log('PASS: Staleness test.');

    console.log('[10] Schema drift test...');
    const driftCheck = schemaDetector.checkSchema(['wrong_key']);
    if (driftCheck.isMatch) {
        console.error('FAIL: Schema drift not detected.');
        process.exit(1);
    }
    console.log('PASS: Schema drift detected.');
    
    console.log('[11] Tooltip tests...');
    const tooltipParser = new TooltipHistoryParser();
    const scaled = tooltipParser.normalizeTooltipOdds(480);
    if (scaled !== '4.80') {
        console.error(`FAIL: Tooltip scale is ${scaled}`);
        process.exit(1);
    }
    const tsCheck = tooltipParser.parseTooltipTimestamp('20260815191634031948');
    if (tsCheck.status !== 'UNVERIFIED_TIMESTAMP_FORMAT') {
        console.error('FAIL: Timestamp not unverified');
        process.exit(1);
    }
    console.log('PASS: Tooltip scale and timestamp check.');

    console.log('ALL FEED TESTS PASSED.');
    process.exit(0);
}

runFeedTests().catch(err => {
    console.error(err);
    process.exit(1);
});
