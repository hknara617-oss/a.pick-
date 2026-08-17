'use strict';
require('ts-node/register');
const crypto = require('crypto');
const fs = require('fs');

async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchBetman() {
    const start = Date.now();
    const res = await fetch('https://www.betman.co.kr/buyPsblGame/gameInfoInq.do', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'gmId=G101&gmTs=260096'
    });
    if (!res.ok) throw new Error('Fetch failed');
    const text = await res.text();
    const latencyMs = Date.now() - start;
    const json = JSON.parse(text);
    
    // Hash compSchedules
    const cs = json.compSchedules;
    const hash = crypto.createHash('sha256').update(JSON.stringify(cs)).digest('hex');
    const rowCount = cs.datas ? cs.datas.length : 0;

    return { fetchTime: new Date().toISOString(), latencyMs, snapshotHash: hash, rowCount, json };
}

async function run() {
    console.log('Running 3 live validation requests...');
    const results = [];
    
    for (let i = 0; i < 3; i++) {
        console.log(`Request ${i + 1}/3...`);
        try {
            const data = await fetchBetman();
            results.push({
                fetchTime: data.fetchTime,
                latencyMs: data.latencyMs,
                snapshotHash: data.snapshotHash,
                rowCount: data.rowCount
            });
            console.log(`Done. Latency: ${data.latencyMs}ms, Hash: ${data.snapshotHash}, Rows: ${data.rowCount}`);
        } catch (e) {
            console.error(`Error: ${e.message}`);
            results.push({ error: e.message });
        }
        
        if (i < 2) {
            console.log('Waiting 10 seconds...');
            await delay(10000);
        }
    }
    
    let changed = false;
    if (results.length === 3 && results[0].snapshotHash && results[1].snapshotHash && results[2].snapshotHash) {
        if (results[0].snapshotHash !== results[1].snapshotHash || results[1].snapshotHash !== results[2].snapshotHash) {
            changed = true;
            console.log('Market change detected in window!');
        } else {
            console.log('No market change detected in window.');
        }
    }
    
    fs.writeFileSync('reports/PHASE3_MARKET_FEED.md', `
# PHASE 3 MARKET FEED LIVE VALIDATION

## Results
\`\`\`json
${JSON.stringify(results, null, 2)}
\`\`\`

## Change Detection
${changed ? 'Market change detected in window!' : 'No market change detected in window (NOT a failure).'}
`);
    console.log('Saved to reports/PHASE3_MARKET_FEED.md');
    process.exit(0);
}

run();
