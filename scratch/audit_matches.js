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
}).filter(r => (Number(r.winAllot) > 0 || Number(r.loseAllot) > 0) && r.buyReject === '0');

console.log(`TOTAL PRICED MARKETS: ${rows.length}`);
console.log('--- SAMPLE 10 MATCHES ---');

rows.slice(0, 10).forEach((r, idx) => {
    const gameDateStr = new Date(Number(r.gameDate)).toISOString();
    const endDateStr = new Date(Number(r.endDate)).toISOString();
    console.log(`${idx + 1}. [${r.leagueName}] ${r.homeName} vs ${r.awayName}`);
    console.log(`   유형: ${r.betNm} | 배당: 홈 ${r.winAllot} / 무 ${r.drawAllot} / 원정 ${r.loseAllot}`);
    console.log(`   경기시간: ${gameDateStr} | 마감시간: ${endDateStr} | 구장: ${r.meetStadiumFullName || '미지정'}`);
});
