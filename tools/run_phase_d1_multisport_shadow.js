'use strict';
/**
 * tools/run_phase_d1_multisport_shadow.js
 *
 * Multi-Sport Shadow Test using live Betman round 260097 data.
 * Constructs and evaluates test contracts across:
 * - 4 MLB matches
 * - 4 Soccer matches
 * - 2 Basketball / Volleyball fixtures
 */

const fs = require('fs');
const path = require('path');
const DecisionContract = require('../src/models/DecisionContract');
const BreakCondition = require('../src/models/BreakCondition');
const DecisionContextEngine = require('../src/core/DecisionContextEngine');
const DecisionCard = require('../src/models/DecisionCard');

const MLBContextAdapter = require('../src/context/MLBContextAdapter');
const SoccerContextAdapterStub = require('../src/context/SoccerContextAdapterStub');
const BasketballContextAdapterStub = require('../src/context/BasketballContextAdapterStub');
const VolleyballContextAdapterStub = require('../src/context/VolleyballContextAdapterStub');

async function runMultiSportShadow() {
    console.log('=== A.PICK PHASE D.1: MULTI-SPORT SHADOW TEST ===\n');

    // 1. Load Betman 260097 live feed
    const scratchDir = path.join(__dirname, '../scratch');
    const betFile = fs.readdirSync(scratchDir).find(f => f.includes('betman_v4_G101_260097'));
    if (!betFile) {
        throw new Error('Betman 260097 JSON file not found in scratch/');
    }
    const betJson = JSON.parse(fs.readFileSync(path.join(scratchDir, betFile), 'utf8'));
    const { keys, datas } = betJson.compSchedules;
    const allRows = datas.map(d => {
        const obj = {}; keys.forEach((k, j) => obj[k] = d[j]); return obj;
    });

    console.log(`Loaded ${allRows.length} rows from Betman round 260097.\n`);

    const mlbAdapter = new MLBContextAdapter();
    const soccerAdapter = new SoccerContextAdapterStub();
    const bbAdapter = new BasketballContextAdapterStub();
    const vbAdapter = new VolleyballContextAdapterStub();

    const shadowResults = [];

    // ── Group 1: 4 MLB Matches ─────────────────────────────────────────────
    console.log('[1] Evaluating 4 MLB Shadow Contracts...');
    const mlbRows = allRows.filter(r => r.itemCode === 'BS' && r.betNm === '야구 승패' && r.protoStatus === '2' && r.winAllot > 0).slice(0, 4);

    for (const r of mlbRows) {
        const odds = [parseFloat(r.winAllot), parseFloat(r.loseAllot)];
        const contract = new DecisionContract({
            id: `contract_mlb_${r.matchSeq}`,
            provider: 'BETMAN',
            roundId: r.gmTs,
            sport: 'BASEBALL',
            league: r.leagueName,
            eventId: `mlb_${r.matchSeq}`,
            marketId: `market_ml_${r.matchSeq}`,
            selectionId: `sel_home_${r.matchSeq}`,
            offeredOddsAtSeal: odds[0],
            entryRule: { fairBasis: 'NO_VIG', requiredMargin: 0.02 },
            breakConditions: [
                new BreakCondition({ type: 'CONTEXT_SIGNAL_OCCURRED', targetCategory: 'STARTER', targetCode: 'STARTER_CHANGED' }),
                new BreakCondition({ type: 'PRICE_LT', threshold: parseFloat((odds[0] * 0.95).toFixed(2)) })
            ],
            validity: { validUntil: r.gameDate }
        });

        const ctx = await mlbAdapter.getContext({ eventId: `mlb_${r.matchSeq}` }, new Date().toISOString(), {
            homeStarter: { id: 101, fullName: 'Sample Pitcher A', status: 'CONFIRMED' },
            awayStarter: { id: 102, fullName: 'Sample Pitcher B', status: 'CONFIRMED' },
            starterChanged: false
        });

        const evalRes = DecisionContextEngine.evaluateContract(contract, {
            currentMarketOdds: odds,
            selectionIndex: 0,
            observedAt: new Date().toISOString(),
            contextSnapshot: ctx
        });

        const card = new DecisionCard({
            cardId: `card_mlb_${r.matchSeq}`,
            sport: 'BASEBALL',
            event: { id: `mlb_${r.matchSeq}`, league: r.leagueName, home: r.homeName, away: r.awayName, scheduledStart: r.gameDate },
            market: { id: `market_ml_${r.matchSeq}`, type: 'MONEYLINE_2WAY' },
            selection: { id: `sel_home_${r.matchSeq}`, label: `${r.homeName} 승`, side: 'HOME' },
            currentOdds: evalRes.currentOdds,
            marketFairOdds: evalRes.marketFairOdds,
            entryThreshold: evalRes.minimumEntryOdds,
            thesisState: evalRes.thesisState,
            actionState: evalRes.actionState,
            headline: evalRes.explanation
        });

        shadowResults.push({ sport: 'BASEBALL', match: `${r.homeName} vs ${r.awayName}`, contract, evalRes, card });
    }

    // ── Group 2: 4 Soccer Matches ──────────────────────────────────────────
    console.log('[2] Evaluating 4 Soccer Shadow Contracts...');
    const soccerRows = allRows.filter(r => r.itemCode === 'SC' && r.betNm === '축구 승무패' && r.protoStatus === '2' && r.winAllot > 0).slice(0, 4);

    for (const r of soccerRows) {
        const odds = [parseFloat(r.winAllot), parseFloat(r.drawAllot), parseFloat(r.loseAllot)];
        const contract = new DecisionContract({
            id: `contract_soccer_${r.matchSeq}`,
            provider: 'BETMAN',
            roundId: r.gmTs,
            sport: 'SOCCER',
            league: r.leagueName,
            eventId: `soccer_${r.matchSeq}`,
            marketId: `market_1x2_${r.matchSeq}`,
            selectionId: `sel_home_${r.matchSeq}`,
            offeredOddsAtSeal: odds[0],
            entryRule: { fairBasis: 'NO_VIG', requiredMargin: 0.00 },
            breakConditions: [
                new BreakCondition({ type: 'CONTEXT_SIGNAL_OCCURRED', targetCategory: 'LINEUP', targetCode: 'KEY_PLAYER_OUT' }),
                new BreakCondition({ type: 'PRICE_LT', threshold: parseFloat((odds[0] * 0.90).toFixed(2)) })
            ],
            validity: { validUntil: r.gameDate }
        });

        const ctx = await soccerAdapter.getContext({ eventId: `soccer_${r.matchSeq}` }, new Date().toISOString(), {
            lineupConfirmed: true,
            keyPlayerOut: false
        });

        const evalRes = DecisionContextEngine.evaluateContract(contract, {
            currentMarketOdds: odds,
            selectionIndex: 0,
            observedAt: new Date().toISOString(),
            contextSnapshot: ctx
        });

        const card = new DecisionCard({
            cardId: `card_soccer_${r.matchSeq}`,
            sport: 'SOCCER',
            event: { id: `soccer_${r.matchSeq}`, league: r.leagueName, home: r.homeName, away: r.awayName, scheduledStart: r.gameDate },
            market: { id: `market_1x2_${r.matchSeq}`, type: 'MONEYLINE_3WAY' },
            selection: { id: `sel_home_${r.matchSeq}`, label: `${r.homeName} 승`, side: 'HOME' },
            currentOdds: evalRes.currentOdds,
            marketFairOdds: evalRes.marketFairOdds,
            entryThreshold: evalRes.minimumEntryOdds,
            thesisState: evalRes.thesisState,
            actionState: evalRes.actionState,
            headline: evalRes.explanation
        });

        shadowResults.push({ sport: 'SOCCER', match: `${r.homeName} vs ${r.awayName}`, contract, evalRes, card });
    }

    // ── Group 3: 2 Basketball / Volleyball Fixtures ────────────────────────
    console.log('[3] Evaluating 2 Other Sports (Basketball & Volleyball) Shadow Contracts...');

    // Basketball Contract
    const bbContract = new DecisionContract({
        id: 'contract_bb_001',
        provider: 'BETMAN',
        roundId: '260097',
        sport: 'BASKETBALL',
        league: 'KBL',
        eventId: 'bb_001',
        marketId: 'market_hdp_bb_001',
        selectionId: 'sel_home_bb_001',
        offeredOddsAtSeal: 1.88,
        entryRule: { fairBasis: 'NO_VIG', requiredMargin: 0.00 },
        breakConditions: [
            new BreakCondition({ type: 'LINE_CHANGED' })
        ],
        validity: { initialLine: '-3.5' }
    });

    const bbCtx = await bbAdapter.getContext({ eventId: 'bb_001' }, new Date().toISOString(), {});
    const bbEval = DecisionContextEngine.evaluateContract(bbContract, {
        currentMarketOdds: [1.88, 1.88],
        currentLine: '-3.5',
        selectionIndex: 0,
        contextSnapshot: bbCtx
    });
    shadowResults.push({
        sport: 'BASKETBALL',
        match: '서울 SK vs 안양 정관장',
        contract: bbContract,
        evalRes: bbEval,
        card: new DecisionCard({
            cardId: 'card_bb_001',
            sport: 'BASKETBALL',
            event: { id: 'bb_001', league: 'KBL', home: '서울 SK', away: '안양 정관장', scheduledStart: '2026-08-18T19:00:00Z' },
            market: { id: 'market_hdp_bb_001', type: 'HANDICAP_2WAY', line: '-3.5' },
            selection: { id: 'sel_home_bb_001', label: '서울 SK (-3.5)', side: 'HOME' },
            currentOdds: bbEval.currentOdds,
            marketFairOdds: bbEval.marketFairOdds,
            entryThreshold: bbEval.minimumEntryOdds,
            thesisState: bbEval.thesisState,
            actionState: bbEval.actionState,
            headline: bbEval.explanation
        })
    });

    // Volleyball Contract
    const vbContract = new DecisionContract({
        id: 'contract_vb_001',
        provider: 'BETMAN',
        roundId: '260097',
        sport: 'VOLLEYBALL',
        league: 'V-League',
        eventId: 'vb_001',
        marketId: 'market_ml_vb_001',
        selectionId: 'sel_home_vb_001',
        offeredOddsAtSeal: 1.95,
        entryRule: { fairBasis: 'NO_VIG', requiredMargin: 0.00 },
        breakConditions: [
            new BreakCondition({ type: 'PRICE_LT', threshold: 1.80 })
        ]
    });
    const vbCtx = await vbAdapter.getContext({ eventId: 'vb_001' }, new Date().toISOString(), {});
    const vbEval = DecisionContextEngine.evaluateContract(vbContract, {
        currentMarketOdds: [1.95, 1.75],
        selectionIndex: 0,
        contextSnapshot: vbCtx
    });
    shadowResults.push({
        sport: 'VOLLEYBALL',
        match: '대한항공 vs 현대캐피탈',
        contract: vbContract,
        evalRes: vbEval,
        card: new DecisionCard({
            cardId: 'card_vb_001',
            sport: 'VOLLEYBALL',
            event: { id: 'vb_001', league: 'V-League', home: '대한항공', away: '현대캐피탈', scheduledStart: '2026-08-18T19:00:00Z' },
            market: { id: 'market_ml_vb_001', type: 'MONEYLINE_2WAY' },
            selection: { id: 'sel_home_vb_001', label: '대한항공 승', side: 'HOME' },
            currentOdds: vbEval.currentOdds,
            marketFairOdds: vbEval.marketFairOdds,
            entryThreshold: vbEval.minimumEntryOdds,
            thesisState: vbEval.thesisState,
            actionState: vbEval.actionState,
            headline: vbEval.explanation
        })
    });

    // ── Generate Report: PHASE_D1_MULTISPORT_SHADOW.md ────────────────────
    let md = `# Multi-Sport Shadow Test Report (Phase D.1)\n\n`;
    md += `> **실행시각:** ${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}\n`;
    md += `> **평가 대상:** 10개 멀티스포츠 테스트 계약 (4 MLB, 4 Soccer, 1 Basketball, 1 Volleyball)\n`;
    md += `> **목적:** 종목 독립적 Decision Core 동작 검증 — 픽/추천 절대 아님\n\n`;
    md += `---\n\n## 1. Multi-Sport Shadow 평가 결과\n\n`;
    md += `| Sport | Match | Market | Selection | Offered Odds | Market Fair | Entry Min | Price State | Thesis State | Action State | Explanation |\n`;
    md += `|---|---|---|---|---|---|---|---|---|---|---|\n`;

    for (const r of shadowResults) {
        md += `| **${r.sport}** | ${r.match} | ${r.card.market.type} | ${r.card.selection.label} | ${r.evalRes.currentOdds || '—'} | ${r.evalRes.marketFairOdds?.toFixed(3) || '—'} | ${r.evalRes.minimumEntryOdds?.toFixed(3) || '—'} | \`${r.evalRes.priceState}\` | \`${r.evalRes.thesisState}\` | **\`${r.evalRes.actionState}\`** | ${r.evalRes.explanation} |\n`;
    }

    fs.writeFileSync('./reports/PHASE_D1_MULTISPORT_SHADOW.md', md);
    console.log('\n✅ Saved: reports/PHASE_D1_MULTISPORT_SHADOW.md');
    console.log(`Evaluated ${shadowResults.length} multi-sport contracts successfully.\n`);

    return shadowResults;
}

if (require.main === module) {
    runMultiSportShadow().catch(console.error);
}

module.exports = runMultiSportShadow;
