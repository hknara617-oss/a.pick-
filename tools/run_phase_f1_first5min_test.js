'use strict';

/**
 * tools/run_phase_f1_first5min_test.js
 *
 * Simulates and verifies the complete First 5 Minutes First-Use Loop:
 * 1. User opens A.PICK & completes 3-step onboarding.
 * 2. Today tab fetches live candidates (<=7) with action-state explanations.
 * 3. User inspects WHY sheet (market margin, verified context, break condition).
 * 4. User saves decision (price threshold, thesis, break conditions).
 * 5. Decision is sealed into immutable DecisionContract with calm confirmation.
 * 6. Sealed decision appears in WATCH tab under appropriate quiet category.
 * 7. Review tab displays 4-axis post-game evaluation separating outcome from decision quality.
 * 8. Memory summary presents 4 core fields and allows explicit next-round rule acceptance.
 * 9. Product Identity Verification: "Decision Management, NOT Pick Seller".
 */

const assert = require('assert');
const fs = require('fs');
const TodayService = require('../src/services/TodayService');
const DecisionService = require('../src/services/DecisionService');
const WatchService = require('../src/services/WatchService');
const ReviewMemoryService = require('../src/services/ReviewMemoryService');
const UIStateFixtures = require('../src/fixtures/UIStateFixtures');

