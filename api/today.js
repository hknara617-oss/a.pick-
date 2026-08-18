'use strict';

const https = require('https');

// Follow redirects, maintain cookies across requests
function httpGet(url, cookieJar = {}, redirectCount = 0) {
    return new Promise((resolve, reject) => {
        if (redirectCount > 5) return reject(new Error('Too many redirects'));

        const parsed = new URL(url);
        const cookieStr = Object.entries(cookieJar).map(([k,v]) => `${k}=${v}`).join('; ');

        const options = {
            hostname: parsed.hostname,
            path: parsed.pathname + parsed.search,
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Linux; Android 13; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
                'Accept': 'application/json, text/javascript, */*; q=0.01',
                'Accept-Language': 'ko-KR,ko;q=0.9',
                'Referer': 'https://www.betman.co.kr/',
                'X-Requested-With': 'XMLHttpRequest',
                ...(cookieStr ? { 'Cookie': cookieStr } : {})
            },
            timeout: 12000
        };

        const req = https.request(options, (res) => {
            // Collect Set-Cookie headers
            const setCookies = res.headers['set-cookie'] || [];
            setCookies.forEach(c => {
                const part = c.split(';')[0];
                const [k, v] = part.split('=');
                if (k && v) cookieJar[k.trim()] = v.trim();
            });

            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                const nextUrl = res.headers.location.startsWith('http')
                    ? res.headers.location
                    : `https://${parsed.hostname}${res.headers.location}`;
                res.resume();
                return resolve(httpGet(nextUrl, cookieJar, redirectCount + 1));
            }

            const chunks = [];
            res.on('data', c => chunks.push(c));
            res.on('end', () => {
                resolve({
                    status: res.statusCode,
                    body: Buffer.concat(chunks).toString('utf8'),
                    cookies: cookieJar
                });
            });
        });

        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
        req.end();
    });
}

async function fetchBetmanRound() {
    const cookieJar = {};

    // Step 1: Visit main page to get session cookie
    try {
        await httpGet('https://www.betman.co.kr/main/mainPage/gmb/initGMBView.do?gmId=G101', cookieJar);
    } catch (_) { /* ignore — just need the cookie */ }

    // Step 2: Fetch actual schedule API with session cookie
    const res = await httpGet(
        'https://www.betman.co.kr/app/appContents/gameArea/gmSchedule.do?gmId=G101&divId=1',
        cookieJar
    );

    if (res.status !== 200) {
        throw new Error(`Betman returned HTTP ${res.status}`);
    }

    const json = JSON.parse(res.body);
    if (!json.compSchedules) throw new Error('compSchedules missing in response');
    return json;
}

// Parse raw Betman rows into clean market objects
function parseMarkets(json) {
    try {
        const { keys, datas } = json.compSchedules;
        const rows = datas.map(d => {
            const obj = {};
            keys.forEach((k, j) => obj[k] = d[j]);
            return obj;
        });

        const pricedRows = rows.filter(r =>
            (Number(r.winAllot) > 0 || Number(r.loseAllot) > 0) && r.buyReject === '0'
        );

        const roundId = pricedRows[0]?.gmRound || '알 수 없음';

        const markets = pricedRows.map(row => {
            const sportCode = row.itemCode === 'BS' ? 'BASEBALL' : row.itemCode === 'SC' ? 'SOCCER' : row.itemCode;

            const formatKST = (ms) => {
                if (!ms) return '–';
                try {
                    const d = new Date(Number(ms));
                    const month = d.getUTCMonth() + 1;
                    const date = d.getUTCDate();
                    let hours = d.getUTCHours() + 9;
                    const mins = String(d.getUTCMinutes()).padStart(2, '0');
                    if (hours >= 24) hours -= 24;
                    return `${month}/${date} ${String(hours).padStart(2,'0')}:${mins}`;
                } catch (_) { return '–'; }
            };

            return {
                marketId: `${row.gmId}_${row.gmRound}_${row.sportsGameId || row.gameId || Math.random()}`,
                roundId: row.gmRound || roundId,
                sport: sportCode,
                league: sportCode === 'BASEBALL' ? 'MLB' : 'MLS',
                marketName: row.betNm || '승무패',
                homeName: row.homeName || '홈팀',
                awayName: row.awayName || '원정팀',
                winOdds: Number(row.winAllot) || 0,
                drawOdds: Number(row.drawAllot) || 0,
                loseOdds: Number(row.loseAllot) || 0,
                handi: row.handi || null,
                gameDateFormatted: formatKST(row.gameDate),
                endDateFormatted: formatKST(row.endDate),
                status: 'OPEN',
                provenance: 'LIVE_BETMAN'
            };
        });

        return { roundId, markets, totalCount: markets.length };
    } catch (e) {
        return { roundId: 'PARSE_ERR', markets: [], totalCount: 0, error: e.message };
    }
}

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Cache-Control', 'no-store, max-age=0');

    if (req.method === 'OPTIONS') { res.statusCode = 200; res.end(); return; }

    try {
        const json = await fetchBetmanRound();
        const { roundId, markets, totalCount } = parseMarkets(json);

        res.setHeader('Content-Type', 'application/json');
        res.statusCode = 200;
        res.end(JSON.stringify({
            currentRound: roundId,
            totalLiveCount: totalCount,
            asOf: new Date().toISOString(),
            markets,
            isFallback: false
        }));
    } catch (err) {
        res.setHeader('Content-Type', 'application/json');
        res.statusCode = 200;
        res.end(JSON.stringify({
            currentRound: '260097',
            totalLiveCount: 0,
            asOf: new Date().toISOString(),
            markets: [],
            isFallback: true,
            fetchError: err.message
        }));
    }
};
