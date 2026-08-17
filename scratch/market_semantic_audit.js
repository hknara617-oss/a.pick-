'use strict';
/**
 * A.PICK HOTFIX — MARKET SEMANTIC AUDIT
 * gmTs=260097 전체 betId별 필드 매핑 + line 의미 검증
 * DO NOT GENERATE PICKS
 */
const fs = require('fs');

const files = fs.readdirSync('./scratch').filter(f => f.includes('betman_v4_G101_260097'));
const json = JSON.parse(fs.readFileSync('./scratch/' + files[0], 'utf8'));
const { keys, datas } = json.compSchedules;
const rows = datas.map(d => {
    const obj = {};
    keys.forEach((k, j) => obj[k] = d[j]);
    return obj;
});

// ── 1. Per-betId unique profile ────────────────────────────────────────────
const betProfiles = {};
for (const r of rows) {
    const k = r.betId + '::' + r.betNm;
    if (!betProfiles[k]) {
        betProfiles[k] = {
            betId: r.betId,
            betNm: r.betNm,
            betTypId: r.betTypId,
            betTypNm: r.betTypNm,
            itemCode: r.itemCode,
            handiValues: new Set(),
            winHandiValues: new Set(),
            drawHandiValues: new Set(),
            loseHandiValues: new Set(),
            sampleRows: []
        };
    }
    const p = betProfiles[k];
    p.handiValues.add(r.handi);
    p.winHandiValues.add(r.winHandi);
    p.drawHandiValues.add(r.drawHandi);
    p.loseHandiValues.add(r.loseHandi);
    if (p.sampleRows.length < 5 && r.winAllot > 0) {
        p.sampleRows.push({
            matchSeq: r.matchSeq,
            home: r.homeName, away: r.awayName,
            league: r.leagueName,
            handi: r.handi, winHandi: r.winHandi,
            drawHandi: r.drawHandi, loseHandi: r.loseHandi,
            winAllot: r.winAllot, drawAllot: r.drawAllot, loseAllot: r.loseAllot
        });
    }
}

// ── 2. Print per-betId profiles ────────────────────────────────────────────
let md = `# 26097회차 Market Semantic Audit\n\n`;
md += `> 수집시각: ${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}\n`;
md += `> 목적: betId별 필드 의미 검증 — 픽 생성 금지\n\n`;
md += `---\n\n`;

// Also print to stdout
console.log('=== 1. PER-BETID PROFILES ===\n');

md += `## 1. betId별 필드 프로파일\n\n`;

for (const [k, p] of Object.entries(betProfiles)) {
    const hVals = [...p.handiValues].filter(v => v !== null && v !== 0).slice(0, 8);
    const whVals = [...p.winHandiValues].filter(v => v !== null && v !== 0).slice(0, 8);
    const lhVals = [...p.loseHandiValues].filter(v => v !== null && v !== 0).slice(0, 8);

    console.log(`[betId=${p.betId}] ${p.betNm} (${p.betTypNm}) [${p.itemCode}]`);
    console.log(`  handi sample: ${[...p.handiValues].slice(0, 8).join(', ')}`);
    console.log(`  winHandi sample: ${[...p.winHandiValues].slice(0, 8).join(', ')}`);
    console.log(`  drawHandi sample: ${[...p.drawHandiValues].slice(0, 8).join(', ')}`);
    console.log(`  loseHandi sample: ${[...p.loseHandiValues].slice(0, 8).join(', ')}`);
    if (p.sampleRows.length > 0) {
        const s = p.sampleRows[0];
        console.log(`  sample[0]: ${s.home} vs ${s.away} | win:${s.winAllot} draw:${s.drawAllot} lose:${s.loseAllot} | handi:${s.handi} wH:${s.winHandi} dH:${s.drawHandi} lH:${s.loseHandi}`);
    }
    console.log('');

    md += `### betId=${p.betId}: ${p.betNm}\n`;
    md += `- **betTypNm:** ${p.betTypNm}\n`;
    md += `- **종목:** ${p.itemCode === 'BS' ? '야구' : '축구'}\n`;
    md += `- **handi 고유값 샘플:** ${[...p.handiValues].slice(0, 10).join(', ')}\n`;
    md += `- **winHandi 고유값 샘플:** ${[...p.winHandiValues].slice(0, 10).join(', ')}\n`;
    md += `- **drawHandi 고유값 샘플:** ${[...p.drawHandiValues].slice(0, 10).join(', ')}\n`;
    md += `- **loseHandi 고유값 샘플:** ${[...p.loseHandiValues].slice(0, 10).join(', ')}\n\n`;

    if (p.sampleRows.length > 0) {
        md += `| home | away | winAllot | drawAllot | loseAllot | handi | winHandi | drawHandi | loseHandi |\n`;
        md += `|------|------|---------|-----------|-----------|-------|----------|-----------|----------|\n`;
        for (const s of p.sampleRows.slice(0, 3)) {
            md += `| ${s.home} | ${s.away} | ${s.winAllot} | ${s.drawAllot} | ${s.loseAllot} | ${s.handi} | ${s.winHandi} | ${s.drawHandi} | ${s.loseHandi} |\n`;
        }
        md += `\n`;
    }
}

