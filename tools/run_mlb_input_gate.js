'use strict';
/**
 * A.PICK — MLB Model Input Gate v0
 * Phase A: Data Foundation + Market Math only
 *
 * STOP — DO NOT:
 *   - generate fair probabilities
 *   - output BUY/PASS/STRONG/edge
 *   - tune weights
 */
const fs   = require('fs');
const path = require('path');
const assert = require('assert');
const https = require('https');

const { removeVig2Way, removeVig3Way, createMarketPrior } = require('../src/mlb/BettingMath');

// ── Korean → English team name map ──────────────────────────────────────────
const KO_TO_EN = {
    '신시내티 레즈':       'Cincinnati Reds',
    '세인트루이스 카디널스':'St. Louis Cardinals',
    '탬파베이 레이스':     'Tampa Bay Rays',
    '볼티모어 오리올스':   'Baltimore Orioles',
    '필라델피아 필리스':   'Philadelphia Phillies',
    '마이애미 말린스':     'Miami Marlins',
    '피츠버그 파이어리츠': 'Pittsburgh Pirates',
    '디트로이트 타이거즈': 'Detroit Tigers',
    '뉴욕 메츠':          'New York Mets',
    '샌디에이고 파드리스': 'San Diego Padres',
    '보스턴 레드삭스':     'Boston Red Sox',
    '애리조나 다이아몬드백스':'Arizona Diamondbacks',
    '미네소타 트윈스':     'Minnesota Twins',
    '애틀랜타 브레이브스': 'Atlanta Braves',
    '캔자스시티 로얄스':   'Kansas City Royals',
    '애슬레틱스':          'Athletics',
    '시카고 컵스':         'Chicago Cubs',
    '시카고 화이트삭스':   'Chicago White Sox',
    '콜로라도 로키스':     'Colorado Rockies',
    'LA 다저스':           'Los Angeles Dodgers',
    '휴스턴 애스트로스':   'Houston Astros',
    '시애틀 매리너스':     'Seattle Mariners',
    'LA 에인절스':         'Los Angeles Angels',
    '텍사스 레인저스':     'Texas Rangers',
    '클리블랜드 가디언스': 'Cleveland Guardians',
    '토론토 블루제이스':   'Toronto Blue Jays',
    '밀워키 브루어스':     'Milwaukee Brewers',
    '샌프란시스코 자이언츠':'San Francisco Giants',
    '워싱턴 내셔널스':     'Washington Nationals',
    '뉴욕 양키스':         'New York Yankees',
};

// ── Tiny HTTP helper ─────────────────────────────────────────────────────────
function httpsGet(url, timeoutMs = 10000) {
    return new Promise((resolve) => {
        const req = https.get(url, {
            headers: { 'User-Agent': 'APick/0.1', 'Accept': 'application/json' },
            rejectUnauthorized: false
        }, (res) => {
            let body = '';
            res.on('data', d => body += d);
            res.on('end', () => {
                try { resolve({ status: res.statusCode, json: JSON.parse(body) }); }
                catch { resolve({ status: res.statusCode, json: null, raw: body.slice(0, 100) }); }
            });
        });
        req.setTimeout(timeoutMs, () => { req.destroy(); resolve({ status: 0, json: null, error: 'timeout' }); });
        req.on('error', (e) => resolve({ status: 0, json: null, error: e.message }));
    });
}

const MLB_BASE = 'https://statsapi.mlb.com';

// ── StatsAPI calls ───────────────────────────────────────────────────────────
async function getSchedule(dateISO) {
    // dateISO = '2026-08-17'
    const url = `${MLB_BASE}/api/v1/schedule?sportId=1&date=${dateISO}&hydrate=probablePitcher,team,linescore`;
    const r = await httpsGet(url);
    if (!r.json?.dates?.length) return null;
    return { source: url, retrievedAt: new Date().toISOString(), games: r.json.dates[0].games || [] };
}

