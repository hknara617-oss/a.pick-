'use strict';

/**
 * Betman probe v4 — correct JSON body + _sbmInfo wrapper
 * Based on requestClient.js analysis:
 *   contentType: "application/json; charset=UTF-8"
 *   data: JSON.stringify(params) where params includes _sbmInfo
 */
const https = require('https');
const fs = require('fs');

function httpsPost(path, body, headers) {
    return new Promise((resolve, reject) => {
        const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
        const options = {
            hostname: 'www.betman.co.kr',
            port: 443,
            path: path,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json; charset=UTF-8',
                'Content-Length': Buffer.byteLength(bodyStr, 'utf8'),
                'Accept': 'application/json, text/javascript, */*; q=0.01',
                'Accept-Language': 'ko-KR,ko;q=0.9',
                'X-Requested-With': 'XMLHttpRequest',
                'Origin': 'https://www.betman.co.kr',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
                ...headers
            },
            rejectUnauthorized: false
        };

        const req = https.request(options, (res) => {
            let chunks = [];
            res.on('data', c => chunks.push(c));
            res.on('end', () => resolve({
                status: res.statusCode,
                headers: res.headers,
                body: Buffer.concat(chunks).toString('utf8')
            }));
        });
        req.on('error', reject);
        req.write(bodyStr);
        req.end();
    });
}

function httpsGet(path, headers) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'www.betman.co.kr',
            port: 443,
            path: path,
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/138.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,*/*',
                ...headers
            },
            rejectUnauthorized: false
        };
        const req = https.request(options, (res) => {
            let chunks = [];
            res.on('data', c => chunks.push(c));
            res.on('end', () => resolve({
                status: res.statusCode,
                headers: res.headers,
                body: Buffer.concat(chunks).toString('utf8')
            }));
        });
        req.on('error', reject);
        req.end();
    });
}

async function probe() {
    console.log('=== BETMAN PROBE v4 — JSON body + _sbmInfo ===\n');

    // 1. Get session cookies
    let cookie = '';
    const mainRes = await httpsGet('/');
    const sc1 = mainRes.headers['set-cookie'] || [];
    if (sc1.length) cookie = sc1.map(c => c.split(';')[0]).join('; ');
    console.log(`[1] Cookie: ${cookie.slice(0, 100)}\n`);

    // 2. Build request body as JSON (like the browser does)
    const CANDIDATES = [260097, 260096, 260098, 260095];

    for (const gmTs of CANDIDATES) {
        console.log(`--- Trying gmTs=${gmTs} with JSON body ---`);

        // Match exactly what requestClient.requestPostMethod does
        const params = {
            gmId: 'G101',
            gmTs: String(gmTs),
            _sbmInfo: {
                _sbmInfo: {
                    debugMode: 'false'
                }
            }
        };

        try {
            const res = await httpsPost(
                '/buyPsblGame/gameInfoInq.do',
                params,
                { 
                    Cookie: cookie,
                    Referer: 'https://www.betman.co.kr/buyPsblGame/gameInfoView.do'
                }
            );

            console.log(`  HTTP ${res.status}, Length: ${res.body.length}`);
            console.log(`  First 300: ${res.body.slice(0, 300)}`);

            if (res.body.trim().startsWith('{') || res.body.trim().startsWith('[')) {
                const json = JSON.parse(res.body);
                console.log('\n✅ VALID JSON!\n');
                console.log('Top-level keys:', Object.keys(json));

                const lottery = json.currentLottery || json.gmInfo || json.lotteryInfo;
                if (lottery) {
                    console.log('\n## currentLottery:');
                    console.log(JSON.stringify(lottery, null, 2));
                }

                const schedules = json.compSchedules?.datas || [];
                console.log(`\n## compSchedules.datas: ${schedules.length} rows`);

                if (schedules.length > 0) {
                    const byType = {};
                    let slCount = 0;
                    for (const row of schedules) {
                        const gt = row.gameType || 'UNKNOWN';
                        byType[gt] = (byType[gt] || 0) + 1;
                        if (row.shortlistEligible) slCount++;
                    }
                    console.log('By gameType:', byType);
                    console.log('shortlistEligible count:', slCount);

                    console.log('\nFirst 5 rows:');
                    for (const row of schedules.slice(0, 5)) {
                        console.log(JSON.stringify({
                            matchSeq: row.matchSeq,
                            leagueNm: row.leagueNm,
                            homeNm: row.homeNm,
                            awayNm: row.awayNm,
                            gameType: row.gameType,
                            hdpValue: row.hdpValue,
                            winAllot: row.winAllot,
                            drawAllot: row.drawAllot,
                            loseAllot: row.loseAllot,
                            shortlistEligible: row.shortlistEligible
                        }));
                    }

                    const sl = schedules.filter(r => r.shortlistEligible);
                    if (sl.length) {
                        console.log(`\nshortlistEligible rows (${sl.length}):`);
                        for (const row of sl) {
                            console.log(JSON.stringify({
                                matchSeq: row.matchSeq,
                                leagueNm: row.leagueNm,
                                homeNm: row.homeNm,
                                awayNm: row.awayNm,
                                gameType: row.gameType,
                                hdpValue: row.hdpValue,
                                winAllot: row.winAllot,
                                drawAllot: row.drawAllot,
                                loseAllot: row.loseAllot
                            }, null, 2));
                        }
                    }
                }

                const ts = new Date().toISOString().replace(/[:.]/g, '-');
                const outPath = `./scratch/betman_v4_G101_${gmTs}_${ts}.json`;
                fs.writeFileSync(outPath, JSON.stringify(json, null, 2));
                console.log(`\n[Saved → ${outPath}]`);
                return;
            } else if (res.body.includes('errorArea') || res.body.includes('페이지 오류')) {
                console.log('  → Error page (endpoint exists but data unavailable for this gmTs)');
            } else if (res.body.includes('<html')) {
                console.log('  → HTML redirect/auth page');
                // Save to inspect
                fs.writeFileSync(`./scratch/probe_v4_resp_${gmTs}.html`, res.body);
            }
        } catch (e) {
            console.log(`  Error: ${e.message}`);
        }
    }

    // 3. Also try with form-encoded but different param format
    console.log('\n--- Also trying form-encoded with JSON string value ---');
    for (const gmTs of [260097, 260096]) {
        const res = await httpsPost(
            '/buyPsblGame/gameInfoInq.do',
            `{"gmId":"G101","gmTs":"${gmTs}","_sbmInfo":{"_sbmInfo":{"debugMode":"false"}}}`,
            {
                Cookie: cookie,
                'Content-Type': 'application/json; charset=UTF-8',
                Referer: 'https://www.betman.co.kr/buyPsblGame/gameInfoView.do'
            }
        );
        const preview = res.body.slice(0, 100).replace(/\s+/g, ' ');
        console.log(`  gmTs=${gmTs}: HTTP ${res.status} — ${preview}`);
        if (res.body.trim().startsWith('{')) {
            console.log('✅ JSON!');
            console.log(res.body.slice(0, 2000));
        }
    }
}

probe().catch(e => { console.error(e); process.exit(1); });