// ── 3. Football total line investigation ───────────────────────────────────
console.log('\n=== 2. FOOTBALL TOTAL LINE INVESTIGATION ===\n');
md += `---\n\n## 2. 축구 언더오버 "기준:9" 버그 조사\n\n`;

const scUO = rows.filter(r => r.betNm === '축구 언더오버' && r.winAllot > 0);
console.log(`축구 언더오버 priced rows: ${scUO.length}`);
console.log('Sample 20 rows — handi, winHandi, drawHandi, loseHandi values:');

md += `축구 언더오버 priced rows: ${scUO.length}\n\n`;
md += `| matchSeq | home | away | winAllot | loseAllot | handi | winHandi | drawHandi | loseHandi |\n`;
md += `|---------|------|------|---------|----------|-------|----------|-----------|----------|\n`;

for (const r of scUO.slice(0, 20)) {
    console.log(`  ${r.homeName} vs ${r.awayName}: handi=${r.handi} wH=${r.winHandi} dH=${r.drawHandi} lH=${r.loseHandi} | U=${r.winAllot} O=${r.loseAllot}`);
    md += `| ${r.matchSeq} | ${r.homeName} | ${r.awayName} | ${r.winAllot} | ${r.loseAllot} | ${r.handi} | ${r.winHandi} | ${r.drawHandi} | ${r.loseHandi} |\n`;
}

// Compare with baseball U/O
const bsUO = rows.filter(r => r.betNm === '야구 언더오버' && r.winAllot > 0);
console.log(`\n야구 언더오버 priced rows: ${bsUO.length}`);
console.log('Sample 10 rows:');
md += `\n야구 언더오버 priced rows: ${bsUO.length}\n\n`;
md += `| matchSeq | home | away | winAllot | loseAllot | handi | winHandi | drawHandi | loseHandi |\n`;
md += `|---------|------|------|---------|----------|-------|----------|-----------|----------|\n`;
for (const r of bsUO.slice(0, 10)) {
    console.log(`  ${r.homeName} vs ${r.awayName}: handi=${r.handi} wH=${r.winHandi} dH=${r.drawHandi} lH=${r.loseHandi} | U=${r.winAllot} O=${r.loseAllot}`);
    md += `| ${r.matchSeq} | ${r.homeName} | ${r.awayName} | ${r.winAllot} | ${r.loseAllot} | ${r.handi} | ${r.winHandi} | ${r.drawHandi} | ${r.loseHandi} |\n`;
}

// ── 4. Football handicap line investigation ────────────────────────────────
console.log('\n=== 3. FOOTBALL HANDICAP LINE INVESTIGATION ===\n');
md += `\n---\n\n## 3. 축구 핸디캡 라인 필드 조사\n\n`;

const scHdp = rows.filter(r => r.betNm === '축구 핸디캡' && r.winAllot > 0);
console.log(`축구 핸디캡 priced rows: ${scHdp.length}`);
md += `| matchSeq | home | away | winAllot | loseAllot | handi | winHandi | drawHandi | loseHandi |\n`;
md += `|---------|------|------|---------|----------|-------|----------|-----------|----------|\n`;
for (const r of scHdp.slice(0, 15)) {
    console.log(`  ${r.homeName} vs ${r.awayName}: handi=${r.handi} wH=${r.winHandi} dH=${r.drawHandi} lH=${r.loseHandi} | 승=${r.winAllot} 패=${r.loseAllot}`);
    md += `| ${r.matchSeq} | ${r.homeName} | ${r.awayName} | ${r.winAllot} | ${r.loseAllot} | ${r.handi} | ${r.winHandi} | ${r.drawHandi} | ${r.loseHandi} |\n`;
}