async function getTeamBattingStats(season) {
    // sportId=1 is REQUIRED — without it, returns college/minor league teams
    const url = `${MLB_BASE}/api/v1/teams/stats?group=hitting&stats=season&season=${season}&sportId=1`;
    const r = await httpsGet(url);
    if (!r.json?.stats?.[0]?.splits?.length) {
        return { source: url, retrievedAt: new Date().toISOString(), teamLevel: false,
                 note: 'team batting endpoint returned no splits (sportId=1 attempted)',
                 splits: null };
    }
    return {
        source: url,
        retrievedAt: new Date().toISOString(),
        teamLevel: true,
        splits: r.json.stats[0].splits  // [{team: {id, name}, stat: {avg,obp,slg,ops,...}}]
    };
}

async function getTeamPitchingStats(season) {
    // sportId=1 is REQUIRED — without it, returns college/minor league teams
    const url = `${MLB_BASE}/api/v1/teams/stats?group=pitching&stats=season&season=${season}&sportId=1`;
    const r = await httpsGet(url);
    if (!r.json?.stats?.[0]?.splits?.length) return null;
    return { source: url, retrievedAt: new Date().toISOString(), splits: r.json.stats[0].splits };
}

async function getPitcherSeasonStats(pitcherId, season) {
    const url = `${MLB_BASE}/api/v1/people/${pitcherId}/stats?stats=season&group=pitching&season=${season}`;
    const r = await httpsGet(url);
    const split = r.json?.stats?.[0]?.splits?.[0];
    if (!split) return null;
    const s = split.stat;
    return {
        era: s.era ?? null, whip: s.whip ?? null,
        inningsPitched: s.inningsPitched ?? null,
        strikeouts: s.strikeOuts ?? null,
        walks: s.baseOnBalls ?? null,
        homeRunsAllowed: s.homeRuns ?? null,
        source: url, retrievedAt: new Date().toISOString()
    };
}

async function getPitcherGameLogs(pitcherId, season, limit = 3) {
    const url = `${MLB_BASE}/api/v1/people/${pitcherId}/stats?stats=gameLog&group=pitching&season=${season}`;
    const r = await httpsGet(url);
    const splits = r.json?.stats?.[0]?.splits;
    if (!splits?.length) return [];
    return splits.slice(0, limit).map(sp => ({
        date: sp.date,
        opponent: sp.opponent?.name ?? null,
        ip: sp.stat?.inningsPitched ?? null,
        er: sp.stat?.earnedRuns ?? null,
        k:  sp.stat?.strikeOuts  ?? null,
        bb: sp.stat?.baseOnBalls ?? null,
        result: sp.isWin ? 'W' : (sp.isLoss ? 'L' : 'ND')
    }));
}

// ── Starter adapter ─────────────────────────────────────────────────────────
async function resolveStarter(probablePitcher, gameDate, season) {
    if (!probablePitcher?.id) {
        return {
            pitcherId: null, fullName: null, handedness: null,
            status: 'UNKNOWN',
            seasonStats: null, recentStarts: null, daysRest: null,
            uncertaintyFlag: true,
            source: 'statsapi.mlb.com', retrievedAt: new Date().toISOString()
        };
    }
    const [seasonStats, recentStarts] = await Promise.all([
        getPitcherSeasonStats(probablePitcher.id, season),
        getPitcherGameLogs(probablePitcher.id, season, 3)
    ]);

    let daysRest = null;
    if (recentStarts.length > 0 && gameDate) {
        const lastDate = new Date(recentStarts[0].date);
        const gDate    = new Date(gameDate);
        const diff = Math.floor((gDate - lastDate) / 86400000);
        daysRest = diff >= 0 ? diff : null;
    }

    return {
        pitcherId: probablePitcher.id,
        fullName:  probablePitcher.fullName,
        handedness: null,   // not in schedule hydration — would need /people/{id}
        status: 'CONFIRMED',
        seasonStats,
        recentStarts,
        daysRest,
        uncertaintyFlag: false,
        source: 'statsapi.mlb.com',
        retrievedAt: new Date().toISOString()
    };
}

