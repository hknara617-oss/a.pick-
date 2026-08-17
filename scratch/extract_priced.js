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

// protoStatus 의미 분석
// status=2 = 배당 공시 완료 (winAllot > 0)
// status=1 = 배당 미공시
// status=3 = 마감임박
// status=4 = 마감

// 실배당 있는 행 = winAllot > 0
const priced = rows.filter(r => (r.winAllot > 0 || r.loseAllot > 0) && r.buyReject === '0');
console.log('Priced rows (winAllot>0 or loseAllot>0, buyReject=0):', priced.length);

// protoStatus breakdown of priced
const byStatus = {};
for (const r of priced) byStatus[r.protoStatus] = (byStatus[r.protoStatus] || 0) + 1;
console.log('protoStatus in priced:', byStatus);

// sgl breakdown
const bySgl = {};
for (const r of priced) bySgl[r.sgl] = (bySgl[r.sgl] || 0) + 1;
console.log('sgl in priced:', bySgl);

// Group priced rows by matchSeq+gameKey
const byMatch = {};
for (const row of priced) {
    const mkey = row.matchSeq + ':' + row.gameKey;
    if (!byMatch[mkey]) {
        byMatch[mkey] = {
            matchSeq: row.matchSeq,
            sport: row.itemCode,
            league: row.leagueName,
            home: row.homeName,
            away: row.awayName,
            gameDate: new Date(row.gameDate).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }),
            protoStatus: row.protoStatus,
            sgl: row.sgl,
            markets: []
        };
    }
    byMatch[mkey].markets.push({
        betId: row.betId,
        betNm: row.betNm,
        winAllot: row.winAllot,
        drawAllot: row.drawAllot,
        loseAllot: row.loseAllot,
        handi: row.handi,
        winHandi: row.winHandi,
        loseHandi: row.loseHandi,
        protoStatus: row.protoStatus,
        sgl: row.sgl
    });
}

const matches = Object.values(byMatch).sort((a,b) => {
    // Sort by gameDate
    return new Date(a.gameDate) - new Date(b.gameDate);
});
console.log('\nPriced unique matches:', matches.length);

console.log('\n=== ALL PRICED MATCHES ===\n');
for (const m of matches) {
    const sglMark = m.sgl === '1' ? ' [SGL]' : '';
    console.log('[' + m.sport + '] ' + m.league + ' | ' + m.home + ' vs ' + m.away);
    console.log('  경기시간: ' + m.gameDate + ' | status:' + m.protoStatus + sglMark);
    for (const mk of m.markets) {
        const mkSgl = mk.sgl === '1' ? '[SGL]' : '';
        let line = '  ' + mkSgl + ' ' + mk.betNm + ': ';
        if (mk.betNm.includes('핸디캡')) {
            line += '승' + mk.winAllot + '(hdp:' + mk.winHandi + ') 패' + mk.loseAllot + '(hdp:' + mk.loseHandi + ')';
        } else if (mk.betNm.includes('언더오버')) {
            line += 'U(승)' + mk.winAllot + ' O(패)' + mk.loseAllot + ' 기준:' + mk.handi;
        } else if (mk.betNm.includes('SUM')) {
            line += '승' + mk.winAllot + ' 무' + mk.drawAllot + ' 패' + mk.loseAllot;
        } else {
            line += '승' + mk.winAllot + ' 무' + (mk.drawAllot !== 0 ? mk.drawAllot : '-') + ' 패' + mk.loseAllot;
        }
        console.log(line);
    }
    console.log('');
}
