'use strict';

const https = require('https');

// Fetch live Betman proto round data directly from Betman API
function fetchBetmanRound() {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'www.betman.co.kr',
            path: '/app/appContents/gameArea/gmSchedule.do?gmId=G101&divId=1',
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
                'Accept': 'application/json, text/plain, */*',
                'Accept-Language': 'ko-KR,ko;q=0.9',
                'Referer': 'https://www.betman.co.kr/',
                'Origin': 'https://www.betman.co.kr'
            },
            timeout: 8000
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(new Error('Betman JSON parse failed: ' + e.message));
                }
            });
        });

        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('Betman API timeout')); });
        req.end();
    });
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
