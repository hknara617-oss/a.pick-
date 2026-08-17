'use strict';

/**
 * Betman Live Probe — gmTs=260097
 * Fetches G101 gameInfoInq.do and extracts:
 *   - currentLottery round/year/status
 *   - all priced markets (event, league, marketType, line, winAllot/drawAllot/loseAllot)
 *   - shortlistEligible flag
 */

async function probe() {
    console.log('=== BETMAN PROBE: G101 / gmTs=260097 ===\n');

    const CANDIDATES = [260097, 260098, 260096];

    for (const gmTs of CANDIDATES) {
        console.log(`--- Trying gmTs=${gmTs} ---`);
        try {
            const res = await fetch('https://www.betman.co.kr/buyPsblGame/gameInfoInq.do', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                    'Referer': 'https://www.betman.co.kr/'
                },
                body: `gmId=G101&gmTs=${gmTs}`
            });

            if (!res.ok) {
                console.log(`  HTTP ${res.status} — skip`);
                continue;
            }

            const text = await res.text();
            let json;
            try {
                json = JSON.parse(text);
            } catch (e) {
                console.log(`  Non-JSON response (${text.slice(0, 80)}) — skip`);
                continue;
            }

            // ── currentLottery ──────────────────────────────────────────────
            const lottery = json.currentLottery || json.gmInfo || null;
            if (!lottery) {
                console.log('  No currentLottery field — skip');
                continue;
            }

            console.log('\n✅ Valid response found!\n');
            console.log('## currentLottery');
            console.log(JSON.stringify(lottery, null, 2));

            // ── compSchedules rows ───────────────────────────────────────────
            const schedules = json.compSchedules?.datas || [];
            if (schedules.length === 0) {
                console.log('\n[!] compSchedules.datas is empty.');
            } else {
                console.log(`\n## Markets (${schedules.length} rows total)\n`);

                // Group by gameType for summary
                const byType = {};
                let shortlistCount = 0;

                for (const row of schedules) {
                    const gt = row.gameType || row.gmId || 'UNKNOWN';
                    if (!byType[gt]) byType[gt] = [];
                    byType[gt].push(row);
                    if (row.shortlistEligible === true || row.shortlistEligible === 'Y') shortlistCount++;
                }

                // Print type summary
                console.log('### Market Type Summary');
                for (const [type, rows] of Object.entries(byType)) {
                    console.log(`  ${type}: ${rows.length} rows`);
                }
                console.log(`  shortlistEligible=true: ${shortlistCount}`);

                // Print first 10 rows in detail
                console.log('\n### First 10 rows (full fields)');
                const SAMPLE = schedules.slice(0, 10);
                for (const row of SAMPLE) {
                    const { 
                        matchSeq, leagueNm, homeNm, awayNm, 
                        gameType, hdpType, hdpValue,
                        winAllot, drawAllot, loseAllot,
                        shortlistEligible,
                        ...rest 
                    } = row;
                    console.log(JSON.stringify({
                        matchSeq, leagueNm, homeNm, awayNm,
                        gameType, hdpType, hdpValue,
                        winAllot, drawAllot, loseAllot,
                        shortlistEligible
                    }, null, 2));
                }

                // Print all shortlistEligible rows
                const shortlist = schedules.filter(r => 
                    r.shortlistEligible === true || r.shortlistEligible === 'Y'
                );
                if (shortlist.length > 0) {
                    console.log(`\n### shortlistEligible rows (${shortlist.length})`);
                    for (const row of shortlist) {
                        console.log(JSON.stringify({
                            matchSeq: row.matchSeq,
                            leagueNm: row.leagueNm,
                            homeNm: row.homeNm,
                            awayNm: row.awayNm,
                            gameType: row.gameType,
                            hdpType: row.hdpType,
                            hdpValue: row.hdpValue,
                            winAllot: row.winAllot,
                            drawAllot: row.drawAllot,
                            loseAllot: row.loseAllot,
                            shortlistEligible: row.shortlistEligible
                        }, null, 2));
                    }
                }
            }

            // Save raw JSON
            const fs = await import('fs');
            const ts = new Date().toISOString().replace(/[:.]/g, '-');
            const outPath = `./scratch/betman_probe_G101_${gmTs}_${ts}.json`;
            fs.writeFileSync(outPath, JSON.stringify(json, null, 2));
            console.log(`\n[Saved raw JSON to ${outPath}]`);

            return; // success — stop trying further gmTs
        } catch (e) {
            console.error(`  Error: ${e.message}`);
        }
    }

    console.error('\n❌ All gmTs candidates failed. No valid response.');
}

probe().catch(e => { console.error(e); process.exit(1); });
