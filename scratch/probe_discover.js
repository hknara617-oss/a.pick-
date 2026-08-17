'use strict';

/**
 * Betman endpoint discovery — JS 파일들에서 AJAX URL 패턴 추출
 */
const https = require('https');
const fs = require('fs');

function httpsGet(url, headers = {}) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const options = {
            hostname: urlObj.hostname,
            port: 443,
            path: urlObj.pathname + urlObj.search,
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/138.0.0.0 Safari/537.36',
                'Accept': '*/*',
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

async function discover() {
    console.log('=== BETMAN ENDPOINT DISCOVERY ===\n');

    let cookie = '';

    // 1. Get session
    const mainRes = await httpsGet('https://www.betman.co.kr/');
    const setCookie = mainRes.headers['set-cookie'] || [];
    if (setCookie.length) {
        cookie = setCookie.map(c => c.split(';')[0]).join('; ');
    }
    console.log(`[1] Session: ${cookie.slice(0, 80)}\n`);

    // 2. Fetch contents.path.js — this defines the URL paths
    console.log('[2] Fetching contents.path.js...');
    const pathJs = await httpsGet('https://www.betman.co.kr/js/contents.path.js', { Cookie: cookie });
    console.log(`    Status: ${pathJs.status}, Length: ${pathJs.body.length}`);
    if (pathJs.body.length < 10000) {
        console.log(pathJs.body.slice(0, 3000));
        fs.writeFileSync('./scratch/contents_path.js', pathJs.body);
    }

    // 3. Fetch requestClient.js — AJAX wrapper
    console.log('\n[3] Fetching requestClient.js...');
    const rcJs = await httpsGet('https://www.betman.co.kr/js/requestClient.js', { Cookie: cookie });
    console.log(`    Status: ${rcJs.status}, Length: ${rcJs.body.length}`);
    if (rcJs.body.length < 50000) {
        fs.writeFileSync('./scratch/requestClient.js', rcJs.body);
        // Extract .do patterns
        const doMatches = rcJs.body.match(/['"`][^'"`]*\.do[^'"`]*/g) || [];
        console.log('    .do patterns found:', doMatches.slice(0, 20));
    }

    // 4. Fetch BUICommon.js
    console.log('\n[4] Fetching BUICommon.js...');
    const buiJs = await httpsGet('https://www.betman.co.kr/js/BUICommon.js', { Cookie: cookie });
    console.log(`    Status: ${buiJs.status}, Length: ${buiJs.body.length}`);
    if (buiJs.body.length < 100000) {
        fs.writeFileSync('./scratch/BUICommon.js', buiJs.body);
    }

    // 5. Try to fetch the proto game HTML page directly (not via POST)
    console.log('\n[5] Fetching proto game page (GET)...');
    const protoPage = await httpsGet(
        'https://www.betman.co.kr/protoGame/protoGameMain.do',
        { Cookie: cookie }
    );
    console.log(`    Status: ${protoPage.status}, Length: ${protoPage.body.length}`);
    fs.writeFileSync('./scratch/proto_main.html', protoPage.body);

    // Extract AJAX calls from proto page HTML
    const ajaxMatches = protoPage.body.match(/['"`]([^'"`]*\.do[^'"`]*)['"` ]/g) || [];
    const uniqueAjax = [...new Set(ajaxMatches)].filter(m => m.includes('/'));
    console.log(`    AJAX .do URLs in HTML: ${uniqueAjax.slice(0, 30).join('\n    ')}`);

    // 6. Try the actual new endpoint path for game info
    const NEW_PATHS = [
        '/protoGame/gameInfo.do',
        '/protoGame/getGameInfo.do',
        '/protoGame/protoGameInfo.do',
        '/protoGame/protoGameInfoInq.do',
        '/protoGame/lotteryInfo.do',
        '/protoGame/gameSchedule.do',
        '/protoGame/protoSchedule.do',
        '/buyPsblGame/gameInfo.do',
        '/api/game/info',
        '/api/proto/info',
        '/buyPsblGame/getGameInfoInq.do',
    ];

    console.log('\n[6] Probing alternative endpoints (POST)...');
    for (const p of NEW_PATHS) {
        try {
            const r = await new Promise((resolve, reject) => {
                const body = 'gmId=G101&gmTs=260097';
                const req = https.request({
                    hostname: 'www.betman.co.kr',
                    port: 443,
                    path: p,
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Content-Length': Buffer.byteLength(body),
                        'Cookie': cookie,
                        'X-Requested-With': 'XMLHttpRequest',
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                        'Referer': 'https://www.betman.co.kr/protoGame/protoGameMain.do'
                    },
                    rejectUnauthorized: false
                }, (res) => {
                    let chunks = [];
                    res.on('data', c => chunks.push(c));
                    res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString('utf8') }));
                });
                req.on('error', reject);
                req.write(body);
                req.end();
            });

            const preview = r.body.slice(0, 60).replace(/\s+/g, ' ');
            const isJson = r.body.trim().startsWith('{') || r.body.trim().startsWith('[');
            console.log(`    ${p} → ${r.status} ${isJson ? '✅ JSON!' : ''} (${preview})`);

            if (isJson) {
                fs.writeFileSync(`./scratch/found_endpoint_response.json`, r.body);
                console.log('\n✅ FOUND JSON ENDPOINT! Saved to found_endpoint_response.json');
                console.log(JSON.parse(r.body));
            }
        } catch(e) {
            console.log(`    ${p} → Error: ${e.message}`);
        }
    }
}

discover().catch(e => { console.error(e); process.exit(1); });