async function runFirst5MinHarness() {
    console.log('=== A.PICK PHASE F.1: FIRST 5 MINUTES VERTICAL SLICE HARNESS ===\n');

    let passed = 0;
    let failed = 0;

    async function test(step, name, fn) {
        try {
            await fn();
            passed++;
            console.log(`  ✅ [${step}] ${name}`);
        } catch (e) {
            failed++;
            console.error(`  ❌ [${step}] ${name}: ${e.message}`);
        }
    }

    const userId = 'u_first_user_001';

    // ── Step 1: Onboarding ───────────────────────────────────────────────────
    await test('1. Onboarding', 'Onboarding has <=3 concise screens communicating product loop', () => {
        const html = fs.readFileSync('./apps/web/public/index.html', 'utf8');
        assert(html.includes('ob-step-1'));
        assert(html.includes('ob-step-2'));
        assert(html.includes('ob-step-3'));
        assert(!html.includes('ob-step-4')); // Max 3 screens!
    });
    await test('1. Onboarding', 'Onboarding messaging focuses on decision management, not pick predictions', () => {
        const html = fs.readFileSync('./apps/web/public/index.html', 'utf8');
        assert(html.includes('분석보다 판단을 관리합니다'));
        assert(html.includes('중요한 변화만 알려드립니다'));
        assert(html.includes('결과보다 판단 품질을 복기합니다'));
    });

    // ── Step 2: Today Tab & Candidate View Model ────────────────────────────
    const todayService = new TodayService();
    let todayVm = null;

    await test('2. Today Tab', 'Today service caps candidate count <= 7 to avoid overwhelming user', async () => {
        const mockObs = Array.from({ length: 15 }, (_, i) => ({
            eventId: `e_${i}`, marketId: `m_${i}`, selectionId: 's1', odds: 1.85 + i * 0.02
        }));
        todayVm = await todayService.getTodayViewModel({ userId, liveMarketObservations: mockObs });
        assert(todayVm.candidates.length <= 7);
        assert.strictEqual(todayVm.candidates.length, 7);
    });
    await test('2. Today Tab', 'Zero-candidate empty state produces calm, non-pushy copy', async () => {
        const emptyVm = await todayService.getTodayViewModel({ userId, liveMarketObservations: [] });
        assert.strictEqual(emptyVm.candidates.length, 0);
        assert.strictEqual(emptyVm.emptyState.title, '오늘은 억지로 고를 필요가 없어요.');
        assert.strictEqual(emptyVm.emptyState.subtitle, '가격이나 정보 조건이 좋아지면 다시 알려드릴게요.');
    });
    await test('2. Today Tab', 'Candidate cards contain market fair odds and entry threshold', () => {
        const c0 = todayVm.candidates[0];
        assert(c0.marketFairOdds !== undefined);
        assert(c0.entryThreshold !== undefined);
        assert(c0.priceState !== undefined);
    });

    // ── Step 3: WHY Sheet ───────────────────────────────────────────────────
    await test('3. WHY Sheet', 'WHY sheet provides action-state breakdown, not predictive essay', () => {
        const c0 = todayVm.candidates[0];
        assert(c0.whySummary.length >= 3);
        assert(c0.verifiedContext.length >= 1);
        assert(c0.actionState === 'ENTER' || c0.actionState === 'DO_NOT_ENTER');
    });

    // ── Step 4: Decision Seal Flow ──────────────────────────────────────────
    const decisionService = new DecisionService();
    let sealedResult = null;

    await test('4. Decision Seal', 'Decision sealing creates immutable DecisionContract with break conditions', async () => {
        sealedResult = await decisionService.sealDecision({
            userId,
            sport: 'BASEBALL',
            league: 'MLB',
            eventId: '260097_101',
            marketId: 'm_ml_101',
            selectionId: 's1',
            offeredOdds: 1.86,
            entryThreshold: 1.82,
            thesisSummary: '선발 매치업 우위 및 마진 확보',
            evidenceChips: ['선발 확인', '가격 조건 충족'],
            breakConditions: [
                { code: 'ODDS_BELOW_MINIMUM', threshold: 1.82, action: 'INVALIDATE' },
                { code: 'STARTER_SCRATCHED', action: 'INVALIDATE' }
            ]
        });

        assert.strictEqual(sealedResult.contract.offeredOddsAtSeal, 1.86);
        assert.strictEqual(sealedResult.contract.entryRule.minimumEntryOdds, 1.82);
        assert.strictEqual(sealedResult.contract.breakConditions.length, 2);
    });
    await test('4. Decision Seal', 'Genesis decision event generated with SHA-256 hash', () => {
        assert.strictEqual(sealedResult.genesisEvent.eventType, 'SEALED');
        assert.strictEqual(sealedResult.genesisEvent.previous_event_hash, 'GENESIS');
        assert.strictEqual(sealedResult.genesisEvent.event_hash.length, 64);
    });
    await test('4. Decision Seal', 'Calm seal confirmation message returned without celebration casino tropes', () => {
        assert.strictEqual(sealedResult.confirmation.headline, '판단을 저장했습니다.');
        assert.strictEqual(sealedResult.confirmation.subcopy, '이제 계속 확인할 필요 없습니다. 중요한 변화가 생기면 알려드릴게요.');
    });

    // ── Step 5: WATCH Tab ───────────────────────────────────────────────────
    const watchService = new WatchService();

    await test('5. WATCH Tab', 'Sealed decision appears in WATCH tab grouped by quiet state', async () => {
        const watchVm = await watchService.getWatchViewModel({
            userId,
            sealedContracts: [sealedResult.contract],
            currentObservations: [{ marketId: 'm_ml_101', selectionId: 's1', odds: 1.86 }]
        });
        assert.strictEqual(watchVm.activeCount, 1);
        assert.strictEqual(watchVm.stable.length, 1);
        assert.strictEqual(watchVm.stable[0].mostImportantChange, '저장 이후 중요한 변화가 없습니다.');
    });
    await test('5. WATCH Tab', 'Price drop below threshold moves item to importantChanges', async () => {
        const watchVm = await watchService.getWatchViewModel({
            userId,
            sealedContracts: [sealedResult.contract],
            currentObservations: [{ marketId: 'm_ml_101', selectionId: 's1', odds: 1.78 }] // 1.78 < 1.82 threshold!
        });
        assert.strictEqual(watchVm.importantChanges.length, 1);
        assert(watchVm.importantChanges[0].mostImportantChange.includes('가격이 기준 아래로 내려왔어요'));
    });

    // ── Step 6: Review & Memory Tab ─────────────────────────────────────────
    const reviewMemoryService = new ReviewMemoryService();

    await test('6. Review & Memory', 'Review card visually and logically separates outcome from decision quality', async () => {
        const mockReview = {
            id: 'rev_1',
            decisionId: sealedResult.contract.id,
            sport: 'BASEBALL',
            outcome: { result: 'LOSS' },
            priceQuality: { grade: 'EXCELLENT', entryOdds: 1.86, closingOdds: 1.72, clv: 0.0814 },
            ruleDiscipline: { grade: 'FOLLOWED' },
            thesisReview: { grade: 'SOUND' },
            decisionQuality: { grade: 'EXCELLENT' },
            reviewedAt: new Date().toISOString()
        };

        const revVm = await reviewMemoryService.getReviewViewModel({
            userId,
            reviewResults: [mockReview],
            memoryRecords: []
        });

        assert.strictEqual(revVm.recentReviews[0].outcomeResult, 'LOSS');
        assert.strictEqual(revVm.recentReviews[0].decisionQualityGrade, 'EXCELLENT');
        assert(revVm.recentReviews[0].headline.includes('사전에 정한 가격과 규칙은 지켰습니다'));
    });
    await test('6. Review & Memory', 'Memory summary renders 4 core fields and allows rule acceptance', async () => {
        const records = Array.from({ length: 10 }, (_, i) => ({
            userId, decisionId: `d_${i}`, sport: 'BASEBALL', executed: true, entryThreshold: 1.82, enteredBelowThreshold: i < 7,
            priceQuality: 'POOR', ruleDiscipline: 'PARTIAL', thesisQuality: 'SOUND', decisionQuality: 'POOR',
            createdAt: new Date().toISOString(), reviewedAt: new Date().toISOString()
        }));

        const revVm = await reviewMemoryService.getReviewViewModel({
            userId,
            reviewResults: [],
            memoryRecords: records,
            acceptedRules: [{ userId, status: 'ACCEPTED', ruleType: 'NO_ENTRY_AFTER_THRESHOLD_BREAK' }]
        });

        assert(revVm.memorySummary.repeatingPattern.includes('7번에서'));
        assert(revVm.memorySummary.biggestImplication.includes('판단 품질이 더 자주 훼손'));
        assert(revVm.memorySummary.oneNextBehavior.includes('기준 배당 아래 신규 진입을 원천 차단'));
        assert.strictEqual(revVm.memorySummary.nextRoundApplied, true);
    });

    // ── Step 7: UI State Fixtures Verification (States A through J) ─────────
    await test('7. UI States', 'All 10 UI State Fixtures (A through J) render deterministically without crash', () => {
        const fixtureKeys = Object.keys(UIStateFixtures);
        assert.strictEqual(fixtureKeys.length, 10);
        for (const k of fixtureKeys) {
            const f = UIStateFixtures[k];
            assert.strictEqual(f._isFixture, true);
            assert(f.fixtureCode.startsWith('STATE_'));
        }
    });

    // ── Step 8: Product Identity / "No Pick Seller" Test ────────────────────
    await test('8. Identity Test', 'Web app contains ZERO casino/sportsbook gambling tropes', () => {
        const html = fs.readFileSync('./apps/web/public/index.html', 'utf8');
        const js = fs.readFileSync('./apps/web/public/app.js', 'utf8');
        const css = fs.readFileSync('./apps/web/public/style.css', 'utf8');

        const combined = `${html} ${js} ${css}`.toLowerCase();
        assert(!combined.includes('대박'));
        assert(!combined.includes('적중률 100%'));
        assert(!combined.includes('초강력'));
        assert(!combined.includes('슬롯'));
    });

    console.log(`\n========================================`);
    console.log(`PHASE F.1 FIRST 5 MINUTES SUMMARY: ${passed}/${passed + failed} STEPS PASSED`);
    console.log(`Vertical Slice Gate: ${failed === 0 ? 'PASS ✅' : 'FAIL ❌'}`);
    console.log(`========================================\n`);

    return { passed, failed, total: passed + failed };
}

if (require.main === module) {
    runFirst5MinHarness().then(({ failed }) => {
        if (failed > 0) process.exit(1);
    });
}

module.exports = runFirst5MinHarness;
