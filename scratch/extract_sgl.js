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

// protoStatus: 1=배당공지(open), 2=배당공지, 3=마감임박, 4=마감
// sgl=1 = single-game eligible (shortlist)
const available = rows.filter(r => r.sgl === '1');
console.log('sgl=1 count:', available.length);

// Also check protoStatus distribution within sgl=1
const byStatus = {};
for (const r of available) {
    byStatus[r.protoStatus] = (byStatus[r.protoStatus] || 0) + 1;
}
console.log('protoStatus in sgl=1:', byStatus);

// Group by matchSeq+gameKey
const byMatch = {};
for (const row of available) {
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
        protoStatus: row.protoStatus
    });
}

const matches = Object.values(byMatch);
console.log('Unique sgl=1 matches:', matches.length);
console.log('\n=== ALL SGL=1 MATCHES WITH FULL ODDS ===\n');

for (const m of matches) {
    console.log('[' + m.sport + '] ' + m.league + ' | ' + m.home + ' vs ' + m.away + ' | ' + m.gameDate + ' | status:' + m.protoStatus);
    for (const mk of m.markets) {
        let line = '  ' + mk.betNm + ': ';
        if (mk.betNm.includes('핸디캡')) {
            line += '승' + mk.winAllot + '(hdp:' + mk.winHandi + ') 패' + mk.loseAllot + '(hdp:' + mk.loseHandi + ')';
        } else if (mk.betNm.includes('언더오버')) {
            line += 'U(승)' + mk.winAllot + ' O(패)' + mk.loseAllot + ' (기준:' + mk.handi + ')';
        } else if (mk.betNm.includes('SUM')) {
            line += '승' + mk.winAllot + ' 무' + mk.drawAllot + ' 패' + mk.loseAllot;
        } else if (mk.betNm.includes('승패') || mk.betNm.includes('승무패')) {
            line += '승' + mk.winAllot + ' 무' + (mk.drawAllot !== 0 ? mk.drawAllot : '-') + ' 패' + mk.loseAllot;
        } else if (mk.betNm.includes('승1패') || mk.betNm.includes('승N패')) {
            line += '승' + mk.winAllot + ' 무' + mk.drawAllot + ' 패' + mk.loseAllot;
        } else {
            line += '승' + mk.winAllot + ' 무' + mk.drawAllot + ' 패' + mk.loseAllot;
        }
        line += ' [status:' + mk.protoStatus + ']';
        console.log(line);
    }
    console.log('');
}
