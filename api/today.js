'use strict';

const https = require('https');

// Multiple Betman API endpoints to try in order
const BETMAN_ENDPOINTS = [
    { hostname: 'www.betman.co.kr', path: '/app/appContents/gameArea/gmSchedule.do?gmId=G101&divId=1' },
    { hostname: 'www.betman.co.kr', path: '/api/schedule/G101/1' },
];

function fetchUrl(hostname, path, timeoutMs = 12000) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname,
            path,
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Linux; Android 13; SM-G981B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36',
                'Accept': 'application/json, text/javascript, */*; q=0.01',
                'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
                'Accept-Encoding': 'gzip, deflate, br',
                'Referer': 'https://www.betman.co.kr/main/mainPage/gmb/initGMBView.do?gmId=G101',
                'X-Requested-With': 'XMLHttpRequest',
                'Connection': 'keep-alive',
            },
            timeout: timeoutMs
        };

        const req = https.request(options, (res) => {
            const chunks = [];
            res.on('data', chunk => chunks.push(chunk));
            res.on('end', () => {
                const body = Buffer.concat(chunks).toString('utf8');
                try {
                    resolve(JSON.parse(body));
                } catch (e) {
                    reject(new Error(`Betman JSON parse failed (${res.statusCode}): ` + body.substring(0, 100)));
                }
            });
        });

        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
        req.end();
    });
}

// Fetch live Betman proto round data — tries multiple endpoints
async function fetchBetmanRound() {
    let lastErr;
    for (const ep of BETMAN_ENDPOINTS) {
        try {
            const json = await fetchUrl(ep.hostname, ep.path, 12000);
            if (json && json.compSchedules) return json;
        } catch (e) {
            lastErr = e;
        }
    }
    throw lastErr || new Error('All Betman endpoints failed');
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

        const roundMatch = json.roundId || (rows[0] && rows[0].gmRound) || '알 수 없음';

        const pricedRows = rows.filter(r =>
            (Number(r.winAllot) > 0 || Number(r.loseAllot) > 0) && r.buyReject === '0'
        );

        const markets = pricedRows.map(row => {
            const sportCode = row.itemCode === 'BS' ? 'BASEBALL' : row.itemCode === 'SC' ? 'SOCCER' : row.itemCode;
            const winOdds = Number(row.winAllot) || 0;
            const drawOdds = Number(row.drawAllot) || 0;
            const loseOdds = Number(row.loseAllot) || 0;

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
                marketId: `${row.gmId}_${row.gmRound}_${row.sportsGameId || row.gameId}`,
                roundId: row.gmRound || roundMatch,
                sport: sportCode,
                league: sportCode === 'BASEBALL' ? 'MLB' : 'MLS',
                marketName: row.betNm || '승무패',
                homeName: row.homeName || '홈팀',
                awayName: row.awayName || '원정팀',
                winOdds,
                drawOdds,
                loseOdds,
                handi: row.handi || null,
                gameDateFormatted: formatKST(row.gameDate),
                endDateFormatted: formatKST(row.endDate),
                status: row.buyReject === '0' ? 'OPEN' : 'CLOSED',
                provenance: 'LIVE_BETMAN'
            };
        });

        return { roundId: roundMatch, markets, totalCount: markets.length };
    } catch (e) {
        return { roundId: 'PARSE_ERR', markets: [], totalCount: 0, error: e.message };
    }
}

// Fallback demo data if Betman is unreachable (shows app works)
function fallbackData() {
    const now = new Date();
    return {
        roundId: '260097',
        isFallback: true,
        message: '베트맨 서버 연결 일시 불가 — 잠시 후 자동 갱신됩니다',
        totalLiveCount: 0,
        asOf: now.toISOString(),
        markets: []
    };
}

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Cache-Control', 'no-store, max-age=0');

    if (req.method === 'OPTIONS') {
        res.statusCode = 200;
        res.end();
        return;
    }

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
        // Betman unreachable → return fallback gracefully
        const fb = fallbackData();
        fb.fetchError = err.message;
        res.setHeader('Content-Type', 'application/json');
        res.statusCode = 200;
        res.end(JSON.stringify(fb));
    }
};
