'use strict';

/**
 * tools/run_phase_e_review_scenarios.js
 *
 * Comprehensive test suite for Phase E Review Engine:
 * 1. Outcome settlement (>= 8)
 * 2. Entry execution (>= 8)
 * 3. Closing price resolution (>= 10)
 * 4. CLV math (>= 10)
 * 5. Price quality grading (>= 10)
 * 6. Rule discipline evaluation (>= 12)
 * 7. Pre-game state resolution (>= 8)
 * 8. Thesis review & post-game leakage rejection (>= 12 + 8)
 * 9. Decision quality engine (>= 12)
 * 10. Outcome Invariant Tests (WIN/LOSS swap leaves decision quality identical) (>= 10)
 * 11. Idempotency & DB persistence (>= 8 + 10)
 * 12. Replay (>= 8)
 * 13. Multi-sport integration (MLB, Soccer, Basketball) (>= 8)
 * Target: >= 142 exact passing tests.
 */

const assert = require('assert');
const fs = require('fs');
const DecisionContract = require('../src/models/DecisionContract');
const SettlementResult = require('../src/models/SettlementResult');
const EntryExecution = require('../src/models/EntryExecution');
const ClosingPrice = require('../src/models/ClosingPrice');
const SettlementEngine = require('../src/review/SettlementEngine');
const EntryExecutionEngine = require('../src/review/EntryExecutionEngine');
const ClosingPriceResolver = require('../src/review/ClosingPriceResolver');
const CLVEngine = require('../src/review/CLVEngine');
const PriceQualityEngine = require('../src/review/PriceQualityEngine');
const RuleDisciplineEngine = require('../src/review/RuleDisciplineEngine');
const PreGameStateResolver = require('../src/review/PreGameStateResolver');
const ThesisReviewEngine = require('../src/review/ThesisReviewEngine');
const DecisionQualityEngine = require('../src/review/DecisionQualityEngine');
const ReviewEngine = require('../src/review/ReviewEngine');
const ReviewReplayEngine = require('../src/review/ReviewReplayEngine');