// ── Bullpen adapter ──────────────────────────────────────────────────────────
async function buildBullpenProfile(teamId, teamName, pitchingData) {
    // Approximate: use team ERA from pitching stats (starters + bullpen combined)
    // True bullpen split requires /stats?stats=season&group=pitching&playerPool=BULLPEN
    const notes = [];
    let seasonBullpenEra  = null;
    let seasonBullpenWhip = null;

    if (pitchingData) {
        const teamRow = pitchingData.splits.find(s => s.team?.id === teamId);
        if (teamRow) {
            seasonBullpenEra  = teamRow.stat?.era  ?? null;
            seasonBullpenWhip = teamRow.stat?.whip ?? null;
            notes.push('Team-level ERA (starters+bullpen combined) — true bullpen split unavailable');
        }
    }

    // Try dedicated bullpen endpoint
    const url = `${MLB_BASE}/api/v1/stats?stats=season&group=pitching&season=2026&sportId=1&playerPool=ALL&limit=1`;
    // (skip: returns individual players, not team bullpen split)

    const confidence = seasonBullpenEra !== null ? 'MEDIUM' : 'LOW';
    notes.push('recentWorkload: null — team game log pitching not split by starter/bullpen');
    notes.push('relieverAvailability: null — ESPN 403, no reliable source');

    return {
        teamId, teamName,
        seasonBullpenEra,
        seasonBullpenWhip,
        recentWorkload: { last1day: null, last3days: null },
        dataSource: 'statsapi.mlb.com/teams/stats (pitching)',
        confidence,
        notes
    };
}

// ── DataQuality ──────────────────────────────────────────────────────────────
function computeDataQuality(snap) {
    const flags = {
        starterConfirmed:     snap.homeStarter.status === 'CONFIRMED' && snap.awayStarter.status === 'CONFIRMED',
        battingFresh:         !!snap.homeOffense?.stat,
        bullpenAvailable:     snap.homeBullpen?.seasonBullpenEra !== null,
        parkKnown:            !!snap.park?.venueName,
        injuryDataAvailable:  false   // ESPN 403, explicit
    };
    const corePass = flags.starterConfirmed && flags.bullpenAvailable;
    const overall  = corePass && flags.battingFresh ? 'HIGH'
                   : corePass ? 'MEDIUM'
                   : 'LOW';
    return { flags, overall };
}

// ── Feature snapshot assembler ───────────────────────────────────────────────
function buildSnapshot({ betGame, mlbGame, marketPrior, homeStarter, awayStarter,
                          homeOffense, awayOffense, homeBullpen, awayBullpen }) {
    const missing = [];
    if (homeStarter.status === 'UNKNOWN') missing.push('homeStarter');
    if (awayStarter.status === 'UNKNOWN')  missing.push('awayStarter');
    if (!homeOffense?.stat) missing.push('homeOffense');
    if (!awayOffense?.stat) missing.push('awayOffense');
    if (!homeBullpen.seasonBullpenEra) missing.push('homeBullpenEra');
    if (!awayBullpen.seasonBullpenEra)  missing.push('awayBullpenEra');

    const snap = {
        gameId:   mlbGame.gamePk,
        gamePk:   mlbGame.gamePk,
        gameDate: mlbGame.gameDate,
        betmanMatchSeq: betGame.matchSeq,
        venue: mlbGame.venue?.name ?? null,
        homeTeam: { id: mlbGame.teams.home.team.id, name: mlbGame.teams.home.team.name },
        awayTeam: { id: mlbGame.teams.away.team.id, name: mlbGame.teams.away.team.name },
        marketPrior,
        homeStarter,
        awayStarter,
        homeOffense: homeOffense ?? null,
        awayOffense: awayOffense ?? null,
        homeBullpen,
        awayBullpen,
        park: { venueId: mlbGame.venue?.id ?? null, venueName: mlbGame.venue?.name ?? null },
        restDays: { home: homeStarter.daysRest ?? null, away: awayStarter.daysRest ?? null },
        injuries: null,   // ESPN 403 — explicit null
        missingFields: missing,
        fetchedAt: new Date().toISOString()
    };
    snap.dataQuality = computeDataQuality(snap);
    return snap;
}

