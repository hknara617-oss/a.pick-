'use strict';
/**
 * MLB External Data Source Gate
 * 목적: 외부 MLB 데이터가 안정적으로 수집 가능한지 확인
 *       - 픽 생성 금지
 *       - 숫자 모델 금지
 *       - 소스 접근성 / 스키마 / 레이턴시만 검증
 */
const https = require('https');
const http = require('http');
const fs = require('fs');

function fetchJson(url, opts = {}) {
    return new Promise((resolve, reject) => {
        const mod = url.startsWith('https') ? https : http;
        const req = mod.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; APick/0.1)',
                'Accept': 'application/json',
                ...opts.headers
            },
            timeout: 8000,
            rejectUnauthorized: false
        }, (res) => {
            let body = '';
            res.on('data', d => body += d);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, json: JSON.parse(body), raw: body });
                } catch(e) {
                    resolve({ status: res.statusCode, json: null, raw: body.slice(0, 200) });
                }
            });
        });
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    });
}

async function gate(name, fn) {
    const t0 = Date.now();
    try {
        const result = await fn();
        const ms = Date.now() - t0;
        console.log(`  ✅ ${name} [${ms}ms]`);
        return { name, pass: true, ms, ...result };
    } catch(e) {
        const ms = Date.now() - t0;
        console.log(`  ❌ ${name} [${ms}ms] — ${e.message}`);
        return { name, pass: false, ms, error: e.message };
    }
}

