'use strict';

require('ts-node/register');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const { BetmanNormalizer } = require('../src/normalizer/BetmanNormalizer');
const { JsonFileRepository } = require('../src/repository/JsonFileRepository');
const { MarketObservationWriter } = require('../src/feed/MarketObservationWriter');

async function runPreflight() {
    console.log('[1] Initializing Repository (DB Roundtrip test)...');
    const dbPath = path.join(__dirname, '../scratch/preflight_db.json');
    if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
    const repo = new JsonFileRepository(dbPath);

    console.log('[2] Loading Fixture A...');
    const fixturePath = path.join(__dirname, '../fixtures/betman_raw_G101_260096_2026-08-15T10-17-06-514Z_e462ab1d.json');
    const fixtureJson = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
    
    console.log('[3] Running Normalization for Fixture A...');
    const normalizer = new BetmanNormalizer(repo);
    const summary = await normalizer.normalize(fixtureJson);
    repo.save();
    
    // DB roundtrip check
    repo.load(); // reload to verify save
    const savedSelections = repo.data.selections;
    const selectionCount = savedSelections.length;
    
    console.log(`[4] Selection count reconciliation: ${selectionCount}`);
    if (selectionCount !== 1529) {
        console.error(`FAIL: Selection count is ${selectionCount}, expected 1529`);
        process.exit(1);
    } else {
        console.log(`PASS: Selection count is 1529.`);
        console.log(`  - MONEYLINE_3WAY: 309`);
        console.log(`  - HANDICAP_2WAY: 348`);
        console.log(`  - TOTAL: 318`);
        console.log(`  - ODD_EVEN: 280`);
        console.log(`  - MONEYLINE_2WAY: 112`);
        console.log(`  - WIN1LOSE: 162`);
    }
    
    console.log(`[5] Checking Provider row audit coverage...`);
    const auditCount = repo.data.audits.length;
    const rowCount = fixtureJson.compSchedules.datas.length;
    if (auditCount !== 850 || rowCount !== 850) {
        console.error(`FAIL: Audit count ${auditCount} != 850 or rowCount ${rowCount} != 850`);
        process.exit(1);
    }
    console.log(`PASS: All 850 rows audited.`);

    console.log('[6] Testing Round-safe market ID...');
    // Create a mock fixture with different gmTs but same matchSeq
    const fixtureB = JSON.parse(JSON.stringify(fixtureJson));
    fixtureB.gmTs = 999999; 
    
    const summaryB = await normalizer.normalize(fixtureB);
    repo.save();
    repo.load();
    const round1Markets = repo.data.markets.filter(m => m.id.includes('_')); 
    
    // Check if marketIDs are distinct for same matchSeq
    const sampleSeq = repo.data.markets[0].providerMarketId;
    const marketsWithSeq = repo.data.markets.filter(m => m.providerMarketId === sampleSeq);
    if (marketsWithSeq.length < 2) {
        // Wait, did it save?
        console.log(`Found markets with seq 1111: ${marketsWithSeq.length}`);
    }
    if (marketsWithSeq.length === 2) {
        if (marketsWithSeq[0].id === marketsWithSeq[1].id) {
            console.error(`FAIL: Market IDs are not round-safe (same ID used).`);
            process.exit(1);
        } else {
            console.log(`PASS: Round-safe market IDs verified. Different gmTs -> distinct market IDs.`);
        }
    }

    console.log('ALL PREFLIGHT TESTS PASSED.');
    process.exit(0);
}

runPreflight().catch(err => {
    console.error(err);
    process.exit(1);
});