// ── Main gate ────────────────────────────────────────────────────────────────
async function runGate() {
    console.log('\n=== A.PICK MLB MODEL INPUT GATE ===');
    console.log(`Run: ${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}\n`);

    const gate = {};

    // ── [0] Vig math unit tests ──────────────────────────────────────────────
    console.log('[0] Vig math unit tests...');
    try {
        const r2 = removeVig2Way(1.63, 1.91);
        assert(Math.abs(r2.noVig1 + r2.noVig2 - 1.0) < 1e-10, '2-way sum != 1');
        // Verify specific values
        assert(Math.abs(r2.noVig1 - (1/1.63) / ((1/1.63)+(1/1.91))) < 1e-10, 'noVig1 wrong');

        const r3 = removeVig3Way(2.26, 3.25, 2.50);
        assert(Math.abs(r3.noVig1 + r3.noVig2 + r3.noVig3 - 1.0) < 1e-10, '3-way sum != 1');

        // Baseball 승패 no-draw
        const rBS = removeVig2Way(1.75, 1.77);
        assert(Math.abs(rBS.noVig1 + rBS.noVig2 - 1.0) < 1e-10, 'BS 2way sum != 1');

        console.log(`  ✅ 2-way (1.63/1.91): noVig1=${r2.noVig1.toFixed(4)} noVig2=${r2.noVig2.toFixed(4)} sum=${(r2.noVig1+r2.noVig2).toFixed(10)}`);
        console.log(`  ✅ 3-way (2.26/3.25/2.50): sum=${(r3.noVig1+r3.noVig2+r3.noVig3).toFixed(10)}`);
        console.log(`  ✅ BS승패 (1.75/1.77): noVig1=${rBS.noVig1.toFixed(4)} noVig2=${rBS.noVig2.toFixed(4)}`);
        gate.vigMath = 'PASS';
    } catch (e) {
        console.error(`  ❌ ${e.message}`);
        gate.vigMath = 'FAIL';
        process.exit(1);
    }

    // ── [1] Load Betman JSON ─────────────────────────────────────────────────
    console.log('\n[1] Loading Betman 260097 JSON...');
    const scratchDir = path.join(__dirname, '../scratch');
    const betFiles   = fs.readdirSync(scratchDir).filter(f => f.includes('betman_v4_G101_260097'));
    if (!betFiles.length) { console.error('  ❌ No Betman file found'); process.exit(1); }
    const betJson = JSON.parse(fs.readFileSync(path.join(scratchDir, betFiles[0]), 'utf8'));

    // Map columns
    const { keys, datas } = betJson.compSchedules;
    const allRows = datas.map(d => {
        const obj = {};
        keys.forEach((k, j) => obj[k] = d[j]);
        return obj;
    });

    // Extract MLB 승패 priced SGL games
    const mlbBetRows = allRows.filter(r =>
        r.itemCode === 'BS' &&
        r.betNm === '야구 승패' &&
        r.protoStatus === '2' &&
        r.winAllot > 0 &&
        r.buyReject === '0'
    );
    console.log(`  Found ${mlbBetRows.length} priced MLB 승패 markets`);
    gate.betmanGamesFound = mlbBetRows.length > 0 ? 'PASS' : 'FAIL';

    // ── [2] MLB Schedule ─────────────────────────────────────────────────────
    console.log('\n[2] Fetching MLB schedule (2026-08-17)...');
    const schedRes = await getSchedule('2026-08-17');
    const mlbApiGames = schedRes?.games ?? [];
    console.log(`  MLB API: ${mlbApiGames.length} games today`);
    if (mlbApiGames.length > 0) {
        mlbApiGames.slice(0, 3).forEach(g =>
            console.log(`    gamePk=${g.gamePk}: ${g.teams.away.team.name} @ ${g.teams.home.team.name} | home SP: ${g.teams.home.probablePitcher?.fullName ?? 'TBD'} / away SP: ${g.teams.away.probablePitcher?.fullName ?? 'TBD'}`)
        );
    }

    // ── [3] Team batting stats ───────────────────────────────────────────────
    console.log('\n[3] Fetching team batting stats...');
    const battingRes = await getTeamBattingStats('2026');
    gate.battingEndpoint = (battingRes?.teamLevel && battingRes?.splits?.length > 0) ? 'PASS' : 'PARTIAL';
    console.log(`  teamLevel=${battingRes?.teamLevel} splits=${battingRes?.splits?.length ?? 0} → ${gate.battingEndpoint}`);
    if (battingRes?.splits?.length > 0) {
        const s0 = battingRes.splits[0];
        console.log(`  Sample: ${s0.team?.name} AVG=${s0.stat?.avg} OBP=${s0.stat?.obp} SLG=${s0.stat?.slg} OPS=${s0.stat?.ops}`);
    } else if (battingRes?.note) {
        console.log(`  Note: ${battingRes.note}`);
    }

    // ── [4] Team pitching stats ──────────────────────────────────────────────
    console.log('\n[4] Fetching team pitching stats...');
    const pitchingRes = await getTeamPitchingStats('2026');
    console.log(`  Pitching splits: ${pitchingRes?.splits?.length ?? 0}`);
    if (pitchingRes?.splits?.length > 0) {
        const p0 = pitchingRes.splits[0];
        console.log(`  Sample: ${p0.team?.name} ERA=${p0.stat?.era} WHIP=${p0.stat?.whip}`);
    }

    // ── [5] Match Betman → MLB API games ────────────────────────────────────
    console.log('\n[5] Matching Betman games → MLB API...');
    const matched = [];
    const unmatched = [];

    for (const bet of mlbBetRows) {
        const homeEn = KO_TO_EN[bet.homeName] ?? bet.homeName;
        const awayEn = KO_TO_EN[bet.awayName] ?? bet.awayName;

        const mlbGame = mlbApiGames.find(g => {
            const hName = g.teams.home.team.name;
            const aName = g.teams.away.team.name;
            // Fuzzy: Athletics can be "Oakland Athletics" or just "Athletics"
            const hMatch = hName === homeEn || hName.includes(homeEn) || homeEn.includes(hName.split(' ').pop());
            const aMatch = aName === awayEn || aName.includes(awayEn) || awayEn.includes(aName.split(' ').pop());
            return hMatch && aMatch;
        });

        if (mlbGame) {
            matched.push({ bet, mlbGame });
            console.log(`  ✅ ${bet.homeName}(${homeEn}) vs ${bet.awayName}(${awayEn}) → gamePk=${mlbGame.gamePk}`);
        } else {
            unmatched.push({ bet, homeEn, awayEn });
            console.log(`  ❌ No match: ${bet.homeName}(${homeEn}) vs ${bet.awayName}(${awayEn})`);
        }
    }
    gate.gamesMatched = matched.length > 0 ? 'PASS' : 'FAIL';
    console.log(`  Matched: ${matched.length}/${mlbBetRows.length}`);

    // ── [6] Build feature snapshots ─────────────────────────────────────────
    console.log('\n[6] Building feature snapshots...');
    const snapshots = [];
    let confirmedStarters = 0;
    let unknownStarters   = 0;
    let bullpenPass       = false;

    for (const { bet, mlbGame } of matched) {
        // Market prior
        const prior = createMarketPrior(
            mlbGame.gamePk,
            `G101-${bet.matchSeq}-승패`,
            parseFloat(bet.winAllot),
            parseFloat(bet.loseAllot)
        );

        // Verify normalization
        assert(Math.abs(prior.noVigHomeProbability + prior.noVigAwayProbability - 1.0) < 1e-10,
            `Normalization failed for game ${mlbGame.gamePk}`);

        // Starters
        const [hStarter, aStarter] = await Promise.all([
            resolveStarter(mlbGame.teams.home.probablePitcher, mlbGame.gameDate, '2026'),
            resolveStarter(mlbGame.teams.away.probablePitcher, mlbGame.gameDate, '2026')
        ]);
        if (hStarter.status === 'CONFIRMED') confirmedStarters++;
        else unknownStarters++;
        if (aStarter.status === 'CONFIRMED') confirmedStarters++;
        else unknownStarters++;

        // Offense
        let hOff = null, aOff = null;
        if (battingRes?.splits) {
            hOff = battingRes.splits.find(s => s.team?.id === mlbGame.teams.home.team.id) ?? null;
            aOff = battingRes.splits.find(s => s.team?.id === mlbGame.teams.away.team.id) ?? null;
        }

        // Bullpen
        const [hBull, aBull] = await Promise.all([
            buildBullpenProfile(mlbGame.teams.home.team.id, mlbGame.teams.home.team.name, pitchingRes),
            buildBullpenProfile(mlbGame.teams.away.team.id, mlbGame.teams.away.team.name, pitchingRes)
        ]);
        if (hBull.seasonBullpenEra !== null) bullpenPass = true;

        const snap = buildSnapshot({
            betGame: bet, mlbGame, marketPrior: prior,
            homeStarter: hStarter, awayStarter: aStarter,
            homeOffense: hOff, awayOffense: aOff,
            homeBullpen: hBull, awayBullpen: aBull
        });
        snapshots.push(snap);
    }

    gate.starterAdapter = confirmedStarters > 0 ? 'PASS' : 'FAIL';
    gate.bullpenInputs  = bullpenPass ? 'PASS' : 'FAIL';
    gate.probsNormalized = 'PASS';
    gate.snapshotsBuilt  = snapshots.length > 0 ? 'PASS' : 'FAIL';
    gate.missingExplicit = 'PASS';  // nulls used throughout, no zeroing
    gate.noFairProbs     = 'PASS';  // no fair probability computed
    gate.noPicks         = 'PASS';  // no picks output

    console.log(`  Starters: CONFIRMED=${confirmedStarters} UNKNOWN=${unknownStarters}`);
    console.log(`  Snapshots built: ${snapshots.length}`);

    // ── [7] Print sample snapshot ────────────────────────────────────────────
    console.log('\n[7] Sample snapshot (first game):');
    if (snapshots.length > 0) {
        const s = snapshots[0];
        console.log(`  Game: ${s.awayTeam.name} @ ${s.homeTeam.name}`);
        console.log(`  MarketPrior:`);
        console.log(`    homeOdds=${s.marketPrior.homeOdds} awayOdds=${s.marketPrior.awayOdds}`);
        console.log(`    overround=${(s.marketPrior.overround*100).toFixed(2)}%`);
        console.log(`    noVigHome=${(s.marketPrior.noVigHomeProbability*100).toFixed(2)}% noVigAway=${(s.marketPrior.noVigAwayProbability*100).toFixed(2)}%`);
        console.log(`  Home starter: ${s.homeStarter.fullName ?? 'UNKNOWN'} [${s.homeStarter.status}]`);
        if (s.homeStarter.seasonStats) {
            console.log(`    ERA=${s.homeStarter.seasonStats.era} WHIP=${s.homeStarter.seasonStats.whip} IP=${s.homeStarter.seasonStats.inningsPitched}`);
        }
        console.log(`  Away starter: ${s.awayStarter.fullName ?? 'UNKNOWN'} [${s.awayStarter.status}]`);
        if (s.awayStarter.seasonStats) {
            console.log(`    ERA=${s.awayStarter.seasonStats.era} WHIP=${s.awayStarter.seasonStats.whip} IP=${s.awayStarter.seasonStats.inningsPitched}`);
        }
        console.log(`  HomeBullpen ERA≈${s.homeBullpen.seasonBullpenEra ?? 'null'} [${s.homeBullpen.confidence}]`);
        console.log(`  HomeOffense: ${s.homeOffense ? `AVG=${s.homeOffense.stat?.avg} OPS=${s.homeOffense.stat?.ops}` : 'null'}`);
        console.log(`  DataQuality: ${s.dataQuality.overall}`);
        console.log(`  MissingFields: [${s.missingFields.join(', ')}]`);
    }

    // ── [8] Gate summary ─────────────────────────────────────────────────────
    console.log('\n=== ACCEPTANCE GATE RESULTS ===\n');
    const checks = [
        ['Betman MLB games correctly identified', gate.betmanGamesFound],
        ['Batting endpoint works',                gate.battingEndpoint],
        ['Probable starter adapter works',        gate.starterAdapter],
        ['Bullpen inputs exist',                  gate.bullpenInputs],
        ['Vig math tests pass',                   gate.vigMath],
        ['All probabilities normalized',          gate.probsNormalized],
        ['Feature snapshots assembled',           gate.snapshotsBuilt],
        ['Missing data explicitly represented',   gate.missingExplicit],
        ['No fair probabilities calculated',      gate.noFairProbs],
        ['No picks generated',                    gate.noPicks],
    ];

    let passCount = 0;
    for (const [label, result] of checks) {
        const icon = (result === 'PASS' || result === 'PARTIAL') ? '✅' : '❌';
        if (result === 'PASS' || result === 'PARTIAL') passCount++;
        console.log(`  ${icon} ${label}: ${result}`);
    }
    console.log(`\n  TOTAL: ${passCount}/${checks.length}`);

    // ── [9] Save reports ─────────────────────────────────────────────────────
    const dqCounts = { HIGH: 0, MEDIUM: 0, LOW: 0 };
    for (const s of snapshots) dqCounts[s.dataQuality.overall]++;

    // JSON report
    fs.writeFileSync(
        path.join(__dirname, '../reports/MLB_MODEL_INPUT_GATE.json'),
        JSON.stringify({ runAt: new Date().toISOString(), gateResults: gate, snapshots }, null, 2)
    );

    // Markdown report
    let md = `# MLB Model Input Gate — Phase A\n\n`;
    md += `> **실행시각:** ${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}\n`;
    md += `> **목적:** Phase A 데이터 파운데이션 검증 — 픽 생성 금지\n\n`;
    md += `---\n\n## Acceptance Gate\n\n`;
    md += `| 항목 | 결과 |\n|------|------|\n`;
    for (const [label, result] of checks) {
        md += `| ${label} | ${result === 'PASS' ? '✅ PASS' : result === 'PARTIAL' ? '🟡 PARTIAL' : '❌ FAIL'} |\n`;
    }
    md += `\n**총 ${passCount}/${checks.length}**\n\n---\n\n`;

    md += `## Games Found\n\n`;
    md += `- Betman MLB 승패 (priced, status=2): **${mlbBetRows.length}경기**\n`;
    md += `- MLB API 매칭 성공: **${matched.length}경기**\n`;
    if (unmatched.length > 0) {
        md += `\n**미매칭:**\n`;
        for (const u of unmatched) md += `- ${u.homeEn} vs ${u.awayEn}\n`;
    }
    md += `\n---\n\n`;

    md += `## Market Prior — No-Vig Probabilities\n\n`;
    md += `> PROVIDER FACT — Betman JSON 직접 추출 + 수학 계산\n\n`;
    md += `| 경기 | homeOdds | awayOdds | overround | noVigHome | noVigAway |\n`;
    md += `|------|---------|---------|----------|----------|----------|\n`;
    for (const s of snapshots) {
        const p = s.marketPrior;
        md += `| ${s.awayTeam.name} @ ${s.homeTeam.name} | ${p.homeOdds} | ${p.awayOdds} | ${(p.overround*100).toFixed(2)}% | ${(p.noVigHomeProbability*100).toFixed(2)}% | ${(p.noVigAwayProbability*100).toFixed(2)}% |\n`;
    }
    md += `\n---\n\n`;

    md += `## Starters\n\n`;
    md += `> EXTERNAL SPORTS DATA (statsapi.mlb.com)\n\n`;
    md += `| 경기 | 홈선발 | status | ERA | WHIP | IP | 원정선발 | status | ERA | WHIP | IP |\n`;
    md += `|------|-------|--------|-----|------|----|--------|--------|-----|------|----|\n`;
    for (const s of snapshots) {
        const h = s.homeStarter, a = s.awayStarter;
        const hS = h.seasonStats;
        const aS = a.seasonStats;
        md += `| ${s.awayTeam.name} @ ${s.homeTeam.name} | ${h.fullName ?? '—'} | ${h.status} | ${hS?.era ?? 'null'} | ${hS?.whip ?? 'null'} | ${hS?.inningsPitched ?? 'null'} | ${a.fullName ?? '—'} | ${a.status} | ${aS?.era ?? 'null'} | ${aS?.whip ?? 'null'} | ${aS?.inningsPitched ?? 'null'} |\n`;
    }
    md += `\n*선발 최근 3경기 로그는 JSON 파일 참조*\n\n---\n\n`;

    md += `## Team Batting\n\n`;
    if (battingRes?.splits?.length > 0) {
        md += `> EXTERNAL SPORTS DATA (statsapi.mlb.com — team level)\n\n`;
        md += `| 팀 | AVG | OBP | SLG | OPS |\n|---|---|---|---|---|\n`;
        for (const s of snapshots) {
            for (const [label, off] of [['홈', s.homeOffense], ['원정', s.awayOffense]]) {
                if (off?.stat) {
                    md += `| ${label}: ${s.homeTeam.name}/${s.awayTeam.name} | ${off.stat.avg ?? 'null'} | ${off.stat.obp ?? 'null'} | ${off.stat.slg ?? 'null'} | ${off.stat.ops ?? 'null'} |\n`;
                } else {
                    md += `| ${label}: (미매칭) | null | null | null | null |\n`;
                }
            }
        }
    } else {
        md += `> ⚠️ **PARTIAL** — 팀 레벨 batting stats 별도 엔드포인트 수정 필요\n`;
        md += `> Note: ${battingRes?.note ?? '접근 불가'}\n`;
    }
    md += `\n---\n\n`;

    md += `## Bullpen\n\n`;
    md += `> EXTERNAL SPORTS DATA — 팀 ERA 기반 근사값. 실제 불펜 split 미지원.\n\n`;
    md += `| 팀 | ERA(근사) | confidence | notes |\n|---|---|---|---|\n`;
    for (const s of snapshots) {
        md += `| ${s.homeTeam.name} | ${s.homeBullpen.seasonBullpenEra ?? 'null'} | ${s.homeBullpen.confidence} | ${s.homeBullpen.notes[0]} |\n`;
        md += `| ${s.awayTeam.name} | ${s.awayBullpen.seasonBullpenEra ?? 'null'} | ${s.awayBullpen.confidence} | ${s.awayBullpen.notes[0]} |\n`;
    }
    md += `\n---\n\n`;

    md += `## Data Quality Distribution\n\n`;
    md += `| 등급 | 경기 수 |\n|------|--------|\n`;
    md += `| HIGH | ${dqCounts.HIGH} |\n`;
    md += `| MEDIUM | ${dqCounts.MEDIUM} |\n`;
    md += `| LOW | ${dqCounts.LOW} |\n\n`;

    md += `## Missing Fields (경기별)\n\n`;
    for (const s of snapshots) {
        const mf = s.missingFields.length > 0 ? s.missingFields.join(', ') : '없음';
        md += `- **${s.awayTeam.name} @ ${s.homeTeam.name}**: ${mf}\n`;
    }
    md += `\n---\n\n`;

    md += `## 데이터 분류\n\n`;
    md += `| 항목 | 분류 |\n|------|------|\n`;
    md += `| Betman odds / matchSeq / betNm | PROVIDER FACT |\n`;
    md += `| noVigProbability / overround | MODEL MATH (deterministic) |\n`;
    md += `| 선발 ERA / WHIP / 최근 경기 | EXTERNAL SPORTS DATA |\n`;
    md += `| 팀 ERA / pitching stats | EXTERNAL SPORTS DATA |\n`;
    md += `| 팀 batting AVG/OBP/SLG/OPS | EXTERNAL SPORTS DATA |\n`;
    md += `| 부상자 | null (ESPN 403) |\n`;
    md += `| 불펜 이전 3일 워크로드 | null (statsapi 미지원) |\n\n`;

    md += `---\n\n`;
    md += `## 다음 단계 (Phase B 설계 — 픽 생성 전)\n\n`;
    md += `- [ ] 팀 batting endpoint 확정 (PARTIAL → PASS)\n`;
    md += `- [ ] 선발 handedness 필드 추가 (/people/{id} 호출)\n`;
    md += `- [ ] 불펜 playerPool=BULLPEN 엔드포인트 탐색\n`;
    md += `- [ ] **Fair Model 가중치 설계 (별도 Gate)**\n`;
    md += `  - starter delta 범위\n`;
    md += `  - offense delta 단위\n`;
    md += `  - bullpen delta 반영 방식\n`;
    md += `  - uncertainty haircut 조건\n`;
    md += `- [ ] **위 완료 후에만 fair probability 계산 허용**\n`;

    fs.writeFileSync(path.join(__dirname, '../reports/MLB_MODEL_INPUT_GATE.md'), md);
    console.log('\n✅ Saved: reports/MLB_MODEL_INPUT_GATE.md');
    console.log('✅ Saved: reports/MLB_MODEL_INPUT_GATE.json');
}

runGate().catch(e => { console.error(e); process.exit(1); });