async function run() {
    console.log('=== MLB EXTERNAL DATA SOURCE GATE ===\n');
    const results = [];
    const TODAY = new Date().toISOString().slice(0, 10); // 2026-08-17
    // Note: MLB 2026 season — use current date
    const MLB_DATE = '2026-08-17';

    // ── 1. MLB Stats API (statsapi.mlb.com) ─────────────────────────────────
    console.log('[1] MLB Stats API (statsapi.mlb.com)');

    results.push(await gate('MLB schedule today', async () => {
        const r = await fetchJson(
            `https://statsapi.mlb.com/api/v1/schedule?sportId=1&date=${MLB_DATE}&hydrate=probablePitcher,linescore,team`
        );
        if (!r.json?.dates) throw new Error('No dates in response');
        const games = r.json.dates[0]?.games || [];
        return {
            gameCount: games.length,
            sample: games.slice(0, 3).map(g => ({
                gameId: g.gamePk,
                home: g.teams?.home?.team?.name,
                away: g.teams?.away?.team?.name,
                status: g.status?.detailedState,
                homePitcher: g.teams?.home?.probablePitcher?.fullName,
                awayPitcher: g.teams?.away?.probablePitcher?.fullName,
            })),
            schema: Object.keys(r.json.dates[0]?.games?.[0] || {}).slice(0, 20)
        };
    }));

    results.push(await gate('MLB team standings', async () => {
        const r = await fetchJson(
            `https://statsapi.mlb.com/api/v1/standings?leagueId=103,104&season=2026&standingsTypes=regularSeason`
        );
        if (!r.json?.records) throw new Error('No records');
        const al = r.json.records.find(rec => rec.league?.id === 103);
        return {
            totalDivisions: r.json.records.length,
            sampleTeam: al?.teamRecords?.[0]
                ? {
                    team: al.teamRecords[0].team?.name,
                    wins: al.teamRecords[0].wins,
                    losses: al.teamRecords[0].losses,
                    pct: al.teamRecords[0].winningPercentage
                  }
                : null
        };
    }));

    results.push(await gate('MLB team stats (batting)', async () => {
        const r = await fetchJson(
            `https://statsapi.mlb.com/api/v1/teams/stats?season=2026&group=hitting&stats=season&sportId=1`
        );
        if (!r.json?.stats?.[0]?.splits?.length < 1) throw new Error('No splits');
        const first = r.json.stats[0]?.splits?.[0];
        return {
            teamCount: r.json.stats[0]?.splits?.length,
            sampleTeam: first?.team?.name,
            sampleStats: first?.stat
                ? { avg: first.stat.avg, ops: first.stat.ops, runsScored: first.stat.runs }
                : null
        };
    }));

    results.push(await gate('MLB team stats (pitching)', async () => {
        const r = await fetchJson(
            `https://statsapi.mlb.com/api/v1/teams/stats?season=2026&group=pitching&stats=season&sportId=1`
        );
        const first = r.json?.stats?.[0]?.splits?.[0];
        return {
            teamCount: r.json?.stats?.[0]?.splits?.length,
            sampleTeam: first?.team?.name,
            sampleEra: first?.stat?.era
        };
    }));

    results.push(await gate('MLB game logs (team recent)', async () => {
        // Colorado Rockies teamId=27, look at last 10 games
        const r = await fetchJson(
            `https://statsapi.mlb.com/api/v1/teams/27/stats?stats=gameLog&group=hitting&season=2026&limit=10`
        );
        const splits = r.json?.stats?.[0]?.splits;
        return {
            recentGameCount: splits?.length,
            sample: splits?.slice(0, 2).map(s => ({
                date: s.date,
                opp: s.opponent?.name,
                runs: s.stat?.runs
            }))
        };
    }));

    results.push(await gate('MLB player stats (pitcher ERA)', async () => {
        // Get pitchers sorted by ERA for current season
        const r = await fetchJson(
            `https://statsapi.mlb.com/api/v1/stats/leaders?leaderCategories=era&season=2026&sportId=1&limit=5`
        );
        const leaders = r.json?.leagueLeaders?.[0]?.leaders;
        return {
            leaderCount: leaders?.length,
            top3: leaders?.slice(0, 3).map(l => ({
                name: l.person?.fullName,
                team: l.team?.name,
                era: l.value
            }))
        };
    }));

    results.push(await gate('MLB park factors (via statsapi)', async () => {
        // Park factors via venue info
        const r = await fetchJson(
            `https://statsapi.mlb.com/api/v1/venues?sportId=1`
        );
        return {
            venueCount: r.json?.venues?.length,
            sample: r.json?.venues?.slice(0, 3).map(v => ({
                id: v.id,
                name: v.name,
                city: v.location?.city
            }))
        };
    }));

    // ── 2. Baseball Reference (savant / statcast) ───────────────────────────
    console.log('\n[2] Baseball Savant (baseballsavant.mlb.com)');

    results.push(await gate('Baseball Savant pitcher statcast', async () => {
        const r = await fetchJson(
            `https://baseballsavant.mlb.com/leaderboard/expected_statistics?type=pitcher&year=2026&position=&team=&min=50&csv=false`
        );
        if (r.status !== 200) throw new Error(`HTTP ${r.status}`);
        const data = Array.isArray(r.json) ? r.json : r.json?.data;
        return {
            pitcherCount: data?.length,
            sampleFields: data?.[0] ? Object.keys(data[0]).slice(0, 10) : [],
            sample: data?.[0]
        };
    }));

    results.push(await gate('Baseball Savant pitcher game log', async () => {
        // Try fetching game log data
        const r = await fetchJson(
            `https://baseballsavant.mlb.com/statcast_search/csv?all=true&type=pitcher&player_type=pitcher&game_date_gt=${MLB_DATE}&game_date_lt=${MLB_DATE}&min_pitches=0&min_results=0&group_by=name&sort_col=pitches&player_event_sort=api_p_release_speed&sort_order=desc&limit=5&csv=false`
        );
        if (r.status === 403 || r.status === 429) throw new Error(`Blocked: HTTP ${r.status}`);
        return { status: r.status, hasData: !!r.json };
    }));

    // ── 3. ESPN API ──────────────────────────────────────────────────────────
    console.log('\n[3] ESPN API');

    results.push(await gate('ESPN MLB scoreboard', async () => {
        const r = await fetchJson(
            `https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard?dates=${MLB_DATE.replace(/-/g, '')}`
        );
        const events = r.json?.events;
        return {
            gameCount: events?.length,
            sample: events?.slice(0, 2).map(e => ({
                name: e.name,
                shortName: e.shortName,
                status: e.status?.type?.description,
                homeTeam: e.competitions?.[0]?.competitors?.find(c => c.homeAway === 'home')?.team?.displayName,
                awayTeam: e.competitions?.[0]?.competitors?.find(c => c.homeAway === 'away')?.team?.displayName,
            }))
        };
    }));

    results.push(await gate('ESPN MLB team injuries', async () => {
        const r = await fetchJson(
            `https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/teams/19/injuries` // NYY
        );
        return {
            status: r.status,
            injuryCount: r.json?.injuries?.length,
            sample: r.json?.injuries?.slice(0, 2).map(i => ({
                player: i.athlete?.displayName,
                status: i.status,
                detail: i.details?.detail
            }))
        };
    }));

    results.push(await gate('ESPN MLB team roster', async () => {
        const r = await fetchJson(
            `https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/teams/19/roster`
        );
        const pitchers = r.json?.athletes?.find(g => g.position === 'Pitcher');
        return {
            status: r.status,
            groups: r.json?.athletes?.map(g => g.position),
            pitcherCount: pitchers?.items?.length
        };
    }));

    // ── 4. API-baseball (rapid api alternative) ─────────────────────────────
    console.log('\n[4] Open Rapid-style endpoints');

    results.push(await gate('MLB live data (statsapi live)', async () => {
        // Get live game feed
        const schedR = await fetchJson(
            `https://statsapi.mlb.com/api/v1/schedule?sportId=1&date=${MLB_DATE}`
        );
        const games = schedR.json?.dates?.[0]?.games || [];
        if (games.length === 0) return { note: 'No games today (check date)' };
        const gamePk = games[0].gamePk;
        const r = await fetchJson(
            `https://statsapi.mlb.com/api/v1.1/game/${gamePk}/feed/live`
        );
        return {
            gamePk,
            status: r.json?.gameData?.status?.detailedState,
            homeTeam: r.json?.gameData?.teams?.home?.name,
            awayTeam: r.json?.gameData?.teams?.away?.name,
            weather: r.json?.gameData?.weather,
            venue: r.json?.gameData?.venue?.name,
            homePitcher: r.json?.gameData?.probablePitchers?.home?.fullName,
            awayPitcher: r.json?.gameData?.probablePitchers?.away?.fullName,
            liveFields: Object.keys(r.json?.liveData || {})
        };
    }));

    // ── Summary ──────────────────────────────────────────────────────────────
    const passed = results.filter(r => r.pass);
    const failed = results.filter(r => !r.pass);
    const total = results.length;

    console.log(`\n=== GATE SUMMARY: ${passed.length}/${total} PASS ===\n`);

    // Save detailed results
    fs.writeFileSync('./scratch/mlb_source_gate_raw.json', JSON.stringify(results, null, 2));

    return { results, passed, failed, total };
}