// Baseball handicap
const bsHdp = rows.filter(r => r.betNm === '야구 핸디캡' && r.winAllot > 0);
console.log(`\n야구 핸디캡 priced rows: ${bsHdp.length}`);
md += `\n야구 핸디캡 priced rows: ${bsHdp.length}\n\n`;
md += `| matchSeq | home | away | winAllot | loseAllot | handi | winHandi | drawHandi | loseHandi |\n`;
md += `|---------|------|------|---------|----------|-------|----------|-----------|----------|\n`;
for (const r of bsHdp.slice(0, 10)) {
    console.log(`  ${r.homeName} vs ${r.awayName}: handi=${r.handi} wH=${r.winHandi} dH=${r.drawHandi} lH=${r.loseHandi} | 승=${r.winAllot} 패=${r.loseAllot}`);
    md += `| ${r.matchSeq} | ${r.homeName} | ${r.awayName} | ${r.winAllot} | ${r.loseAllot} | ${r.handi} | ${r.winHandi} | ${r.drawHandi} | ${r.loseHandi} |\n`;
}

// ── 5. Line field mapping conclusion (empirical) ───────────────────────────
console.log('\n=== 4. EMPIRICAL LINE FIELD CONCLUSIONS ===\n');
md += `\n---\n\n## 4. Line 필드 의미 — 실증 결론\n\n`;

// Analyze handi field across betTypes
const uoGroups = {
    '축구 언더오버': scUO,
    '야구 언더오버': bsUO,
    '축구 핸디캡': scHdp,
    '야구 핸디캡': bsHdp
};
for (const [nm, arr] of Object.entries(uoGroups)) {
    const pricedArr = arr.filter(r => r.winAllot > 0);
    const handiUniq = [...new Set(pricedArr.map(r => r.handi))].sort((a,b)=>a-b);
    const whUniq = [...new Set(pricedArr.map(r => r.winHandi))].sort((a,b)=>a-b);
    const lhUniq = [...new Set(pricedArr.map(r => r.loseHandi))].sort((a,b)=>a-b);
    console.log(`${nm}:`);
    console.log(`  handi unique: ${handiUniq.slice(0,15).join(', ')}`);
    console.log(`  winHandi unique: ${whUniq.slice(0,15).join(', ')}`);
    console.log(`  loseHandi unique: ${lhUniq.slice(0,15).join(', ')}`);
    console.log('');
    md += `### ${nm}\n`;
    md += `- handi 고유값: ${handiUniq.slice(0,15).join(', ')}\n`;
    md += `- winHandi 고유값: ${whUniq.slice(0,15).join(', ')}\n`;
    md += `- loseHandi 고유값: ${lhUniq.slice(0,15).join(', ')}\n\n`;
}

// ── 6. Date/day-of-week verification ──────────────────────────────────────
console.log('\n=== 5. DATE/DAY-OF-WEEK VERIFICATION ===\n');
md += `---\n\n## 5. 날짜·요일 검증\n\n`;

const DAYS_EN = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const DAYS_KO = ['일요일','월요일','화요일','수요일','목요일','금요일','토요일'];
const testDates = [
    new Date('2026-08-17T00:00:00+09:00'),
    new Date('2026-08-18T00:00:00+09:00'),
    new Date('2026-08-19T00:00:00+09:00'),
];
const expected = ['월요일','화요일','수요일'];

md += `| 날짜 | JS getDay() | 요일(계산) | 예상 | 일치 |\n`;
md += `|------|------------|-----------|------|------|\n`;
for (let i = 0; i < testDates.length; i++) {
    const d = testDates[i];
    const dayIdx = d.getDay();
    const koDay = DAYS_KO[dayIdx];
    const enDay = DAYS_EN[dayIdx];
    const match = koDay === expected[i] ? '✅' : '❌ BUG';
    const dateStr = d.toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul' });
    console.log(`${dateStr}: getDay()=${dayIdx} → ${enDay}/${koDay} (expected: ${expected[i]}) ${match}`);
    md += `| ${dateStr} | ${dayIdx} | ${koDay} | ${expected[i]} | ${match} |\n`;
}

// Check what the previous report did
console.log('\n[이전 리포트 버그 확인]');
console.log('이전 코드: "경기시간: 2026. 8. 18. AM 9:05:00" → 주석 없음, 요일 표기 없음');
console.log('이전 픽 리포트: "8/18(월)"이라고 주석으로 표기했는데 월→화가 맞음');
md += `\n> **버그 확인:** 픽 리포트에 "8/18(월)" "8/19(화)"로 표기했으나 올바른 요일은 **8/18(화), 8/19(수)**\n\n`;

// ── 7. noticeNo cross-check ────────────────────────────────────────────────
console.log('\n=== 6. BETMAN UI RECONCILE PROXY (noticeNo 기반) ===\n');
md += `---\n\n## 6. Betman UI 대조용 — noticeNo 기반 샘플 20행\n\n`;
md += `> noticeNo가 Betman 공식 UI 경기번호와 일치하는지 별도 확인 필요 (PROVIDER FACT vs UI)\n\n`;

