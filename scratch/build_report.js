'use strict';
const fs = require('fs');

const files = fs.readdirSync('./scratch').filter(f => f.includes('betman_v4_G101_260097'));
const json = JSON.parse(fs.readFileSync('./scratch/' + files[0], 'utf8'));
const { keys, datas } = json.compSchedules;
const rows = datas.map(d => {
    const obj = {};
    keys.forEach((k, j) => obj[k] = d[j]);
    return obj;
});

// Only status=2 (fully priced, not yet closed) + SGL eligible
const picks = rows.filter(r => r.protoStatus === '2' && r.sgl === '1' && r.buyReject === '0' && r.winAllot > 0);

// Group by matchSeq
const byMatch = {};
for (const row of picks) {
    const mkey = row.matchSeq + ':' + row.gameKey;
    if (!byMatch[mkey]) {
        byMatch[mkey] = {
            matchSeq: row.matchSeq,
            sport: row.itemCode,
            league: row.leagueName,
            home: row.homeName,
            away: row.awayName,
            gameDate: new Date(row.gameDate).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }),
            markets: {}
        };
    }
    byMatch[mkey].markets[row.betNm] = {
        winAllot: row.winAllot,
        drawAllot: row.drawAllot,
        loseAllot: row.loseAllot,
        handi: row.handi,
        winHandi: row.winHandi,
        loseHandi: row.loseHandi
    };
}

const matches = Object.values(byMatch);

// Output full table as Markdown
let md = `# 26097회차 배당표 (G101 프로토 승부식)\n\n`;
md += `> 수집시각: ${new Date().toLocaleString('ko-KR', {timeZone:'Asia/Seoul'})}  \n`;
md += `> 마감: 2026-08-18 23:00  \n`;
md += `> SGL 발매 대상 (status=2, priced) 경기만 표시\n\n`;
md += `---\n\n`;

// Group by sport
const soccer = matches.filter(m => m.sport === 'SC');
const baseball = matches.filter(m => m.sport === 'BS');

md += `## ⚽ 축구 (${soccer.length}경기)\n\n`;
for (const m of soccer) {
    const mk = m.markets;
    md += `### ${m.home} vs ${m.away}\n`;
    md += `**리그:** ${m.league} | **경기시간:** ${m.gameDate}\n\n`;
    md += `| 유형 | 승 | 무 | 패 | 비고 |\n|------|----|----|-----|------|\n`;
    
    if (mk['축구 승무패']) {
        const v = mk['축구 승무패'];
        md += `| 승무패 | ${v.winAllot} | ${v.drawAllot} | ${v.loseAllot} | |\n`;
    }
    if (mk['축구 핸디캡']) {
        const v = mk['축구 핸디캡'];
        md += `| 핸디캡 | ${v.winAllot} (${v.winHandi}) | - | ${v.loseAllot} (${v.loseHandi}) | 홈기준 |\n`;
    }
    if (mk['축구 언더오버']) {
        const v = mk['축구 언더오버'];
        md += `| 언더오버 | U ${v.winAllot} | - | O ${v.loseAllot} | 기준:${v.handi} |\n`;
    }
    if (mk['축구 SUM']) {
        const v = mk['축구 SUM'];
        md += `| SUM | ${v.winAllot} | - | ${v.loseAllot} | |\n`;
    }
    if (mk['축구 전반 승무패']) {
        const v = mk['축구 전반 승무패'];
        md += `| 전반 승무패 | ${v.winAllot} | ${v.drawAllot} | ${v.loseAllot} | |\n`;
    }
    if (mk['축구 전반 핸디캡']) {
        const v = mk['축구 전반 핸디캡'];
        md += `| 전반 핸디캡 | ${v.winAllot} (${v.winHandi}) | - | ${v.loseAllot} (${v.loseHandi}) | |\n`;
    }
    if (mk['축구 전반 언더오버']) {
        const v = mk['축구 전반 언더오버'];
        md += `| 전반 언더오버 | U ${v.winAllot} | - | O ${v.loseAllot} | 기준:${v.handi} |\n`;
    }
    md += `\n`;
}

