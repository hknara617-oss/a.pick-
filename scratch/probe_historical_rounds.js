'use strict';
const https = require('https');

function fetchBetman(gmTs) {
    return new Promise((resolve) => {
        const body = JSON.stringify({
            _sbmInfo: { _sbmInfo: { debugMode: 'false' } },
            gmTs: String(gmTs),
            gmId: 'G101',
            gmOsId: 'G101',
            tgmYn: 'N'
        });
        const opts = {
            hostname: 'www.betman.co.kr',
            path: '/main/mainPage/gameView/gameInfoInq.do',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json; charset=UTF-8',
                'Content-Length': Buffer.byteLength(body),
                'User-Agent': 'Mozilla/5.0',
                'Referer': 'https://www.betman.co.kr/',
                'Origin': 'https://www.betman.co.kr'
            },
            rejectUnauthorized: false
        };
        const req = https.request(opts, (res) => {
            let data = '';
            res.on('data', d => data += d);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    const datas = json?.compSchedules?.datas;
                    resolve({ gmTs, rows: datas?.length ?? 0, ok: !!datas });
                } catch {
                    resolve({ gmTs, rows: 0, ok: false, err: 'parse' });
                }
            });
        });
        req.setTimeout(8000, () => { req.destroy(); resolve({ gmTs, rows: 0, ok: false, err: 'timeout' }); });
        req.on('error', e => resolve({ gmTs, rows: 0, ok: false, err: e.message }));
        req.write(body);
        req.end();
    });
}

async function probe() {
    console.log('=== Betman Historical Round Probe ===\n');
    const current = 260097;
    const toProbe = [];
    // Probe 260097 down to 260080
    for (let i = 1; i <= 20; i++) toProbe.push(current - i);

    const found = [];
    let batchSize = 4;
    for (let i = 0; i < toProbe.length; i += batchSize) {
        const batch = toProbe.slice(i, i + batchSize);
        const results = await Promise.all(batch.map(fetchBetman));
        for (const r of results) {
            const icon = r.ok && r.rows > 0 ? '✅' : '❌';
            console.log(`  ${icon} gmTs=${r.gmTs}: ${r.ok ? r.rows + ' rows' : r.err ?? 'no data'}`);
            if (r.ok && r.rows > 0) found.push({ gmTs: r.gmTs, rows: r.rows });
        }
        await new Promise(res => setTimeout(res, 300));
    }
    console.log(`\nFound ${found.length} accessible historical rounds:`, found);
}

probe().catch(console.error);
