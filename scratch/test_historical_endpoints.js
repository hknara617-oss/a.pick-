'use strict';
const https = require('https');

function post(path, body) {
    return new Promise((resolve) => {
        const payload = JSON.stringify(body);
        const req = https.request({
            hostname: 'www.betman.co.kr',
            path,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json; charset=UTF-8',
                'Content-Length': Buffer.byteLength(payload),
                'User-Agent': 'Mozilla/5.0'
            },
            rejectUnauthorized: false
        }, (res) => {
            let d = '';
            res.on('data', c => d += c);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, data: JSON.parse(d) });
                } catch (e) {
                    resolve({ status: res.statusCode, raw: d.slice(0, 200) });
                }
            });
        });
        req.setTimeout(8000, () => { req.destroy(); resolve({ status: 0, error: 'timeout' }); });
        req.on('error', e => resolve({ status: 0, error: e.message }));
        req.write(payload);
        req.end();
    });
}

async function testEndpoints() {
    console.log('Testing Betman historical inquiry endpoints...\n');

    // 1. inquireSportsScores.do
    const r1 = await post('/matchinfo/inquireSportsScores.do', {
        _sbmInfo: { _sbmInfo: { debugMode: 'false' } },
        gmTs: '260096',
        gmId: 'G101'
    });
    console.log('1. /matchinfo/inquireSportsScores.do:', r1.status, JSON.stringify(r1.data || r1.raw || r1.error).slice(0, 300));

    // 2. inqAllot.do with more params
    const r2 = await post('/matchinfo/inqAllot.do', {
        _sbmInfo: { _sbmInfo: { debugMode: 'false' } },
        gmTs: '260096',
        gmId: 'G101',
        gmOsId: 'G101'
    });
    console.log('2. /matchinfo/inqAllot.do:', r2.status, JSON.stringify(r2.data || r2.raw || r2.error).slice(0, 300));

    // 3. inquireDetailedGameScore.do
    const r3 = await post('/matchinfo/inquireDetailedGameScore.do', {
        _sbmInfo: { _sbmInfo: { debugMode: 'false' } },
        gmTs: '260096',
        gmId: 'G101'
    });
    console.log('3. /matchinfo/inquireDetailedGameScore.do:', r3.status, JSON.stringify(r3.data || r3.raw || r3.error).slice(0, 300));
}

testEndpoints().catch(console.error);
