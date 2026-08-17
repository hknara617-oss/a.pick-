'use strict';
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'betman_v4_G101_260097_2026-08-17T03-35-01-620Z.json');
const json = JSON.parse(fs.readFileSync(file, 'utf8'));
const { keys, datas } = json.compSchedules;

const rows = datas.map(d => {
    const obj = {};
    keys.forEach((k, i) => obj[k] = d[i]);
    return obj;
}).filter(r => r.itemCode === 'SC' && (Number(r.winAllot) > 0 || Number(r.loseAllot) > 0));

console.log('TOTAL SOCCER PRICED ROWS:', rows.length);

const leagues = {};
rows.forEach(r => {
    leagues[r.leagueName] = (leagues[r.leagueName] || 0) + 1;
});
console.log('LEAGUES:', leagues);

const matchMap = new Map();
rows.forEach(r => {
    const key = `${r.leagueName} | ${r.homeName} vs ${r.awayName}`;
    if (!matchMap.has(key)) {
        matchMap.set(key, {
            league: r.leagueName,
            home: r.homeName,
            away: r.awayName,
            gameDate: new Date(Number(r.gameDate)).toISOString(),
            endDate: new Date(Number(r.endDate)).toISOString(),
            stadium: r.meetStadiumFullName,
            markets: []
        });
    }
    matchMap.get(key).markets.push({
        type: r.betNm,
        win: r.winAllot,
        draw: r.drawAllot,
        lose: r.loseAllot
    });
});

console.log('\n--- UNIQUE SOCCER MATCHES (' + matchMap.size + ' matches) ---');
let i = 1;
for (const [k, m] of matchMap.entries()) {
    console.log(`${i++}. [${m.league}] ${m.home} vs ${m.away} (${m.stadium || '구장 미지정'})`);
    console.log(`   시간: ${m.gameDate} (마감: ${m.endDate})`);
    m.markets.forEach(mk => console.log(`   - ${mk.type}: 홈 ${mk.win} / 무 ${mk.draw} / 원정 ${mk.lose}`));
}