md += `---\n\n## ⚾ 야구 (${baseball.length}경기)\n\n`;
for (const m of baseball) {
    const mk = m.markets;
    md += `### ${m.home} vs ${m.away}\n`;
    md += `**리그:** ${m.league} | **경기시간:** ${m.gameDate}\n\n`;
    md += `| 유형 | 승 | 무 | 패 | 비고 |\n|------|----|----|-----|------|\n`;
    
    if (mk['야구 승패']) {
        const v = mk['야구 승패'];
        md += `| 승패 | ${v.winAllot} | - | ${v.loseAllot} | |\n`;
    }
    if (mk['야구 승1패']) {
        const v = mk['야구 승1패'];
        md += `| 승1패 | ${v.winAllot} | ${v.drawAllot} | ${v.loseAllot} | |\n`;
    }
    if (mk['야구 핸디캡']) {
        const v = mk['야구 핸디캡'];
        md += `| 핸디캡 | ${v.winAllot} (${v.winHandi}) | - | ${v.loseAllot} (${v.loseHandi}) | 홈기준 |\n`;
    }
    if (mk['야구 언더오버']) {
        const v = mk['야구 언더오버'];
        md += `| 언더오버 | U ${v.winAllot} | - | O ${v.loseAllot} | 기준:${v.handi} |\n`;
    }
    if (mk['야구 SUM']) {
        const v = mk['야구 SUM'];
        md += `| SUM | ${v.winAllot} | ${v.drawAllot} | ${v.loseAllot} | |\n`;
    }
    if (mk['야구 전반 승무패']) {
        const v = mk['야구 전반 승무패'];
        md += `| 전반 승무패 | ${v.winAllot} | ${v.drawAllot} | ${v.loseAllot} | |\n`;
    }
    if (mk['야구 전반 핸디캡']) {
        const v = mk['야구 전반 핸디캡'];
        md += `| 전반 핸디캡 | ${v.winAllot} (${v.winHandi}) | - | ${v.loseAllot} (${v.loseHandi}) | |\n`;
    }
    if (mk['야구 전반 언더오버']) {
        const v = mk['야구 전반 언더오버'];
        md += `| 전반 언더오버 | U ${v.winAllot} | - | O ${v.loseAllot} | 기준:${v.handi} |\n`;
    }
    md += `\n`;
}

fs.writeFileSync('./reports/26097_full_odds.md', md);
console.log('Saved to reports/26097_full_odds.md');
console.log('Total priced+SGL matches:', matches.length, '(Soccer:', soccer.length, 'Baseball:', baseball.length + ')');

// Also print to console for review
console.log('\n=== SUMMARY ===');
console.log('\n[SOCCER]');
for (const m of soccer) {
    const mk = m.markets;
    const smh = mk['축구 승무패'];
    const handi = mk['축구 핸디캡'];
    const uo = mk['축구 언더오버'];
    console.log(m.league + ' | ' + m.home + ' vs ' + m.away + ' | ' + m.gameDate);
    if (smh) console.log('  승무패: 승' + smh.winAllot + ' 무' + smh.drawAllot + ' 패' + smh.loseAllot);
    if (handi) console.log('  핸디캡: 승' + handi.winAllot + '(H:' + handi.winHandi + ') 패' + handi.loseAllot + '(H:' + handi.loseHandi + ')');
    if (uo) console.log('  언더오버: U' + uo.winAllot + ' O' + uo.loseAllot + ' (기준:' + uo.handi + ')');
}
console.log('\n[BASEBALL]');
for (const m of baseball) {
    const mk = m.markets;
    const sp = mk['야구 승패'];
    const s1p = mk['야구 승1패'];
    const handi = mk['야구 핸디캡'];
    const uo = mk['야구 언더오버'];
    console.log(m.league + ' | ' + m.home + ' vs ' + m.away + ' | ' + m.gameDate);
    if (sp) console.log('  승패: 승' + sp.winAllot + ' 패' + sp.loseAllot);
    if (s1p) console.log('  승1패: 승' + s1p.winAllot + ' 무' + s1p.drawAllot + ' 패' + s1p.loseAllot);
    if (handi) console.log('  핸디캡: 승' + handi.winAllot + '(H:' + handi.winHandi + ') 패' + handi.loseAllot + '(H:' + handi.loseHandi + ')');
    if (uo) console.log('  언더오버: U' + uo.winAllot + ' O' + uo.loseAllot + ' (기준:' + uo.handi + ')');
}
