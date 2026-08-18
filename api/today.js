'use strict';

const https = require('https');

// Fetch the pre-built betman-live.json from our own public directory
// This file is auto-updated by the local server and pushed to GitHub
function fetchStaticData(host) {
    return new Promise((resolve, reject) => {
        const opts = {
            hostname: host,
            path: '/betman-live.json',
            timeout: 8000
        };
        const req = https.get(opts, r => {
            const chunks = [];
            r.on('data', c => chunks.push(c));
            r.on('end', () => {
                try {
                    resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
                } catch (e) {
                    reject(new Error('JSON parse failed: ' + e.message));
                }
            });
        });
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    });
}

// Parse raw Betman compSchedules JSON into clean market objects
function parseMarkets(json) {
    try {
        const { keys, datas } = json.compSchedules;
        const rows = datas.map(d => {
            const obj = {};
            keys.forEach((k, j) => obj[k] = d[j]);
            return obj;
        });

        const now = Date.now();
        // Filter ONLY active, open, upcoming markets (마감 전 발매 중인 경기만)
        let pricedRows = rows.filter(r =>
            (Number(r.winAllot) > 0 || Number(r.loseAllot) > 0) &&
            r.buyReject === '0' &&
            Number(r.endDate) > now
        );

        // If all rows in snapshot are past, fallback to open priced rows
        if (pricedRows.length === 0) {
            pricedRows = rows.filter(r =>
                (Number(r.winAllot) > 0 || Number(r.loseAllot) > 0) && r.buyReject === '0'
            );
        }

        // Sort by deadline ascending (가장 임박한 경기부터)
        pricedRows.sort((a, b) => Number(a.endDate) - Number(b.endDate));

        const roundId = pricedRows[0]?.gmRound || '260097';

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

        const markets = pricedRows.map(row => ({
            marketId: `${row.gmId}_${row.gmRound}_${row.sportsGameId || row.gameId || Math.random()}`,
            roundId: row.gmRound || roundId,
            sport: row.itemCode === 'BS' ? 'BASEBALL' : row.itemCode === 'SC' ? 'SOCCER' : row.itemCode,
            league: row.leagueName || (row.itemCode === 'BS' ? 'KBO' : '축구'),
            marketName: row.betNm || '승무패',
            homeName: row.homeName || '홈팀',
            awayName: row.awayName || '원정팀',
            winOdds: Number(row.winAllot) || 0,
            drawOdds: Number(row.drawAllot) || 0,
            loseOdds: Number(row.loseAllot) || 0,
            handi: row.handi || null,
            gameDateMs: Number(row.gameDate),
            endDateMs: Number(row.endDate),
            gameDateFormatted: formatKST(row.gameDate),
            endDateFormatted: formatKST(row.endDate),
            status: 'OPEN',
            provenance: 'LIVE_BETMAN'
        }));

        return { roundId, markets, totalCount: markets.length };
    } catch (e) {
        return { roundId: '260097', markets: [], totalCount: 0, error: e.message };
    }
}

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Cache-Control', 'no-store, max-age=0');

    if (req.method === 'OPTIONS') { res.statusCode = 200; res.end(); return; }

    try {
        // Read from our own bundled static data (updated via GitHub push)
        const host = req.headers.host || 'a-pick.vercel.app';
        const json = await fetchStaticData(host);
        const { roundId, markets, totalCount } = parseMarkets(json);

        res.setHeader('Content-Type', 'application/json');
        res.statusCode = 200;
        res.end(JSON.stringify({
            currentRound: roundId,
            totalLiveCount: totalCount,
            asOf: new Date().toISOString(),
            markets,
            isFallback: false,
            source: 'STATIC_BUNDLED'
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