const priced20 = rows.filter(r => r.winAllot > 0 && r.buyReject === '0').slice(0, 20);
md += `| noticeNo | sport | league | home | away | betNm | handi | winHandi | loseHandi | winAllot | drawAllot | loseAllot |\n`;
md += `|---------|-------|--------|------|------|-------|-------|----------|-----------|---------|-----------|----------|\n`;
for (const r of priced20) {
    console.log(`  noticeNo=${r.noticeNo} | ${r.leagueName} | ${r.homeName} vs ${r.awayName} | ${r.betNm} | handi=${r.handi} wH=${r.winHandi} lH=${r.loseHandi} | ${r.winAllot}/${r.drawAllot}/${r.loseAllot}`);
    md += `| ${r.noticeNo} | ${r.itemCode} | ${r.leagueName} | ${r.homeName} | ${r.awayName} | ${r.betNm} | ${r.handi} | ${r.winHandi} | ${r.loseHandi} | ${r.winAllot} | ${r.drawAllot} | ${r.loseAllot} |\n`;
}

// ── 8. PROVIDER FACT / MODEL INFERENCE separation ─────────────────────────
md += `\n---\n\n## 7. 데이터 분류 원칙\n\n`;
md += `### PROVIDER FACT (Betman JSON에서 직접 추출)\n`;
md += `- betId, betNm, betTypNm, handi, winHandi, drawHandi, loseHandi\n`;
md += `- winAllot, drawAllot, loseAllot\n`;
md += `- protoStatus, sgl, buyReject, gameReject\n`;
md += `- matchSeq, leagueName, homeName, awayName, gameDate\n`;
md += `- currentLottery.saleStatus, gmTs, gmOsidTs, gmOsidTsYear\n\n`;
md += `### EXTERNAL SPORTS DATA (외부 소스, 현재 미구비)\n`;
md += `- 팀 순위/승률/폼/최근 5경기\n`;
md += `- 선발투수/예상 라인업\n`;
md += `- 부상자 리포트\n`;
md += `- head-to-head 기록\n\n`;
md += `### MODEL INFERENCE (모델이 생성 — 근거 명시 필수)\n`;
md += `- 적정확률(fair probability)\n`;
md += `- Vig 제거 후 implied probability\n`;
md += `- A.PICK edge 계산\n`;
md += `- fair value 배당\n\n`;
md += `> ⚠️ **현재 EXTERNAL SPORTS DATA 미구비 상태에서 MODEL INFERENCE 출력 금지**\n\n`;

// ── 9. Issues confirmed ────────────────────────────────────────────────────
md += `---\n\n## 8. 확인된 버그 목록\n\n`;
md += `| # | 버그 | 심각도 | 상태 |\n`;
md += `|---|------|--------|------|\n`;
md += `| 1 | 축구/야구 언더오버 기준점 필드 미확인 (handi vs winHandi vs loseHandi) | 🔴 HIGH | 이 감사 보고서에서 실증 중 |\n`;
md += `| 2 | 픽 리포트 요일 표기 오류 (8/18 월→화, 8/19 화→수) | 🟡 MEDIUM | 확인됨 |\n`;
md += `| 3 | 적정배당 외부 데이터 없이 생성 | 🔴 HIGH | 이전 리포트 무효 선언 |\n`;
md += `| 4 | "동남아 조작 리스크" 등 근거 없는 claim | 🔴 HIGH | 이전 리포트 무효 선언 |\n`;
md += `| 5 | SGL=1 필드가 shortlistEligible과 동일한지 미검증 | 🟡 MEDIUM | 추가 확인 필요 |\n\n`;

md += `---\n\n## 9. 다음 단계 (픽 생성 전 필수)\n\n`;
md += `1. [ ] 언더오버/핸디캡 line 필드 확정 (UI 직접 대조)\n`;
md += `2. [ ] 외부 스포츠 데이터 소스 구비 (선발, 순위, 폼)\n`;
md += `3. [ ] Vig 제거 → implied probability 계산기 구현\n`;
md += `4. [ ] fair probability 산출 방법론 확정\n`;
md += `5. [ ] edge 임계값 정의\n`;
md += `6. [ ] picks는 edge > 임계값인 경우만 출력\n`;

fs.writeFileSync('./reports/26097_MARKET_SEMANTIC_AUDIT.md', md);
console.log('\n✅ Saved: reports/26097_MARKET_SEMANTIC_AUDIT.md');