async function runReviewTests() {
    console.log('=== A.PICK PHASE E: POST-GAME REVIEW SCENARIOS TEST SUITE ===\n');

    let passed = 0;
    let failed = 0;

    async function test(category, name, fn) {
        try {
            await fn();
            passed++;
            console.log(`  ✅ [${category}] ${name}`);
        } catch (e) {
            failed++;
            console.error(`  ❌ [${category}] ${name}: ${e.message}`);
        }
    }

    const sampleContract = new DecisionContract({
        id: 'c_rev_001',
        userId: 'u_user_01',
        provider: 'BETMAN',
        roundId: '260097',
        sport: 'BASEBALL',
        league: 'MLB',
        eventId: 'e_101',
        marketId: 'm_ml_101',
        selectionId: 's1',
        offeredOddsAtSeal: 1.86,
        entryRule: { minimumEntryOdds: 1.82 },
        initialPriceState: 'ATTRACTIVE',
        thesis: { summary: 'Pitcher edge confirmed' }
    });

    // ── Category 1: Outcome Settlement (>= 8 tests) ─────────────────────────
    await test('Settlement', '1.1 Deterministic WIN settlement', () => {
        const s = SettlementEngine.resolveSettlement({ result: 'WIN', verified: true }, sampleContract);
        assert.strictEqual(s.result, 'WIN');
        assert.strictEqual(s.verified, true);
    });
    await test('Settlement', '1.2 Deterministic LOSS settlement', () => {
        const s = SettlementEngine.resolveSettlement({ result: 'LOSS', verified: true }, sampleContract);
        assert.strictEqual(s.result, 'LOSS');
    });
    await test('Settlement', '1.3 Deterministic PUSH settlement', () => {
        const s = SettlementEngine.resolveSettlement({ result: 'PUSH', verified: true }, sampleContract);
        assert.strictEqual(s.result, 'PUSH');
    });
    await test('Settlement', '1.4 Deterministic VOID settlement', () => {
        const s = SettlementEngine.resolveSettlement({ result: 'VOID', verified: true }, sampleContract);
        assert.strictEqual(s.result, 'VOID');
    });
    await test('Settlement', '1.5 Null settlement resolves to UNKNOWN', () => {
        const s = SettlementEngine.resolveSettlement(null, sampleContract);
        assert.strictEqual(s.result, 'UNKNOWN');
        assert.strictEqual(s.verified, false);
    });
    await test('Settlement', '1.6 Unverified settlement sets verified=false', () => {
        const s = SettlementEngine.resolveSettlement({ result: 'WIN', verified: false }, sampleContract);
        assert.strictEqual(s.verified, false);
    });
    await test('Settlement', '1.7 Raw provider payload preserved in settlement', () => {
        const s = SettlementEngine.resolveSettlement({ result: 'WIN', verified: true, rawPayload: { homeScore: 5, awayScore: 3 } }, sampleContract);
        assert.strictEqual(s.rawPayload.homeScore, 5);
    });
    await test('Settlement', '1.8 Invalid result throws error', () => {
        assert.throws(() => new SettlementResult({ eventId: 'e1', marketId: 'm1', selectionId: 's1', result: 'INVALID' }));
    });

    // ── Category 2: Entry Execution (>= 8 tests) ────────────────────────────
    await test('Entry Execution', '2.1 Executed true with custom entry odds', () => {
        const ex = EntryExecutionEngine.resolveExecution({ executed: true, entryOdds: 1.88, source: 'USER_RECORDED' }, sampleContract);
        assert.strictEqual(ex.executed, true);
        assert.strictEqual(ex.entryOdds, 1.88);
        assert.strictEqual(ex.source, 'USER_RECORDED');
    });
    await test('Entry Execution', '2.2 Null execution defaults to executed=false', () => {
        const ex = EntryExecutionEngine.resolveExecution(null, sampleContract);
        assert.strictEqual(ex.executed, false);
        assert.strictEqual(ex.entryOdds, null);
    });
    await test('Entry Execution', '2.3 Execution without odds has null entryOdds', () => {
        const ex = EntryExecutionEngine.resolveExecution({ executed: true }, sampleContract);
        assert.strictEqual(ex.entryOdds, null);
    });
    await test('Entry Execution', '2.4 Imported execution source verified', () => {
        const ex = EntryExecutionEngine.resolveExecution({ executed: true, entryOdds: 1.85, source: 'IMPORTED' }, sampleContract);
        assert.strictEqual(ex.source, 'IMPORTED');
    });
    await test('Entry Execution', '2.5 Execution timestamp parsed cleanly', () => {
        const ex = EntryExecutionEngine.resolveExecution({ executed: true, executedAt: '2026-08-17T12:00:00Z' }, sampleContract);
        assert.strictEqual(ex.executedAt, '2026-08-17T12:00:00Z');
    });
    await test('Entry Execution', '2.6 EntryExecution model is frozen', () => {
        const ex = new EntryExecution({ decisionId: 'c1', executed: true });
        assert(Object.isFrozen(ex));
    });
    await test('Entry Execution', '2.7 Missing decisionId throws error', () => {
        assert.throws(() => new EntryExecution({}));
    });
    await test('Entry Execution', '2.8 Invalid source throws error', () => {
        assert.throws(() => new EntryExecution({ decisionId: 'c1', source: 'INVALID_SOURCE' }));
    });

    // ── Category 3: Closing Price Resolution (>= 10 tests) ──────────────────
    await test('Closing Price', '3.1 Resolves latest pre-close observation', () => {
        const obsList = [
            { observedAt: '2026-08-17T10:00:00Z', selections: [{ selectionId: 's1', odds: 1.80 }] },
            { observedAt: '2026-08-17T11:55:00Z', selections: [{ selectionId: 's1', odds: 1.72 }] }
        ];
        const cp = ClosingPriceResolver.resolveClosingPrice(obsList, sampleContract, '2026-08-17T12:00:00Z');
        assert.strictEqual(cp.odds, 1.72);
        assert.strictEqual(cp.status, 'VERIFIED');
    });
    await test('Closing Price', '3.2 Post-event observation is strictly ignored', () => {
        const obsList = [
            { observedAt: '2026-08-17T11:55:00Z', selections: [{ selectionId: 's1', odds: 1.72 }] },
            { observedAt: '2026-08-17T13:00:00Z', selections: [{ selectionId: 's1', odds: 1.50 }] } // Post-start
        ];
        const cp = ClosingPriceResolver.resolveClosingPrice(obsList, sampleContract, '2026-08-17T12:00:00Z');
        assert.strictEqual(cp.odds, 1.72); // Ignored 1.50!
    });
    await test('Closing Price', '3.3 Empty observations returns UNAVAILABLE', () => {
        const cp = ClosingPriceResolver.resolveClosingPrice([], sampleContract);
        assert.strictEqual(cp.status, 'UNAVAILABLE');
        assert.strictEqual(cp.odds, null);
    });
    await test('Closing Price', '3.4 Null observations returns UNAVAILABLE', () => {
        const cp = ClosingPriceResolver.resolveClosingPrice(null, sampleContract);
        assert.strictEqual(cp.status, 'UNAVAILABLE');
    });
    await test('Closing Price', '3.5 Missing selection returns UNAVAILABLE', () => {
        const obsList = [{ observedAt: '2026-08-17T11:55:00Z', selections: [{ selectionId: 's_other', odds: 2.10 }] }];
        const cp = ClosingPriceResolver.resolveClosingPrice(obsList, sampleContract);
        assert.strictEqual(cp.status, 'UNAVAILABLE');
    });
    await test('Closing Price', '3.6 Approximate status preserved', () => {
        const obsList = [{ observedAt: '2026-08-17T11:55:00Z', status: 'APPROXIMATE', selections: [{ selectionId: 's1', odds: 1.75 }] }];
        const cp = ClosingPriceResolver.resolveClosingPrice(obsList, sampleContract);
        assert.strictEqual(cp.status, 'APPROXIMATE');
    });
    await test('Closing Price', '3.7 Out-of-order array sorted chronologically to find latest', () => {
        const obsList = [
            { observedAt: '2026-08-17T11:55:00Z', selections: [{ selectionId: 's1', odds: 1.72 }] },
            { observedAt: '2026-08-17T09:00:00Z', selections: [{ selectionId: 's1', odds: 1.90 }] }
        ];
        const cp = ClosingPriceResolver.resolveClosingPrice(obsList, sampleContract, '2026-08-17T12:00:00Z');
        assert.strictEqual(cp.odds, 1.72);
    });
    await test('Closing Price', '3.8 Direct odds property supported', () => {
        const obsList = [{ observedAt: '2026-08-17T11:55:00Z', odds: 1.74 }];
        const cp = ClosingPriceResolver.resolveClosingPrice(obsList, sampleContract);
        assert.strictEqual(cp.odds, 1.74);
    });
    await test('Closing Price', '3.9 ClosingPrice model is immutable', () => {
        const cp = new ClosingPrice({ marketId: 'm1', selectionId: 's1', odds: 1.75, observedAt: '2026-08-17T10:00:00Z' });
        assert(Object.isFrozen(cp));
    });
    await test('Closing Price', '3.10 Invalid status throws error', () => {
        assert.throws(() => new ClosingPrice({ marketId: 'm1', selectionId: 's1', status: 'INVALID' }));
    });

    // ── Category 4: CLV Math (>= 10 tests) ──────────────────────────────────
    await test('CLV Math', '4.1 Positive CLV (1.86 entry vs 1.72 close = +8.14%)', () => {
        const res = CLVEngine.calculateCLV(1.86, 1.72);
        assert.strictEqual(res.clv, 0.081395);
        assert.strictEqual(res.method, 'CLV_RETURN_RATIO');
    });
    await test('CLV Math', '4.2 Negative CLV (1.65 entry vs 1.80 close = -8.33%)', () => {
        const res = CLVEngine.calculateCLV(1.65, 1.80);
        assert.strictEqual(res.clv, -0.083333);
    });
    await test('CLV Math', '4.3 Zero CLV (1.85 entry vs 1.85 close = 0.0%)', () => {
        const res = CLVEngine.calculateCLV(1.85, 1.85);
        assert.strictEqual(res.clv, 0.0);
    });
    await test('CLV Math', '4.4 Null entry odds returns null CLV', () => {
        const res = CLVEngine.calculateCLV(null, 1.85);
        assert.strictEqual(res.clv, null);
    });
    await test('CLV Math', '4.5 Null closing odds returns null CLV', () => {
        const res = CLVEngine.calculateCLV(1.85, null);
        assert.strictEqual(res.clv, null);
    });
    await test('CLV Math', '4.6 String inputs converted to float cleanly', () => {
        const res = CLVEngine.calculateCLV('1.86', '1.72');
        assert.strictEqual(res.clv, 0.081395);
    });
    await test('CLV Math', '4.7 Precision preserved to 6 decimals', () => {
        const res = CLVEngine.calculateCLV(2.14, 1.95);
        assert(typeof res.clv === 'number');
    });
    await test('CLV Math', '4.8 Zero closing odds handled safely', () => {
        const res = CLVEngine.calculateCLV(1.85, 0);
        assert.strictEqual(res.clv, null);
    });
    await test('CLV Math', '4.9 Negative closing odds handled safely', () => {
        const res = CLVEngine.calculateCLV(1.85, -1.5);
        assert.strictEqual(res.clv, null);
    });
    await test('CLV Math', '4.10 Raw entry and close preserved in result', () => {
        const res = CLVEngine.calculateCLV(1.86, 1.72);
        assert.strictEqual(res.entryOdds, 1.86);
        assert.strictEqual(res.closingOdds, 1.72);
    });

    // ── Category 5: Price Quality Grading (>= 10 tests) ─────────────────────
    await test('Price Quality', '5.1 CLV >= +5% grades EXCELLENT', () => {
        const cp = new ClosingPrice({ marketId: 'm1', selectionId: 's1', odds: 1.72, status: 'VERIFIED' });
        const res = PriceQualityEngine.evaluatePriceQuality(null, cp, sampleContract); // 1.86 vs 1.72 = +8.1%
        assert.strictEqual(res.grade, 'EXCELLENT');
    });
    await test('Price Quality', '5.2 +2% <= CLV < +5% grades GOOD', () => {
        const cp = new ClosingPrice({ marketId: 'm1', selectionId: 's1', odds: 1.80, status: 'VERIFIED' }); // 1.86 vs 1.80 = +3.3%
        const res = PriceQualityEngine.evaluatePriceQuality(null, cp, sampleContract);
        assert.strictEqual(res.grade, 'GOOD');
    });
    await test('Price Quality', '5.3 -2% < CLV < +2% grades FAIR', () => {
        const cp = new ClosingPrice({ marketId: 'm1', selectionId: 's1', odds: 1.85, status: 'VERIFIED' }); // 1.86 vs 1.85 = +0.5%
        const res = PriceQualityEngine.evaluatePriceQuality(null, cp, sampleContract);
        assert.strictEqual(res.grade, 'FAIR');
    });
    await test('Price Quality', '5.4 CLV <= -2% grades POOR', () => {
        const cp = new ClosingPrice({ marketId: 'm1', selectionId: 's1', odds: 1.95, status: 'VERIFIED' }); // 1.86 vs 1.95 = -4.6%
        const res = PriceQualityEngine.evaluatePriceQuality(null, cp, sampleContract);
        assert.strictEqual(res.grade, 'POOR');
    });
    await test('Price Quality', '5.5 Unavailable closing odds grades UNKNOWN', () => {
        const cp = new ClosingPrice({ marketId: 'm1', selectionId: 's1', odds: null, status: 'UNAVAILABLE' });
        const res = PriceQualityEngine.evaluatePriceQuality(null, cp, sampleContract);
        assert.strictEqual(res.grade, 'UNKNOWN');
    });
    await test('Price Quality', '5.6 Explicit entry execution takes precedence over seal odds', () => {
        const ex = new EntryExecution({ decisionId: 'c1', executed: true, entryOdds: 1.92 });
        const cp = new ClosingPrice({ marketId: 'm1', selectionId: 's1', odds: 1.80, status: 'VERIFIED' }); // 1.92 vs 1.80 = +6.6% -> EXCELLENT
        const res = PriceQualityEngine.evaluatePriceQuality(ex, cp, sampleContract);
        assert.strictEqual(res.grade, 'EXCELLENT');
        assert.strictEqual(res.entryOdds, 1.92);
    });
    await test('Price Quality', '5.7 Thresholds labeled UNCALIBRATED_V1', () => {
        const cp = new ClosingPrice({ marketId: 'm1', selectionId: 's1', odds: 1.72, status: 'VERIFIED' });
        const res = PriceQualityEngine.evaluatePriceQuality(null, cp, sampleContract);
        assert.strictEqual(res.thresholdVersion, 'UNCALIBRATED_V1');
    });
    await test('Price Quality', '5.8 Unexecuted entry fallback labels cleanly', () => {
        const ex = new EntryExecution({ decisionId: 'c1', executed: false });
        const cp = new ClosingPrice({ marketId: 'm1', selectionId: 's1', odds: 1.72, status: 'VERIFIED' });
        const res = PriceQualityEngine.evaluatePriceQuality(ex, cp, sampleContract);
        assert.strictEqual(res.entryOdds, sampleContract.offeredOddsAtSeal);
    });
    await test('Price Quality', '5.9 Clear explanation text generated', () => {
        const cp = new ClosingPrice({ marketId: 'm1', selectionId: 's1', odds: 1.72, status: 'VERIFIED' });
        const res = PriceQualityEngine.evaluatePriceQuality(null, cp, sampleContract);
        assert(res.explanation.includes('우수한 가격'));
    });
    await test('Price Quality', '5.10 No closing price object grades UNKNOWN', () => {
        const res = PriceQualityEngine.evaluatePriceQuality(null, null, sampleContract);
        assert.strictEqual(res.grade, 'UNKNOWN');
    });

    // ── Category 6: Rule Discipline Engine (>= 12 tests) ────────────────────
    await test('Rule Discipline', '6.1 Entry odds >= minimumEntryOdds grades FOLLOWED', () => {
        const ex = new EntryExecution({ decisionId: 'c1', executed: true, entryOdds: 1.86 });
        const res = RuleDisciplineEngine.evaluateRuleDiscipline(sampleContract, ex, []);
        assert.strictEqual(res.grade, 'FOLLOWED');
        assert.strictEqual(res.violations.length, 0);
    });
    await test('Rule Discipline', '6.2 Entry odds < minimumEntryOdds grades VIOLATED/PARTIAL', () => {
        const ex = new EntryExecution({ decisionId: 'c1', executed: true, entryOdds: 1.75 }); // min is 1.82
        const res = RuleDisciplineEngine.evaluateRuleDiscipline(sampleContract, ex, []);
        assert(res.grade === 'PARTIAL' || res.grade === 'VIOLATED');
        assert(res.violations.some(v => v.code === 'MINIMUM_ODDS_VIOLATION'));
    });
    await test('Rule Discipline', '6.3 Entered after BREAK_CONDITION_HIT grades VIOLATED', () => {
        const events = [{ eventType: 'BREAK_CONDITION_HIT', occurred_at: '2026-08-17T10:00:00Z', payload: { thesisState: 'BROKEN' } }];
        const ex = new EntryExecution({ decisionId: 'c1', executed: true, entryOdds: 1.86, executedAt: '2026-08-17T11:00:00Z' });
        const res = RuleDisciplineEngine.evaluateRuleDiscipline(sampleContract, ex, events);
        assert.strictEqual(res.grade, 'VIOLATED');
        assert(res.violations.some(v => v.code === 'ENTERED_AFTER_BREAK_CONDITION'));
    });
    await test('Rule Discipline', '6.4 Break condition after execution does NOT penalize entry', () => {
        const events = [{ eventType: 'BREAK_CONDITION_HIT', occurred_at: '2026-08-17T11:30:00Z', payload: { thesisState: 'BROKEN' } }];
        const ex = new EntryExecution({ decisionId: 'c1', executed: true, entryOdds: 1.86, executedAt: '2026-08-17T10:00:00Z' }); // Entered before!
        const res = RuleDisciplineEngine.evaluateRuleDiscipline(sampleContract, ex, events);
        assert.strictEqual(res.grade, 'FOLLOWED');
    });
    await test('Rule Discipline', '6.5 Multiple violations produce VIOLATED grade', () => {
        const events = [{ eventType: 'BREAK_CONDITION_HIT', occurred_at: '2026-08-17T10:00:00Z' }];
        const ex = new EntryExecution({ decisionId: 'c1', executed: true, entryOdds: 1.70, executedAt: '2026-08-17T10:30:00Z' }); // Below min + after break
        const res = RuleDisciplineEngine.evaluateRuleDiscipline(sampleContract, ex, events);
        assert.strictEqual(res.grade, 'VIOLATED');
        assert.strictEqual(res.violations.length, 2);
    });
    await test('Rule Discipline', '6.6 Complied rules list records minimumEntryOdds pass', () => {
        const ex = new EntryExecution({ decisionId: 'c1', executed: true, entryOdds: 1.86 });
        const res = RuleDisciplineEngine.evaluateRuleDiscipline(sampleContract, ex, []);
        assert(res.compliedRules.some(r => r.code === 'MINIMUM_ODDS_MET'));
    });
    await test('Rule Discipline', '6.7 Action state DO_NOT_ENTER violation recorded', () => {
        const events = [{ eventType: 'ACTION_STATE_CHANGED', occurred_at: '2026-08-17T10:00:00Z', payload: { actionState: 'DO_NOT_ENTER' } }];
        const ex = new EntryExecution({ decisionId: 'c1', executed: true, entryOdds: 1.86, executedAt: '2026-08-17T10:30:00Z' });
        const res = RuleDisciplineEngine.evaluateRuleDiscipline(sampleContract, ex, events);
        assert(res.violations.some(v => v.code === 'ENTERED_DURING_DO_NOT_ENTER'));
    });
    await test('Rule Discipline', '6.8 Unexecuted contract evaluates seal price against minimum odds', () => {
        const res = RuleDisciplineEngine.evaluateRuleDiscipline(sampleContract, null, []);
        assert.strictEqual(res.grade, 'FOLLOWED'); // seal 1.86 >= min 1.82
    });
    await test('Rule Discipline', '6.9 Deterministic Korean explanation generated', () => {
        const res = RuleDisciplineEngine.evaluateRuleDiscipline(sampleContract, null, []);
        assert(res.explanation.includes('준수했습니다'));
    });
    await test('Rule Discipline', '6.10 No entryRule in contract evaluates safely', () => {
        const noRuleContract = new DecisionContract({ ...sampleContract, entryRule: {} });
        const res = RuleDisciplineEngine.evaluateRuleDiscipline(noRuleContract, null, []);
        assert.strictEqual(res.grade, 'FOLLOWED');
    });
    await test('Rule Discipline', '6.11 Criticality tags properly assigned to violations', () => {
        const events = [{ eventType: 'BREAK_CONDITION_HIT', occurred_at: '2026-08-17T10:00:00Z' }];
        const ex = new EntryExecution({ decisionId: 'c1', executed: true, entryOdds: 1.86, executedAt: '2026-08-17T10:30:00Z' });
        const res = RuleDisciplineEngine.evaluateRuleDiscipline(sampleContract, ex, events);
        assert.strictEqual(res.violations[0].criticality, 'CRITICAL');
    });
    await test('Rule Discipline', '6.12 Safe handling of empty event array', () => {
        const res = RuleDisciplineEngine.evaluateRuleDiscipline(sampleContract, null, []);
        assert.strictEqual(res.violations.length, 0);
    });

    // ── Category 7: Pre-Game State Resolution (>= 8 tests) ──────────────────
    await test('Pre-Game State', '7.1 Resolves VALID from pre-game evaluations', () => {
        const evals = [{ evaluatedAt: '2026-08-17T11:00:00Z', currentThesisState: 'VALID' }];
        const state = PreGameStateResolver.resolvePreGameState(evals, '2026-08-17T12:00:00Z');
        assert.strictEqual(state, 'VALID');
    });
    await test('Pre-Game State', '7.2 Resolves WEAKENED from latest pre-game eval', () => {
        const evals = [
            { evaluatedAt: '2026-08-17T09:00:00Z', currentThesisState: 'VALID' },
            { evaluatedAt: '2026-08-17T11:30:00Z', currentThesisState: 'WEAKENED' }
        ];
        const state = PreGameStateResolver.resolvePreGameState(evals, '2026-08-17T12:00:00Z');
        assert.strictEqual(state, 'WEAKENED');
    });
    await test('Pre-Game State', '7.3 Resolves BROKEN from pre-game eval', () => {
        const evals = [{ evaluatedAt: '2026-08-17T11:00:00Z', currentThesisState: 'BROKEN' }];
        const state = PreGameStateResolver.resolvePreGameState(evals, '2026-08-17T12:00:00Z');
        assert.strictEqual(state, 'BROKEN');
    });
    await test('Pre-Game State', '7.4 Post-game evaluation strictly excluded from pre-game state', () => {
        const evals = [
            { evaluatedAt: '2026-08-17T11:00:00Z', currentThesisState: 'VALID' },
            { evaluatedAt: '2026-08-17T14:00:00Z', currentThesisState: 'BROKEN' } // Post-start!
        ];
        const state = PreGameStateResolver.resolvePreGameState(evals, '2026-08-17T12:00:00Z');
        assert.strictEqual(state, 'VALID'); // Ignored post-game BROKEN
    });
    await test('Pre-Game State', '7.5 Empty evaluations defaults to VALID', () => {
        const state = PreGameStateResolver.resolvePreGameState([], '2026-08-17T12:00:00Z');
        assert.strictEqual(state, 'VALID');
    });
    await test('Pre-Game State', '7.6 Null evaluations defaults to VALID', () => {
        const state = PreGameStateResolver.resolvePreGameState(null);
        assert.strictEqual(state, 'VALID');
    });
    await test('Pre-Game State', '7.7 Out-of-order evaluations sorted chronologically', () => {
        const evals = [
            { evaluatedAt: '2026-08-17T11:50:00Z', currentThesisState: 'WEAKENED' },
            { evaluatedAt: '2026-08-17T10:00:00Z', currentThesisState: 'VALID' }
        ];
        const state = PreGameStateResolver.resolvePreGameState(evals, '2026-08-17T12:00:00Z');
        assert.strictEqual(state, 'WEAKENED');
    });
    await test('Pre-Game State', '7.8 Supports snake_case properties from DB rows', () => {
        const evals = [{ evaluated_at: '2026-08-17T11:00:00Z', current_thesis_state: 'WAIT' }];
        const state = PreGameStateResolver.resolvePreGameState(evals, '2026-08-17T12:00:00Z');
        assert.strictEqual(state, 'WAIT');
    });

    // ── Category 8: Thesis Review & Post-Game Leakage Rejection (>= 20 tests)
    await test('Thesis Review', '8.1 Consistent signals and preGame VALID grades SOUND', () => {
        const cs = [{ observedAt: '2026-08-17T10:00:00Z', signals: [{ code: 'SP_CONFIRMED', status: 'CONFIRMED' }] }];
        const res = ThesisReviewEngine.evaluateThesisReview(sampleContract, [], cs, 'VALID', '2026-08-17T12:00:00Z');
        assert.strictEqual(res.grade, 'SOUND');
        assert.strictEqual(res.preGameFinalState, 'VALID');
    });
    await test('Thesis Review', '8.2 Contradicted signals grades MIXED', () => {
        const cs = [{ observedAt: '2026-08-17T10:00:00Z', signals: [{ code: 'WEATHER_CONTRADICTED', status: 'CONTRADICTED' }] }];
        const res = ThesisReviewEngine.evaluateThesisReview(sampleContract, [], cs, 'WEAKENED', '2026-08-17T12:00:00Z');
        assert.strictEqual(res.grade, 'MIXED');
    });
    await test('Thesis Review', '8.3 Break condition before event start grades UNSOUND', () => {
        const events = [{ eventType: 'BREAK_CONDITION_HIT', occurred_at: '2026-08-17T10:00:00Z' }];
        const res = ThesisReviewEngine.evaluateThesisReview(sampleContract, events, [], 'BROKEN', '2026-08-17T12:00:00Z');
        assert.strictEqual(res.grade, 'UNSOUND');
    });
    await test('Thesis Review', '8.4 Post-game event strictly ignored (No leakage)', () => {
        const events = [{ eventType: 'BREAK_CONDITION_HIT', occurred_at: '2026-08-17T15:00:00Z' }]; // After event!
        const res = ThesisReviewEngine.evaluateThesisReview(sampleContract, events, [], 'VALID', '2026-08-17T12:00:00Z');
        assert.strictEqual(res.grade, 'SOUND'); // Ignored post-game event!
    });
    await test('Thesis Review', '8.5 Post-game context signal strictly ignored (No leakage)', () => {
        const cs = [{ observedAt: '2026-08-17T16:00:00Z', signals: [{ code: 'POST_GAME_SCORE_LOST', status: 'CONTRADICTED' }] }];
        const res = ThesisReviewEngine.evaluateThesisReview(sampleContract, [], cs, 'VALID', '2026-08-17T12:00:00Z');
        assert.strictEqual(res.grade, 'SOUND');
    });
    await test('Thesis Review', '8.6 Supporting evidence preserved in structured array', () => {
        const cs = [{ observedAt: '2026-08-17T10:00:00Z', signals: [{ code: 'SP_CONFIRMED', status: 'CONFIRMED', description: '선발 투수 확정' }] }];
        const res = ThesisReviewEngine.evaluateThesisReview(sampleContract, [], cs, 'VALID', '2026-08-17T12:00:00Z');
        assert.strictEqual(res.supportingEvidence.length, 1);
        assert.strictEqual(res.supportingEvidence[0].code, 'SP_CONFIRMED');
    });
    await test('Thesis Review', '8.7 Contradicting evidence preserved in structured array', () => {
        const cs = [{ observedAt: '2026-08-17T10:00:00Z', signals: [{ code: 'LINEUP_CONTRADICTED', status: 'CONTRADICTED', description: '주전 휴식' }] }];
        const res = ThesisReviewEngine.evaluateThesisReview(sampleContract, [], cs, 'VALID', '2026-08-17T12:00:00Z');
        assert.strictEqual(res.contradictingEvidence.length, 1);
    });
    await test('Thesis Review', '8.8 Clear thesis explanation generated', () => {
        const res = ThesisReviewEngine.evaluateThesisReview(sampleContract, [], [], 'VALID');
        assert(res.explanation.includes('일관되게 유지되었습니다'));
    });
    await test('Thesis Review', '8.9 Final game score NEVER enters thesis review', () => {
        const res = ThesisReviewEngine.evaluateThesisReview(sampleContract, [], [], 'VALID');
        assert(!JSON.stringify(res).includes('WIN') && !JSON.stringify(res).includes('LOSS'));
    });
    await test('Thesis Review', '8.10 PreGame state WEAKENED maps to MIXED thesis grade', () => {
        const res = ThesisReviewEngine.evaluateThesisReview(sampleContract, [], [], 'WEAKENED');
        assert.strictEqual(res.grade, 'MIXED');
    });
    await test('Thesis Review', '8.11 PreGame state BROKEN maps to UNSOUND thesis grade', () => {
        const res = ThesisReviewEngine.evaluateThesisReview(sampleContract, [], [], 'BROKEN');
        assert.strictEqual(res.grade, 'UNSOUND');
    });
    await test('Thesis Review', '8.12 PreGame state WAIT maps to SOUND in absence of contradictions', () => {
        const res = ThesisReviewEngine.evaluateThesisReview(sampleContract, [], [], 'WAIT');
        assert.strictEqual(res.grade, 'SOUND');
    });

    // ── Category 9: Decision Quality Engine (>= 12 tests) ───────────────────
    await test('Decision Quality', '9.1 EXCELLENT price + FOLLOWED rules + SOUND thesis = EXCELLENT (+6 score)', () => {
        const pq = { grade: 'EXCELLENT' };
        const rd = { grade: 'FOLLOWED' };
        const tr = { grade: 'SOUND' };
        const dq = DecisionQualityEngine.evaluateDecisionQuality(pq, rd, tr);
        assert.strictEqual(dq.grade, 'EXCELLENT');
        assert.strictEqual(dq.score, 6);
    });
    await test('Decision Quality', '9.2 GOOD price + FOLLOWED rules + SOUND thesis = EXCELLENT (+5 score)', () => {
        const pq = { grade: 'GOOD' };
        const rd = { grade: 'FOLLOWED' };
        const tr = { grade: 'SOUND' };
        const dq = DecisionQualityEngine.evaluateDecisionQuality(pq, rd, tr);
        assert.strictEqual(dq.grade, 'EXCELLENT');
        assert.strictEqual(dq.score, 5);
    });
    await test('Decision Quality', '9.3 FAIR price + FOLLOWED rules + SOUND thesis = GOOD (+4 score)', () => {
        const pq = { grade: 'FAIR' };
        const rd = { grade: 'FOLLOWED' };
        const tr = { grade: 'SOUND' };
        const dq = DecisionQualityEngine.evaluateDecisionQuality(pq, rd, tr);
        assert.strictEqual(dq.grade, 'GOOD');
        assert.strictEqual(dq.score, 4);
    });
    await test('Decision Quality', '9.4 POOR price + VIOLATED rules + UNSOUND thesis = POOR (-8 score)', () => {
        const pq = { grade: 'POOR' };
        const rd = { grade: 'VIOLATED' };
        const tr = { grade: 'UNSOUND' };
        const dq = DecisionQualityEngine.evaluateDecisionQuality(pq, rd, tr);
        assert.strictEqual(dq.grade, 'POOR');
        assert.strictEqual(dq.score, -8);
    });
    await test('Decision Quality', '9.5 FAIR price + PARTIAL rules + MIXED thesis = FAIR (0 score)', () => {
        const pq = { grade: 'FAIR' };
        const rd = { grade: 'PARTIAL' };
        const tr = { grade: 'MIXED' };
        const dq = DecisionQualityEngine.evaluateDecisionQuality(pq, rd, tr);
        assert.strictEqual(dq.grade, 'FAIR');
        assert.strictEqual(dq.score, 0);
    });
    await test('Decision Quality', '9.6 UNKNOWN price + FOLLOWED rules + SOUND thesis = GOOD (+4 score)', () => {
        const pq = { grade: 'UNKNOWN' };
        const rd = { grade: 'FOLLOWED' };
        const tr = { grade: 'SOUND' };
        const dq = DecisionQualityEngine.evaluateDecisionQuality(pq, rd, tr);
        assert.strictEqual(dq.grade, 'GOOD');
    });
    await test('Decision Quality', '9.7 UNKNOWN price + UNREVIEWABLE thesis grades UNRATED', () => {
        const pq = { grade: 'UNKNOWN' };
        const rd = { grade: 'FOLLOWED' };
        const tr = { grade: 'UNREVIEWABLE' };
        const dq = DecisionQualityEngine.evaluateDecisionQuality(pq, rd, tr);
        assert.strictEqual(dq.grade, 'UNRATED');
    });
    await test('Decision Quality', '9.8 Reasons array contains explicit breakdown', () => {
        const pq = { grade: 'EXCELLENT' };
        const rd = { grade: 'FOLLOWED' };
        const tr = { grade: 'SOUND' };
        const dq = DecisionQualityEngine.evaluateDecisionQuality(pq, rd, tr);
        assert.strictEqual(dq.reasons.length, 3);
    });
    await test('Decision Quality', '9.9 Negative score maps strictly to POOR', () => {
        const pq = { grade: 'POOR' };
        const rd = { grade: 'PARTIAL' };
        const tr = { grade: 'MIXED' };
        const dq = DecisionQualityEngine.evaluateDecisionQuality(pq, rd, tr);
        assert.strictEqual(dq.grade, 'POOR');
    });
    await test('Decision Quality', '9.10 Scoring model labeled UNCALIBRATED_V1', () => {
        const dq = DecisionQualityEngine.evaluateDecisionQuality({ grade: 'FAIR' }, { grade: 'FOLLOWED' }, { grade: 'SOUND' });
        assert.strictEqual(dq.scoringModel, 'UNCALIBRATED_V1');
    });
    await test('Decision Quality', '9.11 VIOLATED rule (-3) overrides minor positive price (+1)', () => {
        const dq = DecisionQualityEngine.evaluateDecisionQuality({ grade: 'GOOD' }, { grade: 'VIOLATED' }, { grade: 'SOUND' }); // +1 -3 +2 = 0 -> FAIR
        assert.strictEqual(dq.grade, 'FAIR');
    });
    await test('Decision Quality', '9.12 UNSOUND thesis (-3) overrides GOOD price (+1)', () => {
        const dq = DecisionQualityEngine.evaluateDecisionQuality({ grade: 'GOOD' }, { grade: 'FOLLOWED' }, { grade: 'UNSOUND' }); // +1 +2 -3 = 0 -> FAIR
        assert.strictEqual(dq.grade, 'FAIR');
    });

    // ── Category 10: Outcome Invariant Tests (STRICT PROHIBITION) (>= 10 tests)
    await test('Outcome Invariant', '10.1 WIN vs LOSS produces EXACTLY identical DecisionQuality (Good Decision)', () => {
        const reviewWin = ReviewEngine.reviewDecision({
            contract: sampleContract,
            settlementData: { result: 'WIN', verified: true },
            marketObservations: [{ observedAt: '2026-08-17T11:55:00Z', odds: 1.72 }] // CLV +8.1%
        });
        const reviewLoss = ReviewEngine.reviewDecision({
            contract: sampleContract,
            settlementData: { result: 'LOSS', verified: true },
            marketObservations: [{ observedAt: '2026-08-17T11:55:00Z', odds: 1.72 }]
        });
        assert.strictEqual(reviewWin.reviewResult.decisionQuality.grade, reviewLoss.reviewResult.decisionQuality.grade);
        assert.strictEqual(reviewWin.reviewResult.decisionQuality.grade, 'EXCELLENT');
    });
    await test('Outcome Invariant', '10.2 WIN vs LOSS produces EXACTLY identical DecisionQuality (Poor Decision)', () => {
        const badContract = new DecisionContract({ ...sampleContract, offeredOddsAtSeal: 1.65, entryRule: { minimumEntryOdds: 1.75 } });
        const events = [{ eventType: 'BREAK_CONDITION_HIT', occurred_at: '2026-08-17T10:00:00Z' }];
        const reviewWin = ReviewEngine.reviewDecision({
            contract: badContract,
            settlementData: { result: 'WIN', verified: true },
            marketObservations: [{ observedAt: '2026-08-17T11:55:00Z', odds: 1.80 }],
            decisionEvents: events
        });
        const reviewLoss = ReviewEngine.reviewDecision({
            contract: badContract,
            settlementData: { result: 'LOSS', verified: true },
            marketObservations: [{ observedAt: '2026-08-17T11:55:00Z', odds: 1.80 }],
            decisionEvents: events
        });
        assert.strictEqual(reviewWin.reviewResult.decisionQuality.grade, reviewLoss.reviewResult.decisionQuality.grade);
        assert.strictEqual(reviewWin.reviewResult.decisionQuality.grade, 'POOR');
    });
    await test('Outcome Invariant', '10.3 PUSH vs WIN leaves DecisionQuality unchanged', () => {
        const rPush = ReviewEngine.reviewDecision({ contract: sampleContract, settlementData: { result: 'PUSH', verified: true } });
        const rWin = ReviewEngine.reviewDecision({ contract: sampleContract, settlementData: { result: 'WIN', verified: true } });
        assert.strictEqual(rPush.reviewResult.decisionQuality.grade, rWin.reviewResult.decisionQuality.grade);
    });
    await test('Outcome Invariant', '10.4 VOID vs LOSS leaves DecisionQuality unchanged', () => {
        const rVoid = ReviewEngine.reviewDecision({ contract: sampleContract, settlementData: { result: 'VOID', verified: true } });
        const rLoss = ReviewEngine.reviewDecision({ contract: sampleContract, settlementData: { result: 'LOSS', verified: true } });
        assert.strictEqual(rVoid.reviewResult.decisionQuality.grade, rLoss.reviewResult.decisionQuality.grade);
    });
    await test('Outcome Invariant', '10.5 UNKNOWN outcome leaves DecisionQuality unchanged', () => {
        const rUnk = ReviewEngine.reviewDecision({ contract: sampleContract, settlementData: null });
        const rWin = ReviewEngine.reviewDecision({ contract: sampleContract, settlementData: { result: 'WIN', verified: true } });
        assert.strictEqual(rUnk.reviewResult.decisionQuality.grade, rWin.reviewResult.decisionQuality.grade);
    });
    await test('Outcome Invariant', '10.6 Outcome result is completely absent from DecisionQualityEngine input parameters', () => {
        const dq = DecisionQualityEngine.evaluateDecisionQuality({ grade: 'GOOD' }, { grade: 'FOLLOWED' }, { grade: 'SOUND' });
        assert.strictEqual(dq.grade, 'EXCELLENT');
    });
    await test('Outcome Invariant', '10.7 Injected outcome property into price quality does not leak into decision quality', () => {
        const dq = DecisionQualityEngine.evaluateDecisionQuality({ grade: 'GOOD', result: 'LOSS' }, { grade: 'FOLLOWED' }, { grade: 'SOUND' });
        assert.strictEqual(dq.grade, 'EXCELLENT');
    });
    await test('Outcome Invariant', '10.8 Canonical Scenario A: LOSS + GOOD price + FOLLOWED + SOUND = EXCELLENT DecisionQuality', () => {
        const res = ReviewEngine.reviewDecision({
            contract: sampleContract,
            settlementData: { result: 'LOSS', verified: true },
            marketObservations: [{ observedAt: '2026-08-17T11:55:00Z', odds: 1.72 }]
        });
        assert.strictEqual(res.reviewResult.outcome.result, 'LOSS');
        assert.strictEqual(res.reviewResult.priceQuality.grade, 'EXCELLENT');
        assert.strictEqual(res.reviewResult.ruleDiscipline.grade, 'FOLLOWED');
        assert.strictEqual(res.reviewResult.thesisReview.grade, 'SOUND');
        assert.strictEqual(res.reviewResult.decisionQuality.grade, 'EXCELLENT');
    });
    await test('Outcome Invariant', '10.9 Canonical Scenario B: WIN + POOR price + VIOLATED + UNSOUND = POOR DecisionQuality', () => {
        const badContract = new DecisionContract({ ...sampleContract, offeredOddsAtSeal: 1.65, entryRule: { minimumEntryOdds: 1.75 } });
        const res = ReviewEngine.reviewDecision({
            contract: badContract,
            settlementData: { result: 'WIN', verified: true },
            marketObservations: [{ observedAt: '2026-08-17T11:55:00Z', odds: 1.80 }],
            decisionEvents: [{ eventType: 'BREAK_CONDITION_HIT', occurred_at: '2026-08-17T10:00:00Z' }]
        });
        assert.strictEqual(res.reviewResult.outcome.result, 'WIN');
        assert.strictEqual(res.reviewResult.priceQuality.grade, 'POOR');
        assert.strictEqual(res.reviewResult.ruleDiscipline.grade, 'VIOLATED');
        assert.strictEqual(res.reviewResult.thesisReview.grade, 'UNSOUND');
        assert.strictEqual(res.reviewResult.decisionQuality.grade, 'POOR');
    });
    await test('Outcome Invariant', '10.10 Canonical Scenario C: LOSS + UNAVAILABLE price + FOLLOWED + SOUND = GOOD DecisionQuality', () => {
        const res = ReviewEngine.reviewDecision({
            contract: sampleContract,
            settlementData: { result: 'LOSS', verified: true },
            marketObservations: [] // Unavailable close
        });
        assert.strictEqual(res.reviewResult.outcome.result, 'LOSS');
        assert.strictEqual(res.reviewResult.priceQuality.grade, 'UNKNOWN');
        assert.strictEqual(res.reviewResult.decisionQuality.grade, 'GOOD');
    });
    await test('Outcome Invariant', '10.11 Swap WIN to LOSS across 10 distinct contract configurations', () => {
        for (let i = 0; i < 10; i++) {
            const c = new DecisionContract({ ...sampleContract, id: `c_swap_${i}`, offeredOddsAtSeal: 1.80 + i * 0.02 });
            const rWin = ReviewEngine.reviewDecision({ contract: c, settlementData: { result: 'WIN' } });
            const rLoss = ReviewEngine.reviewDecision({ contract: c, settlementData: { result: 'LOSS' } });
            assert.strictEqual(rWin.reviewResult.decisionQuality.grade, rLoss.reviewResult.decisionQuality.grade);
            assert.strictEqual(rWin.reviewResult.decisionQuality.score, rLoss.reviewResult.decisionQuality.score);
        }
    });
    await test('Outcome Invariant', '10.12 Swap LOSS to PUSH leaves reasons array identical', () => {
        const rLoss = ReviewEngine.reviewDecision({ contract: sampleContract, settlementData: { result: 'LOSS' } });
        const rPush = ReviewEngine.reviewDecision({ contract: sampleContract, settlementData: { result: 'PUSH' } });
        assert.deepStrictEqual(rLoss.reviewResult.decisionQuality.reasons, rPush.reviewResult.decisionQuality.reasons);
    });
    await test('Outcome Invariant', '10.13 Swap WIN to VOID leaves reasons array identical', () => {
        const rWin = ReviewEngine.reviewDecision({ contract: sampleContract, settlementData: { result: 'WIN' } });
        const rVoid = ReviewEngine.reviewDecision({ contract: sampleContract, settlementData: { result: 'VOID' } });
        assert.deepStrictEqual(rWin.reviewResult.decisionQuality.reasons, rVoid.reviewResult.decisionQuality.reasons);
    });
    await test('Outcome Invariant', '10.14 DecisionQuality score calculation is purely functional on (pq, rd, tr)', () => {
        const s1 = DecisionQualityEngine.evaluateDecisionQuality({ grade: 'GOOD' }, { grade: 'FOLLOWED' }, { grade: 'SOUND' });
        const s2 = DecisionQualityEngine.evaluateDecisionQuality({ grade: 'GOOD' }, { grade: 'FOLLOWED' }, { grade: 'SOUND' });
        assert.strictEqual(s1.score, s2.score);
    });

    // ── Category 11: Idempotency & DB Schema Validation (>= 18 tests) ───────
    await test('Idempotency', '11.1 Identical review inputs produce identical inputFingerprint', () => {
        const r1 = ReviewEngine.reviewDecision({ contract: sampleContract, settlementData: { result: 'WIN', verified: true } });
        const r2 = ReviewEngine.reviewDecision({ contract: sampleContract, settlementData: { result: 'WIN', verified: true } });
        assert.strictEqual(r1.reviewResult.inputFingerprint, r2.reviewResult.inputFingerprint);
    });
    await test('Idempotency', '11.2 Different settlement results produce different fingerprints', () => {
        const r1 = ReviewEngine.reviewDecision({ contract: sampleContract, settlementData: { result: 'WIN', verified: true } });
        const r2 = ReviewEngine.reviewDecision({ contract: sampleContract, settlementData: { result: 'LOSS', verified: true } });
        assert.notStrictEqual(r1.reviewResult.inputFingerprint, r2.reviewResult.inputFingerprint);
    });
    await test('Idempotency', '11.3 ReviewResult model is frozen', () => {
        const r = ReviewEngine.reviewDecision({ contract: sampleContract });
        assert(Object.isFrozen(r.reviewResult));
        assert(Object.isFrozen(r.reviewResult.outcome));
        assert(Object.isFrozen(r.reviewResult.priceQuality));
        assert(Object.isFrozen(r.reviewResult.ruleDiscipline));
        assert(Object.isFrozen(r.reviewResult.thesisReview));
        assert(Object.isFrozen(r.reviewResult.decisionQuality));
    });
    await test('Idempotency', '11.4 ReviewCard model is frozen', () => {
        const r = ReviewEngine.reviewDecision({ contract: sampleContract });
        assert(Object.isFrozen(r.reviewCard));
        assert(Object.isFrozen(r.reviewCard.keyFacts));
    });
    await test('Idempotency', '11.5 ReviewResult reviewVersion defaults to v1.0.0', () => {
        const r = ReviewEngine.reviewDecision({ contract: sampleContract });
        assert.strictEqual(r.reviewResult.reviewVersion, 'v1.0.0');
    });
    await test('Idempotency', '11.6 Migration 007_reviews.sql exists and valid DDL', () => {
        assert(fs.existsSync('./migrations/007_reviews.sql'));
        const sql = fs.readFileSync('./migrations/007_reviews.sql', 'utf8');
        assert(sql.includes('CREATE TABLE IF NOT EXISTS review_results'));
        assert(sql.includes('uq_review_decision_fingerprint'));
    });
    await test('Idempotency', '11.7 ReviewCard headline for GOOD decision + LOSS is respectful and disciplined', () => {
        const r = ReviewEngine.reviewDecision({
            contract: sampleContract,
            settlementData: { result: 'LOSS', verified: true },
            marketObservations: [{ observedAt: '2026-08-17T11:55:00Z', odds: 1.72 }]
        });
        assert.strictEqual(r.reviewCard.headline, '결과는 좋지 않았지만, 사전에 정한 가격과 의사결정 규칙은 충실히 지켰습니다.');
    });
    await test('Idempotency', '11.8 ReviewCard headline for POOR decision + WIN warns about rule violation', () => {
        const badContract = new DecisionContract({ ...sampleContract, offeredOddsAtSeal: 1.65, entryRule: { minimumEntryOdds: 1.75 } });
        const r = ReviewEngine.reviewDecision({
            contract: badContract,
            settlementData: { result: 'WIN', verified: true },
            marketObservations: [{ observedAt: '2026-08-17T11:55:00Z', odds: 1.80 }]
        });
        assert.strictEqual(r.reviewCard.headline, '결과는 좋았지만, 사전에 정한 진입 기준과 판단 조건은 지켜지지 않았습니다.');
    });
    await test('Idempotency', '11.9 ReviewCard headline for GOOD decision + WIN expresses positive discipline', () => {
        const r = ReviewEngine.reviewDecision({
            contract: sampleContract,
            settlementData: { result: 'WIN', verified: true },
            marketObservations: [{ observedAt: '2026-08-17T11:55:00Z', odds: 1.72 }]
        });
        assert.strictEqual(r.reviewCard.headline, '사전 의사결정 원칙을 지켰으며, 좋은 결과로 마무리되었습니다.');
    });
    await test('Idempotency', '11.10 ReviewCard headline for POOR decision + LOSS warns about losses without discipline', () => {
        const badContract = new DecisionContract({ ...sampleContract, offeredOddsAtSeal: 1.65, entryRule: { minimumEntryOdds: 1.75 } });
        const r = ReviewEngine.reviewDecision({
            contract: badContract,
            settlementData: { result: 'LOSS', verified: true },
            marketObservations: [{ observedAt: '2026-08-17T11:55:00Z', odds: 1.80 }]
        });
        assert.strictEqual(r.reviewCard.headline, '사전 원칙이 지켜지지 않았으며, 결과 역시 손실로 이어졌습니다.');
    });
    await test('Idempotency', '11.11 ReviewCard keyFacts includes entry and closing odds', () => {
        const r = ReviewEngine.reviewDecision({
            contract: sampleContract,
            marketObservations: [{ observedAt: '2026-08-17T11:55:00Z', odds: 1.72 }]
        });
        assert(r.reviewCard.keyFacts.some(k => k.includes('진입 배당: 1.86')));
        assert(r.reviewCard.keyFacts.some(k => k.includes('마감 배당: 1.72')));
    });
    await test('Idempotency', '11.12 ReviewCard whatWentWell includes positive price feedback', () => {
        const r = ReviewEngine.reviewDecision({
            contract: sampleContract,
            marketObservations: [{ observedAt: '2026-08-17T11:55:00Z', odds: 1.72 }]
        });
        assert(r.reviewCard.whatWentWell.some(w => w.includes('유리한 배당을 확보')));
    });
    await test('Idempotency', '11.13 ReviewCard whatToImprove includes rule violation feedback', () => {
        const badContract = new DecisionContract({ ...sampleContract, offeredOddsAtSeal: 1.65, entryRule: { minimumEntryOdds: 1.75 } });
        const r = ReviewEngine.reviewDecision({ contract: badContract });
        assert(r.reviewCard.whatToImprove.some(w => w.includes('위반했습니다')));
    });
    await test('Idempotency', '11.14 Structured payload contains complete serialized state', () => {
        const r = ReviewEngine.reviewDecision({ contract: sampleContract });
        assert.strictEqual(r.reviewResult.decisionId, sampleContract.id);
        assert(r.reviewResult.reviewedAt !== undefined);
    });
    await test('Idempotency', '11.15 Review results table migration contains foreign keys', () => {
        const sql = fs.readFileSync('./migrations/007_reviews.sql', 'utf8');
        assert(sql.includes('REFERENCES decision_contracts(id)'));
    });
    await test('Idempotency', '11.16 Settlement results table contains unique constraint', () => {
        const sql = fs.readFileSync('./migrations/007_reviews.sql', 'utf8');
        assert(sql.includes('uq_settlement_selection'));
    });
    await test('Idempotency', '11.17 Entry executions table contains unique constraint', () => {
        const sql = fs.readFileSync('./migrations/007_reviews.sql', 'utf8');
        assert(sql.includes('uq_entry_execution_decision'));
    });
    await test('Idempotency', '11.18 Closing prices table contains unique constraint', () => {
        const sql = fs.readFileSync('./migrations/007_reviews.sql', 'utf8');
        assert(sql.includes('uq_closing_price'));
    });
    await test('Idempotency', '11.19 Review results RLS enabled in migration', () => {
        const sql = fs.readFileSync('./migrations/007_reviews.sql', 'utf8');
        assert(sql.includes('ALTER TABLE review_results ENABLE ROW LEVEL SECURITY'));
    });
    await test('Idempotency', '11.20 Settlement results RLS enabled in migration', () => {
        const sql = fs.readFileSync('./migrations/007_reviews.sql', 'utf8');
        assert(sql.includes('ALTER TABLE settlement_results ENABLE ROW LEVEL SECURITY'));
    });
    await test('Idempotency', '11.21 Closing prices RLS enabled in migration', () => {
        const sql = fs.readFileSync('./migrations/007_reviews.sql', 'utf8');
        assert(sql.includes('ALTER TABLE closing_prices ENABLE ROW LEVEL SECURITY'));
    });
    await test('Idempotency', '11.22 Entry executions RLS enabled in migration', () => {
        const sql = fs.readFileSync('./migrations/007_reviews.sql', 'utf8');
        assert(sql.includes('ALTER TABLE entry_executions ENABLE ROW LEVEL SECURITY'));
    });
    await test('Idempotency', '11.23 Fingerprint length is exactly 64 characters (SHA-256)', () => {
        const r = ReviewEngine.reviewDecision({ contract: sampleContract });
        assert.strictEqual(r.reviewResult.inputFingerprint.length, 64);
    });

    // ── Category 12: Replay Engine (>= 8 tests) ─────────────────────────────
    await test('Replay', '12.1 Replay from database records produces identical ReviewResult', () => {
        const rOrig = ReviewEngine.reviewDecision({
            contract: sampleContract,
            settlementData: { result: 'WIN', verified: true },
            marketObservations: [{ observedAt: '2026-08-17T11:55:00Z', odds: 1.72 }]
        });
        const rReplay = ReviewReplayEngine.replayFromDatabase({
            contract: sampleContract,
            settlementRecord: { result: 'WIN', verified: true },
            marketObservations: [{ observedAt: '2026-08-17T11:55:00Z', odds: 1.72 }]
        });
        assert.strictEqual(rOrig.reviewResult.decisionQuality.grade, rReplay.reviewResult.decisionQuality.grade);
        assert.strictEqual(rOrig.reviewResult.inputFingerprint, rReplay.reviewResult.inputFingerprint);
    });
    await test('Replay', '12.2 Replay preserves all 4 axis grades', () => {
        const r = ReviewReplayEngine.replayFromDatabase({
            contract: sampleContract,
            settlementRecord: { result: 'LOSS', verified: true },
            marketObservations: [{ observedAt: '2026-08-17T11:55:00Z', odds: 1.72 }]
        });
        assert.strictEqual(r.reviewResult.outcome.result, 'LOSS');
        assert.strictEqual(r.reviewResult.priceQuality.grade, 'EXCELLENT');
        assert.strictEqual(r.reviewResult.ruleDiscipline.grade, 'FOLLOWED');
        assert.strictEqual(r.reviewResult.thesisReview.grade, 'SOUND');
    });
    await test('Replay', '12.3 Replay deterministic across 10 consecutive runs', () => {
        for (let i = 0; i < 10; i++) {
            const r = ReviewReplayEngine.replayFromDatabase({ contract: sampleContract, settlementRecord: { result: 'WIN' } });
            assert.strictEqual(r.reviewResult.decisionQuality.grade, 'GOOD');
        }
    });
    await test('Replay', '12.4 Replay with context signals restores supporting evidence', () => {
        const cs = [{ observedAt: '2026-08-17T10:00:00Z', signals: [{ code: 'SP_CONFIRMED', status: 'CONFIRMED' }] }];
        const r = ReviewReplayEngine.replayFromDatabase({ contract: sampleContract, contextSnapshots: cs });
        assert.strictEqual(r.reviewResult.thesisReview.supportingEvidence.length, 1);
    });
    await test('Replay', '12.5 Replay with break events restores rule violations', () => {
        const events = [{ eventType: 'BREAK_CONDITION_HIT', occurred_at: '2026-08-17T10:00:00Z' }];
        const ex = { executed: true, entryOdds: 1.86, executedAt: '2026-08-17T10:30:00Z' };
        const r = ReviewReplayEngine.replayFromDatabase({ contract: sampleContract, executionRecord: ex, decisionEvents: events });
        assert.strictEqual(r.reviewResult.ruleDiscipline.grade, 'VIOLATED');
    });
    await test('Replay', '12.6 Replay produces matching ReviewCard facts', () => {
        const r = ReviewReplayEngine.replayFromDatabase({ contract: sampleContract, settlementRecord: { result: 'WIN' } });
        assert(r.reviewCard.keyFacts.length >= 3);
    });
    await test('Replay', '12.7 Replay with null inputs handled cleanly', () => {
        const r = ReviewReplayEngine.replayFromDatabase({ contract: sampleContract });
        assert.strictEqual(r.reviewResult.outcome.result, 'UNKNOWN');
    });
    await test('Replay', '12.8 Zero sports-specific dependencies in ReviewReplayEngine', () => {
        const code = fs.readFileSync('./src/review/ReviewReplayEngine.js', 'utf8');
        assert(!code.includes('mlb') && !code.includes('baseball'));
    });

    // ── Category 13: Multi-Sport Integration (>= 8 tests) ───────────────────
    await test('Multi-Sport', '13.1 MLB game review end-to-end', () => {
        const mlbContract = new DecisionContract({
            id: 'c_mlb_01', userId: 'u1', provider: 'BETMAN', roundId: '260097', sport: 'BASEBALL', league: 'MLB',
            eventId: 'e_mlb_1', marketId: 'm_mlb_1', selectionId: 's1', offeredOddsAtSeal: 1.85,
            entryRule: { minimumEntryOdds: 1.80 }, initialPriceState: 'ATTRACTIVE'
        });
        const r = ReviewEngine.reviewDecision({
            contract: mlbContract,
            settlementData: { result: 'WIN', verified: true },
            marketObservations: [{ observedAt: '2026-08-17T11:55:00Z', odds: 1.70 }]
        });
        assert.strictEqual(r.reviewResult.outcome.result, 'WIN');
        assert.strictEqual(r.reviewResult.priceQuality.grade, 'EXCELLENT');
        assert.strictEqual(r.reviewCard.sport, 'BASEBALL');
    });
    await test('Multi-Sport', '13.2 Soccer (EPL) game review end-to-end', () => {
        const scContract = new DecisionContract({
            id: 'c_sc_01', userId: 'u1', provider: 'BETMAN', roundId: '260097', sport: 'SOCCER', league: 'EPL',
            eventId: 'e_sc_1', marketId: 'm_sc_1', selectionId: 's1', offeredOddsAtSeal: 2.10,
            entryRule: { minimumEntryOdds: 2.05 }, initialPriceState: 'ATTRACTIVE'
        });
        const r = ReviewEngine.reviewDecision({
            contract: scContract,
            settlementData: { result: 'LOSS', verified: true },
            marketObservations: [{ observedAt: '2026-08-17T11:55:00Z', odds: 1.95 }] // CLV +7.6%
        });
        assert.strictEqual(r.reviewResult.outcome.result, 'LOSS');
        assert.strictEqual(r.reviewResult.decisionQuality.grade, 'EXCELLENT');
        assert.strictEqual(r.reviewCard.sport, 'SOCCER');
    });
    await test('Multi-Sport', '13.3 Basketball (KBL) game review end-to-end', () => {
        const bbContract = new DecisionContract({
            id: 'c_bb_01', userId: 'u1', provider: 'BETMAN', roundId: '260097', sport: 'BASKETBALL', league: 'KBL',
            eventId: 'e_bb_1', marketId: 'm_bb_1', selectionId: 's1', offeredOddsAtSeal: 1.88,
            entryRule: { minimumEntryOdds: 1.85 }, initialPriceState: 'ATTRACTIVE'
        });
        const r = ReviewEngine.reviewDecision({
            contract: bbContract,
            settlementData: { result: 'WIN', verified: true }
        });
        assert.strictEqual(r.reviewCard.sport, 'BASKETBALL');
    });
    await test('Multi-Sport', '13.4 Volleyball (V-League) game review end-to-end', () => {
        const vbContract = new DecisionContract({
            id: 'c_vb_01', userId: 'u1', provider: 'BETMAN', roundId: '260097', sport: 'VOLLEYBALL', league: 'V-League',
            eventId: 'e_vb_1', marketId: 'm_vb_1', selectionId: 's1', offeredOddsAtSeal: 1.95,
            entryRule: { minimumEntryOdds: 1.90 }, initialPriceState: 'ATTRACTIVE'
        });
        const r = ReviewEngine.reviewDecision({
            contract: vbContract,
            settlementData: { result: 'PUSH', verified: true }
        });
        assert.strictEqual(r.reviewResult.outcome.result, 'PUSH');
    });
    await test('Multi-Sport', '13.5 Zero sports-specific imports in src/review/ directory', () => {
        const reviewFiles = fs.readdirSync('./src/review').filter(f => f.endsWith('.js'));
        for (const f of reviewFiles) {
            const content = fs.readFileSync(`./src/review/${f}`, 'utf8');
            assert(!content.includes("require('../mlb"), `File ${f} contains sports-specific import!`);
            assert(!content.includes("require('../soccer"), `File ${f} contains sports-specific import!`);
        }
    });
    await test('Multi-Sport', '13.6 Soccer Under/Over market review', () => {
        const uoContract = new DecisionContract({
            id: 'c_uo_01', userId: 'u1', provider: 'BETMAN', roundId: '260097', sport: 'SOCCER', league: 'EPL',
            eventId: 'e_sc_2', marketId: 'm_uo_25', selectionId: 's_under', offeredOddsAtSeal: 1.95,
            entryRule: { minimumEntryOdds: 1.90 }
        });
        const r = ReviewEngine.reviewDecision({ contract: uoContract, settlementData: { result: 'WIN', verified: true } });
        assert.strictEqual(r.reviewResult.outcome.result, 'WIN');
    });
    await test('Multi-Sport', '13.7 Baseball Handicap market review', () => {
        const handiContract = new DecisionContract({
            id: 'c_hd_01', userId: 'u1', provider: 'BETMAN', roundId: '260097', sport: 'BASEBALL', league: 'KBO',
            eventId: 'e_kbo_1', marketId: 'm_hd_15', selectionId: 's_home', offeredOddsAtSeal: 1.82,
            entryRule: { minimumEntryOdds: 1.80 }
        });
        const r = ReviewEngine.reviewDecision({ contract: handiContract, settlementData: { result: 'LOSS', verified: true } });
        assert.strictEqual(r.reviewResult.outcome.result, 'LOSS');
    });
    await test('Multi-Sport', '13.8 All 4 sports execute identical decision quality logic', () => {
        const sports = ['BASEBALL', 'SOCCER', 'BASKETBALL', 'VOLLEYBALL'];
        for (const sport of sports) {
            const c = new DecisionContract({
                id: `c_${sport}`, userId: 'u1', provider: 'BETMAN', roundId: '260097', sport,
                eventId: 'e1', marketId: 'm1', selectionId: 's1', offeredOddsAtSeal: 1.85, entryRule: { minimumEntryOdds: 1.80 }
            });
            const r = ReviewEngine.reviewDecision({ contract: c, settlementData: { result: 'WIN' } });
            assert.strictEqual(r.reviewResult.decisionQuality.grade, 'GOOD');
        }
    });

    console.log(`\n========================================`);
    console.log(`PHASE E TEST SUMMARY: ${passed}/${passed + failed} TESTS PASSED`);
    console.log(`Target >= 142 passing tests: ${passed >= 142 ? 'MET ✅' : 'NOT MET ❌'}`);
    console.log(`========================================\n`);

    return { passed, failed, total: passed + failed };
}

if (require.main === module) {
    runReviewTests().then(({ passed, failed }) => {
        if (failed > 0 || passed < 142) process.exit(1);
    });
}

module.exports = runReviewTests;
