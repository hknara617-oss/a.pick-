'use strict';

/**
 * Betman probe v2 — full browser-like headers + session cookie attempt
 */
const https = require('https');
const fs = require('fs');

function httpsPost(url, body, headers) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const options = {
            hostname: urlObj.hostname,
            port: 443,
            path: urlObj.pathname + urlObj.search,
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(body),
                'Accept': 'application/json, text/plain, */*',
                'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive',
                'Origin': 'https://www.betman.co.kr',
                'Referer': 'https://www.betman.co.kr/buyPsblGame/gameInfoView.do?gmId=G101',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
                'X-Requested-With': 'XMLHttpRequest',
                ...headers
            },
            rejectUnauthorized: false  // bypass SSL issues
        };

        const req = https.request(options, (res) => {
            let chunks = [];
            res.on('data', chunk => chunks.push(chunk));
            res.on('end', () => {
                const buf = Buffer.concat(chunks);
                resolve({
                    status: res.statusCode,
                    headers: res.headers,
                    body: buf.toString('utf8'),
                    rawBuf: buf
                });
            });
        });
        req.on('error', reject);
        req.write(body);
        req.end();
    });
}

async function probe() {
    console.log('=== BETMAN PROBE v2: G101 — gmTs candidates ===\n');

    // Step 1: Get session cookie by hitting main page first
    let cookie = '';
    try {
        console.log('[0] Fetching main page for session cookie...');
        const mainRes = await new Promise((resolve, reject) => {
            const req = https.get({
                hostname: 'www.betman.co.kr',
                path: '/buyPsblGame/gameInfoView.do?gmId=G101',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/138.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'ko-KR,ko;q=0.9'
                },
                rejectUnauthorized: false
            }, (res) => {
                let body = '';
                res.on('data', d => body += d);
                res.on('end', () => resolve({ headers: res.headers, body }));
            });
            req.on('error', reject);
        });

        const setCookie = mainRes.headers['set-cookie'];
        if (setCookie) {
            cookie = setCookie.map(c => c.split(';')[0]).join('; ');
            console.log(`  Got cookie: ${cookie.slice(0, 80)}...`);
        } else {
            console.log('  No cookie received from main page.');
        }
    } catch (e) {
        console.log(`  Main page fetch failed: ${e.message}`);
    }

    const CANDIDATES = [260097, 260096, 260095, 260098];

    for (const gmTs of CANDIDATES) {
        console.log(`\n--- Trying gmTs=${gmTs} ---`);
        try {
            const body = `gmId=G101&gmTs=${gmTs}`;
            const extraHeaders = cookie ? { 'Cookie': cookie } : {};

            const result = await httpsPost(
                'https://www.betman.co.kr/buyPsblGame/gameInfoInq.do',
                body,
                extraHeaders
            );

            console.log(`  HTTP ${result.status}`);
            console.log(`  Response length: ${result.body.length} chars`);
            console.log(`  First 200 chars: ${result.body.slice(0, 200)}`);

            // Try parse
            let json;
            try {
                json = JSON.parse(result.body);
            } catch (e) {
                // Check if it's HTML (redirect/login)
                if (result.body.includes('<!DOCTYPE') || result.body.includes('<html')) {
                    console.log('  → HTML response (session/auth redirect)');
                } else {
                    console.log(`  → Parse error: ${e.message}`);
                }
                continue;
            }

            // ── Valid JSON ───────────────────────────────────────────────────
            console.log('\n✅ Valid JSON found!\n');

            const lottery = json.currentLottery || json.gmInfo || json.lotteryInfo || null;
            console.log('## currentLottery / top-level keys:');
            console.log(Object.keys(json));

            if (lottery) {
                console.log('\n## Lottery Info:');
                console.log(JSON.stringify(lottery, null, 2));
            }

            const schedules = json.compSchedules?.datas || [];
            console.log(`\n## compSchedules rows: ${schedules.length}`);

            if (schedules.length > 0) {
                // Summary by gameType
                const byType = {};
                let shortlistCount = 0;
                for (const row of schedules) {
                    const gt = row.gameType || row.gmId || 'UNKNOWN';
                    byType[gt] = (byType[gt] || 0) + 1;
                    if (row.shortlistEligible === true || row.shortlistEligible === 'Y' || row.shortlistEligible === 1) {
                        shortlistCount++;
                    }
                }
                console.log('\n### By gameType:');
                for (const [k, v] of Object.entries(byType)) console.log(`  ${k}: ${v}`);
                console.log(`  shortlistEligible count: ${shortlistCount}`);

                // Print first 5 rows
                console.log('\n### Sample rows (first 5):');
                for (const row of schedules.slice(0, 5)) {
                    console.log(JSON.stringify(row, null, 2));
                }

                // All shortlist rows
                const sl = schedules.filter(r =>
                    r.shortlistEligible === true || r.shortlistEligible === 'Y' || r.shortlistEligible === 1
                );
                if (sl.length) {
                    console.log(`\n### shortlistEligible rows (${sl.length}):`);
                    for (const row of sl) {
                        console.log(JSON.stringify({
                            matchSeq: row.matchSeq,
                            leagueNm: row.leagueNm,
                            homeNm: row.homeNm,
                            awayNm: row.awayNm,
                            gameType: row.gameType,
                            hdpType: row.hdpType,
                            hdpValue: row.hdpValue,
                            winAllot: row.winAllot,
                            drawAllot: row.drawAllot,
                            loseAllot: row.loseAllot,
                            shortlistEligible: row.shortlistEligible
                        }, null, 2));
                    }
                }
            }

            // Save raw
            const ts = new Date().toISOString().replace(/[:.]/g, '-');
            const outPath = `./scratch/betman_live_G101_${gmTs}_${ts}.json`;
            fs.writeFileSync(outPath, JSON.stringify(json, null, 2));
            console.log(`\n[Saved → ${outPath}]`);
            return;

        } catch (e) {
            console.log(`  Error: ${e.message}`);
        }
    }

    console.error('\n❌ All candidates failed.');
    process.exit(1);
}

probe().catch(e => { console.error(e); process.exit(1); });