run().then(({ results, passed, failed, total }) => {
    // Build markdown report
    let md = `# MLB External Data Source Gate\n\n`;
    md += `> **실행시각:** ${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}\n`;
    md += `> **목적:** 외부 MLB 데이터 접근성/스키마 검증 — 픽 생성 금지\n\n`;
    md += `---\n\n`;
    md += `## Gate 결과: ${passed.length}/${total} PASS\n\n`;

    md += `| 소스 | 상태 | 레이턴시 | 비고 |\n|------|------|---------|------|\n`;
    for (const r of results) {
        const icon = r.pass ? '✅' : '❌';
        const note = r.pass
            ? JSON.stringify(r.gameCount ?? r.teamCount ?? r.leaderCount ?? r.pitcherCount ?? '').slice(0, 60)
            : r.error;
        md += `| ${r.name} | ${icon} | ${r.ms}ms | ${note} |\n`;
    }

    // Detailed pass results
    md += `\n---\n\n## 통과 소스 — 데이터 스키마\n\n`;
    for (const r of passed) {
        md += `### ${r.name}\n\n`;
        const printable = { ...r };
        delete printable.name;
        delete printable.pass;
        delete printable.ms;
        delete printable.error;
        md += `\`\`\`json\n${JSON.stringify(printable, null, 2).slice(0, 1000)}\n\`\`\`\n\n`;
    }

    if (failed.length > 0) {
        md += `---\n\n## 실패 소스\n\n`;
        for (const r of failed) {
            md += `- **${r.name}**: ${r.error}\n`;
        }
    }

    md += `\n---\n\n`;
    md += `## 데이터 분류\n\n`;
    md += `> 모든 수집값은 **EXTERNAL SPORTS DATA** 레이어 — Betman 데이터와 분리 유지\n\n`;
    md += `## 다음 단계\n\n`;
    md += `- [ ] 통과 소스 기반 MLB data adapter 설계\n`;
    md += `- [ ] starter, bullpen, offense, park, handedness, rest 필드 매핑\n`;
    md += `- [ ] Vig 제거 공식 구현\n`;
    md += `- [ ] fair probability model v0 설계\n`;
    md += `- [ ] edge + uncertainty haircut 산출\n`;
    md += `- [ ] **위 완료 전까지 픽 출력 금지**\n`;

    fs.writeFileSync('./reports/MLB_DATA_SOURCE_GATE.md', md);
    console.log('Saved: reports/MLB_DATA_SOURCE_GATE.md');
}).catch(e => { console.error(e); process.exit(1); });
