'use strict';

/**
 * Betman probe v3 — inspect the HTML redirect page + try alternative endpoints
 */
const https = require('https');
const fs = require('fs');

function httpsRequest(method, url, body, extraHeaders) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const options = {
            hostname: urlObj.hostname,
            port: 443,
            path: urlObj.pathname + urlObj.search,
            method: method,
            headers: {
                'Accept': 'application/json, text/html, */*',
                'Accept-Language': 'ko-KR,ko;q=0.9',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
                ...extraHeaders
            },
            rejectUnauthorized: false
        };

        if (body) {
            options.headers['Content-Type'] = 'application/x-www-form-urlencoded';
            options.headers['Content-Length'] = Buffer.byteLength(body);
        }

        const req = https.request(options, (res) => {
            let chunks = [];
            res.on('data', chunk => chunks.push(chunk));
            res.on('end', () => {
                resolve({
                    status: res.statusCode,
                    headers: res.headers,
                    body: Buffer.concat(chunks).toString('utf8')
                });
            });
        });
        req.on('error', reject);
        if (body) req.write(body);
        req.end();
    });
}

async function probe() {
    console.log('=== BETMAN PROBE v3 ===\n');

    // Step 1: Get initial session
    console.log('[1] Getting initial session...');
    let cookie = '';
    const mainRes = await httpsRequest('GET', 'https://www.betman.co.kr/', '', {});
    const setCookie = mainRes.headers['set-cookie'] || [];
    if (setCookie.length) {
        cookie = setCookie.map(c => c.split(';')[0]).join('; ');
        console.log(`    Cookie: ${cookie.slice(0, 100)}`);
    }
    console.log(`    Main page status: ${mainRes.status}`);

    // Step 2: Follow to proto game page
    console.log('\n[2] Fetching proto game page...');
    const protoRes = await httpsRequest('GET', 
        'https://www.betman.co.kr/protoGame/protoGameMain.do',
        '', 
        { Cookie: cookie }
    );
    const newCookies = protoRes.headers['set-cookie'] || [];
    if (newCookies.length) {
        const additional = newCookies.map(c => c.split(';')[0]).join('; ');
        cookie = cookie + '; ' + additional;
    }
    console.log(`    Status: ${protoRes.status}, cookie len: ${cookie.length}`);

    // Step 3: Try the gameInfoInq endpoint with current gmTs probe
    const CANDIDATES = [260097, 260096];
    
    for (const gmTs of CANDIDATES) {
        console.log(`\n[3] POST gameInfoInq.do gmTs=${gmTs}...`);
        const postRes = await httpsRequest(
            'POST',
            'https://www.betman.co.kr/buyPsblGame/gameInfoInq.do',
            `gmId=G101&gmTs=${gmTs}`,
            {
                Cookie: cookie,
                Referer: 'https://www.betman.co.kr/protoGame/protoGameMain.do',
                'X-Requested-With': 'XMLHttpRequest',
                Origin: 'https://www.betman.co.kr'
            }
        );
        console.log(`    Status: ${postRes.status}, Length: ${postRes.body.length}`);

        // Save full response to inspect
        const outPath = `./scratch/probe_v3_resp_${gmTs}.html`;
        fs.writeFileSync(outPath, postRes.body);
        console.log(`    Saved to ${outPath}`);

        if (postRes.body.trim().startsWith('{')) {
            const json = JSON.parse(postRes.body);
            console.log('\n✅ JSON response!');
            console.log('Keys:', Object.keys(json));
            console.log(JSON.stringify(json.currentLottery || json.gmInfo, null, 2));
            return;
        } else {
            // Show key parts of HTML to understand what block is happening
            const html = postRes.body;
            const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
            const metaRefresh = html.match(/content=["'][^"']*url=([^"']+)["']/i);
            const jsRedirect = html.match(/location\.href\s*=\s*['"]([^'"]+)['"]/i);
            console.log(`    Title: ${titleMatch?.[1]}`);
            console.log(`    Meta refresh: ${metaRefresh?.[1]}`);
            console.log(`    JS redirect: ${jsRedirect?.[1]}`);
        }
    }

    // Step 4: Try alternative AJAX paths
    console.log('\n[4] Trying alternative AJAX endpoints...');
    const ALT_PATHS = [
        '/protoGame/gameInfoInq.do',
        '/proto/gameInfoInq.do', 
        '/common/gameInfoInq.do',
        '/buyPsblGame/lotteryGameInfoInq.do',
        '/buyPsblGame/protoInfoInq.do'
    ];
    
    for (const path of ALT_PATHS) {
        try {
            const res = await httpsRequest(
                'POST',
                `https://www.betman.co.kr${path}`,
                `gmId=G101&gmTs=260097`,
                { Cookie: cookie, 'X-Requested-With': 'XMLHttpRequest' }
            );
            if (res.status !== 404 && res.body.trim().startsWith('{')) {
                console.log(`✅ Found JSON at ${path}`);
                console.log(res.body.slice(0, 500));
            } else {
                console.log(`    ${path} → ${res.status} (${res.body.startsWith('<') ? 'HTML' : res.body.slice(0,40)})`);
            }
        } catch(e) {
            console.log(`    ${path} → Error: ${e.message}`);
        }
    }
}

probe().catch(e => { console.error(e); process.exit(1); });
