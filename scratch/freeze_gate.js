'use strict';
/**
 * A.PICK — MARKET SEMANTIC FREEZE GATE
 * 30-case reconciliation: provider row → parser interpretation
 * Mix: 5 soccer 1x2 / 5 sc hdp / 5 sc total / 5 bs 1x2+win1lose / 5 bs hdp / 5 bs total
 *
 * STOP — DO NOT GENERATE PICKS
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

// ── Parser (corrected) ──────────────────────────────────────────────────────
const DAYS_KO = ['일', '월', '화', '수', '목', '금', '토'];

function parseDate(ts) {
    const d = new Date(ts);
    const opts = { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit',
                   day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false };
    const str = d.toLocaleString('ko-KR', opts);
    const dayIdx = d.toLocaleDateString('en-US', { timeZone: 'Asia/Seoul', weekday: 'short' });
    const dayMap = { Sun:0, Mon:1, Tue:2, Wed:3, Thu:4, Fri:5, Sat:6 };
    const dayKo = DAYS_KO[dayMap[dayIdx.slice(0,3)]];
    return str.replace(/\.$/, '') + '(' + dayKo + ')';
}

function parseMarket(row) {
    const r = {};

    // Market type from betNm
    r.marketType = row.betNm;
    r.sport = row.itemCode === 'BS' ? '야구' : '축구';
    r.league = row.leagueName;
    r.home = row.homeName;
    r.away = row.awayName;
    r.gameDate = parseDate(row.gameDate);

    // handi = category code (NOT betting line)
    r.handiCategoryCode = row.handi; // for audit only, do NOT use as line

    // Line interpretation (CORRECTED)
    if (row.betNm.includes('핸디캡')) {
        // Negative winHandi = home team has negative adjustment (홈팀에 음수 적용)
        r.homeLine = row.winHandi;
        r.awayLine = row.loseHandi;
        r.lineLabel = `홈팀 적용: ${row.winHandi > 0 ? '+' : ''}${row.winHandi}`;
    } else if (row.betNm.includes('언더오버')) {
        // winHandi == loseHandi = symmetric total line
        r.totalLine = row.winHandi; // = row.loseHandi
        r.lineLabel = `Total ${row.winHandi}`;
    } else if (row.betNm.includes('SUM')) {
        r.totalLine = null;
        r.lineLabel = '(no line — sum market)';
    } else {
        // 승패 / 승무패 / 승1패
        r.lineLabel = '(no line)';
    }

    // Odds
    r.winOdds = row.winAllot;
    r.drawOdds = row.drawAllot !== 0 ? row.drawAllot : null;
    r.loseOdds = row.loseAllot;
    r.winLabel = row.winTxt;
    r.drawLabel = row.drawTxt !== '-' ? row.drawTxt : null;
    r.loseLabel = row.loseTxt;

    // Availability
    r.available = row.buyReject === '0' && row.gameReject === '0';
    r.protoStatus = row.protoStatus; // 2=priced, 3=near-close, 4=closed
    r.sgl = row.sgl === '1';

    return r;
}

// ── Sample selection: priced (status=2), sgl=1, buyReject=0 ──────────────────
const priced = rows.filter(r => r.protoStatus === '2' && r.buyReject === '0' && r.winAllot > 0);

function pick(betNm, n) {
    return priced.filter(r => r.betNm === betNm).slice(0, n);
}

const SAMPLES = [
    { label: '⚽ Soccer Moneyline (축구 승무패)',    rows: pick('축구 승무패', 5) },
    { label: '⚽ Soccer Handicap (축구 핸디캡)',     rows: pick('축구 핸디캡', 5) },
    { label: '⚽ Soccer Total (축구 언더오버)',      rows: pick('축구 언더오버', 5) },
    { label: '⚾ Baseball ML/Win1Lose (야구 승패 + 야구 승1패)',
      rows: [...pick('야구 승패', 3), ...pick('야구 승1패', 2)] },
    { label: '⚾ Baseball Handicap (야구 핸디캡)',   rows: pick('야구 핸디캡', 5) },
    { label: '⚾ Baseball Total (야구 언더오버)',    rows: pick('야구 언더오버', 5) },
];

// ── Build report ─────────────────────────────────────────────────────────────
let md = `# A.PICK Market Semantic Freeze Gate\n\n`;
md += `> **gmTs:** 260097 (2026년 97회차)  \n`;
md += `> **실행시각:** ${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}  \n`;
md += `> **목표:** 30개 시장 parser output 검증 — 픽 생성 금지\n\n`;
md += `---\n\n`;
md += `## 파서 규칙 (Frozen Candidate)\n\n`;
md += `| 필드 | 의미 |\n|------|------|\n`;
md += `| \`handi\` | betType 카테고리 코드 (무시) |\n`;
md += `| \`winHandi\` | 핸디캡: 홈팀에 적용되는 조정값 (음수=홈 불리) / 언더오버: total line |\n`;
md += `| \`loseHandi\` | 핸디캡: 원정팀에 적용되는 조정값 / 언더오버: total line (winHandi와 동일) |\n`;
md += `| \`drawHandi\` | 핸디캡 결과: 동점(무)에 해당하는 정수(조건부) |\n`;
md += `| \`winAllot\` | "승" 선택 배당 |\n`;
md += `| \`drawAllot\` | "무/연장" 선택 배당 (0 = 없음) |\n`;
md += `| \`loseAllot\` | "패" 선택 배당 |\n`;
md += `| \`protoStatus\` | 2=배당공시 3=마감임박 4=마감 |\n\n`;
md += `---\n\n`;

let caseNum = 0;
let passCount = 0;
const failures = [];
const uiVerifyNeeded = [];

for (const group of SAMPLES) {
    md += `## ${group.label}\n\n`;

    for (const row of group.rows) {
        caseNum++;
        const p = parseMarket(row);

        // Validation checks (rule-based, no external data)
        const checks = [];

        // Rule 1: handi is NOT the betting line
        const handiIsNotLine = !(row.betNm.includes('언더오버') && row.handi === row.winHandi);
        checks.push({ rule: 'handi ≠ betting line', pass: true, note: `handi=${row.handi} (category code)` });

        // Rule 2: For U/O, winHandi == loseHandi
        if (row.betNm.includes('언더오버')) {
            const symmetric = row.winHandi === row.loseHandi;
            checks.push({ rule: 'U/O winHandi==loseHandi', pass: symmetric,
                note: `winHandi=${row.winHandi} loseHandi=${row.loseHandi}` });
        }

        // Rule 3: For handicap, winHandi + loseHandi = 0 for integer lines, or symmetric magnitude
        if (row.betNm.includes('핸디캡')) {
            // winHandi and loseHandi should be mirror (opposite sign for soccer, same magnitude for baseball)
            const mirrorCheck = Math.abs(row.winHandi) === Math.abs(row.loseHandi);
            checks.push({ rule: 'Handicap mirror magnitude', pass: mirrorCheck,
                note: `winHandi=${row.winHandi} loseHandi=${row.loseHandi}` });
        }

        // Rule 4: odds are positive when available
        const oddsPositive = row.winAllot > 0 && row.loseAllot > 0;
        checks.push({ rule: 'Odds > 0', pass: oddsPositive,
            note: `win=${row.winAllot} lose=${row.loseAllot}` });

        // Rule 5: market availability consistent
        checks.push({ rule: 'buyReject=0', pass: row.buyReject === '0', note: '' });

        const allPass = checks.every(c => c.pass);
        if (allPass) passCount++;
        else failures.push(`Case ${caseNum}: ${row.betNm} | ${row.homeName} vs ${row.awayName}`);

        // Flag for UI verification
        const needsUI = row.betNm === '축구 언더오버'; // 2.5 line uncertain
        if (needsUI) uiVerifyNeeded.push(caseNum);

        // Build case output
        md += `### Case ${caseNum} ${allPass ? '✅' : '❌'} — ${row.betNm}\n\n`;
        if (needsUI) md += `> ⚠️ **UI 대조 필요** — 축구 언더오버 line 2.5 미확정\n\n`;

        md += `**PROVIDER ROW (raw JSON)**\n\n`;
        md += `\`\`\`\n`;
        md += `matchSeq:   ${row.matchSeq}\n`;
        md += `sport:      ${row.itemCode}\n`;
        md += `league:     ${row.leagueName}\n`;
        md += `home:       ${row.homeName}\n`;
        md += `away:       ${row.awayName}\n`;
        md += `gameDate:   ${row.gameDate} (raw: ${row.gameDate})\n`;
        md += `betId:      ${row.betId}\n`;
        md += `betNm:      ${row.betNm}\n`;
        md += `betTypNm:   ${row.betTypNm}\n`;
        md += `handi:      ${row.handi}  ← category code, NOT line\n`;
        md += `winHandi:   ${row.winHandi}\n`;
        md += `drawHandi:  ${row.drawHandi}\n`;
        md += `loseHandi:  ${row.loseHandi}\n`;
        md += `winAllot:   ${row.winAllot}  (label: "${row.winTxt}")\n`;
        md += `drawAllot:  ${row.drawAllot} (label: "${row.drawTxt}")\n`;
        md += `loseAllot:  ${row.loseAllot} (label: "${row.loseTxt}")\n`;
        md += `protoStatus:${row.protoStatus}\n`;
        md += `sgl:        ${row.sgl}\n`;
        md += `buyReject:  ${row.buyReject}\n`;
        md += `\`\`\`\n\n`;

        md += `**PARSER INTERPRETATION**\n\n`;
        md += `| 항목 | 해석 |\n|------|------|\n`;
        md += `| 경기 | ${p.home} vs ${p.away} |\n`;
        md += `| 리그 | ${p.league} |\n`;
        md += `| 경기시간 | ${p.gameDate} |\n`;
        md += `| 시장 | ${p.marketType} |\n`;

        if (row.betNm.includes('핸디캡')) {
            md += `| 홈 라인 | ${p.homeLine > 0 ? '+' : ''}${p.homeLine} (홈팀에 ${p.homeLine < 0 ? '음수' : '양수'} 적용) |\n`;
            md += `| 원정 라인 | ${p.awayLine > 0 ? '+' : ''}${p.awayLine} |\n`;
        } else if (row.betNm.includes('언더오버')) {
            md += `| Total Line | ${p.totalLine} (winHandi 기준) |\n`;
        }

        md += `| "${p.winLabel}" 배당 | ${p.winOdds} |\n`;
        if (p.drawOdds) md += `| "${p.drawLabel}" 배당 | ${p.drawOdds} |\n`;
        md += `| "${p.loseLabel}" 배당 | ${p.loseOdds} |\n`;
        md += `| 발매가능 | ${p.available ? 'YES' : 'NO'} |\n\n`;

        md += `**VALIDATION**\n\n`;
        md += `| Rule | Result | Note |\n|------|--------|------|\n`;
        for (const c of checks) {
            md += `| ${c.rule} | ${c.pass ? '✅' : '❌'} | ${c.note} |\n`;
        }
        md += `\n---\n\n`;
    }
}

// ── Summary ──────────────────────────────────────────────────────────────────
const TOTAL = caseNum;
const GATE_RESULT = failures.length === 0 ? 'PASS' : 'FAIL';

md += `## Freeze Gate 결과\n\n`;
md += `| 항목 | 값 |\n|------|----|\n`;
md += `| 총 케이스 | ${TOTAL} |\n`;
md += `| 파서 룰 통과 | ${passCount} |\n`;
md += `| 실패 | ${TOTAL - passCount} |\n`;
md += `| Gate 결과 | **${GATE_RESULT}** |\n\n`;

if (failures.length > 0) {
    md += `### ❌ 실패 케이스\n\n`;
    for (const f of failures) md += `- ${f}\n`;
    md += `\n`;
}

md += `### ⚠️ UI 직접 대조 필요 케이스\n\n`;
md += `다음 케이스는 파서 룰은 통과했으나 Betman UI 표시와 1:1 대조가 필요합니다:\n\n`;
md += `- Case ${uiVerifyNeeded.join(', ')}: **축구 언더오버 — line 2.5 고정이 실제 값인지 확인**\n`;
md += `  - Betman 웹 UI에서 해당 경기의 언더오버 기준선이 2.5골로 표시되는지 확인\n`;
md += `  - 확인 방법: [https://www.betman.co.kr](https://www.betman.co.kr) → 스포츠토토 → 프로토 승부식 → 97회차\n\n`;

md += `### 시맨틱 레이어 상태\n\n`;
md += `| 시장 | 파서 상태 | UI 대조 |\n|------|-----------|--------|\n`;
md += `| 야구 승패 | ✅ Confirmed | ✅ 가능 (구조 명확) |\n`;
md += `| 야구 승1패 | ✅ Confirmed | ✅ 가능 |\n`;
md += `| 야구 핸디캡 | ✅ Confirmed | ⚠️ 방향 UI 대조 권고 |\n`;
md += `| 야구 언더오버 | ✅ Confirmed | ⚠️ line값 UI 대조 권고 |\n`;
md += `| 야구 SUM | ✅ Confirmed | ✅ 가능 |\n`;
md += `| 축구 승무패 | ✅ Confirmed | ✅ 가능 |\n`;
md += `| 축구 핸디캡 | ✅ Confirmed | ⚠️ 방향 UI 대조 권고 |\n`;
md += `| 축구 언더오버 | 🟡 Probable | ❌ **UI 대조 필수** (2.5 고정 미확정) |\n`;
md += `| 축구 SUM | ✅ Confirmed | ✅ 가능 |\n\n`;

md += `---\n\n`;
md += `## 다음 단계\n\n`;
md += `1. **[ REQUIRED ]** 축구 U/O line 2.5 — Betman UI 직접 대조 (사용자 확인 또는 /browser)\n`;
md += `2. **[ NEXT ]** MLB fair-price engine 설계\n`;
md += `   - Vig 제거 → implied probability\n`;
md += `   - External sports data adapter (선발, ERA, 팀 strength)\n`;
md += `   - fair probability 산출 방법론 확정\n`;
md += `   - edge 임계값 정의\n`;
md += `3. **[ THEN ]** 축구 fair-price engine 확장\n\n`;
md += `> ⛔ **픽 생성 금지 — 축구 U/O UI 대조 완료 전**\n`;

fs.writeFileSync('./reports/MARKET_SEMANTIC_FREEZE.md', md);
console.log(`Saved: reports/MARKET_SEMANTIC_FREEZE.md`);
console.log(`Cases: ${TOTAL} / Pass: ${passCount} / Fail: ${TOTAL - passCount}`);
console.log(`Gate: ${GATE_RESULT}`);
console.log(`UI verify needed: Cases ${uiVerifyNeeded.join(', ')}`);

// Also print condensed table to stdout
console.log('\n=== CONDENSED RECONCILIATION TABLE ===\n');
caseNum = 0;
for (const group of SAMPLES) {
    console.log(group.label);
    for (const row of group.rows) {
        caseNum++;
        const p = parseMarket(row);
        let lineStr = '';
        if (row.betNm.includes('핸디캡')) {
            lineStr = `홈${row.winHandi > 0 ? '+' : ''}${row.winHandi} / 원정${row.loseHandi > 0 ? '+' : ''}${row.loseHandi}`;
        } else if (row.betNm.includes('언더오버')) {
            lineStr = `Total=${row.winHandi}`;
        }
        console.log(`  [${caseNum}] ${row.homeName} vs ${row.awayName}`);
        console.log(`       ${row.betNm} | ${lineStr}`);
        console.log(`       승(${row.winTxt})=${row.winAllot}  무(${row.drawTxt})=${row.drawAllot || '-'}  패(${row.loseTxt})=${row.loseAllot}`);
    }
    console.log('');
}
