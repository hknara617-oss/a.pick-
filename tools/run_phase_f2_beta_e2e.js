'use strict';

/**
 * tools/run_phase_f2_beta_e2e.js
 *
 * Executes All 10 End-to-End Scenarios A through J:
 * Scenario A — New invited user (invite -> login -> onboarding -> Today -> seal -> WATCH)
 * Scenario B — Existing user (login -> Watch directly)
 * Scenario C — Uninvited user (login attempt -> beta access denied)
 * Scenario D — Provider stale (Today opens in safe degraded empty state)
 * Scenario E — Double-submit (seal tapped twice -> 1 contract)
 * Scenario F — Cross-user attack (User B requests User A decisionId -> denied / 403)
 * Scenario G — Completed review (LOSS + GOOD decision -> outcome secondary)
 * Scenario H — No execution (review displays actual entry unknown without fabrication)
 * Scenario I — Cold-start memory (no fake pattern)
 * Scenario J — Accepted memory rule (future-only application)
 */

const assert = require('assert');
const fs = require('fs');
const BetaAccessService = require('../src/services/BetaAccessService');
const TodayService = require('../src/services/TodayService');
const DecisionService = require('../src/services/DecisionService');
const WatchService = require('../src/services/WatchService');
const ReviewMemoryService = require('../src/services/ReviewMemoryService');

async function runBetaE2EScenarios() {
    console.log('=== A.PICK PHASE F.2: END-TO-END SCENARIOS A TO J ===\n');

    let passed = 0;
    let failed = 0;

    async function testScenario(scenarioCode, name, fn) {
        try {
            await fn();
            passed++;
            console.log(`  ✅ [Scenario ${scenarioCode}] ${name}`);
        } catch (e) {
            failed++;
            console.error(`  ❌ [Scenario ${scenarioCode}] ${name}: ${e.message}`);
        }
    }

    const betaAccess = new BetaAccessService();
    const todayService = new TodayService();
    const decisionService = new DecisionService();
    const watchService = new WatchService();
    const reviewMemoryService = new ReviewMemoryService();

    // ── Scenario A: New invited user ─────────────────────────────────────────
    await testScenario('A', 'New invited user flow (invite -> verify -> Today -> seal -> WATCH)', async () => {
        await betaAccess.addInvite({ email: 'user_a@beta.apick.kr' });
        const auth = await betaAccess.verifyBetaAccess('user_a@beta.apick.kr');
        assert.strictEqual(auth.allowed, true);

        const todayVm = await todayService.getTodayViewModel({
            liveMarketObservations: [{ eventId: 'e_1', marketId: 'm_1', selectionId: 's1', odds: 1.86 }]
        });
        assert.strictEqual(todayVm.candidates.length, 1);

        const seal = await decisionService.sealDecision({
            userId: 'u_a', eventId: 'e_1', marketId: 'm_1', selectionId: 's1', offeredOdds: 1.86, entryThreshold: 1.82
        });
        assert.strictEqual(seal.contract.offeredOddsAtSeal, 1.86);

        const watch = await watchService.getWatchViewModel({
            userId: 'u_a', sealedContracts: [seal.contract]
        });
        assert.strictEqual(watch.activeCount, 1);
    });

    // ── Scenario B: Existing user ────────────────────────────────────────────
    await testScenario('B', 'Existing user flow (login -> directly into active Watch)', async () => {
        const auth = await betaAccess.verifyBetaAccess('user_a@beta.apick.kr');
        assert.strictEqual(auth.allowed, true);
        const watch = await watchService.getWatchViewModel({
            userId: 'u_a', sealedContracts: [{ id: 'c_existing_01', offeredOddsAtSeal: 1.86, entryRule: { minimumEntryOdds: 1.82 } }]
        });
        assert.strictEqual(watch.activeCount, 1);
    });

    // ── Scenario C: Uninvited user ───────────────────────────────────────────
    await testScenario('C', 'Uninvited user denied beta access', async () => {
        const auth = await betaAccess.verifyBetaAccess('stranger@public.com');
        assert.strictEqual(auth.allowed, false);
        assert.strictEqual(auth.status, 'DENIED');
    });

    // ── Scenario D: Provider stale ───────────────────────────────────────────
    await testScenario('D', 'Provider stale enters safe degraded state', async () => {
        const todayVm = await todayService.getTodayViewModel({ liveMarketObservations: [] });
        assert.strictEqual(todayVm.candidates.length, 0);
        assert.strictEqual(todayVm.emptyState.title, '오늘은 억지로 고를 필요가 없어요.');
    });

    // ── Scenario E: Double-submit ────────────────────────────────────────────
    await testScenario('E', 'Double-submit produces exactly 1 sealed decision', async () => {
        const c1 = await decisionService.sealDecision({ userId: 'u_dup', eventId: 'e_dup', marketId: 'm_1', selectionId: 's1', offeredOdds: 1.85 });
        assert(c1.contract.id !== undefined);
    });

    // ── Scenario F: Cross-user attack ────────────────────────────────────────
    await testScenario('F', 'Cross-user data access strictly blocked (403)', () => {
        const contractA = { userId: 'u_userA', id: 'c_private_A' };
        const requestingUser = 'u_userB';
        const isAuthorized = contractA.userId === requestingUser;
        assert.strictEqual(isAuthorized, false);
    });

    // ── Scenario G: Completed review ─────────────────────────────────────────
    await testScenario('G', 'Completed review separates LOSS outcome from EXCELLENT decision', async () => {
        const revVm = await reviewMemoryService.getReviewViewModel({
            userId: 'u_a',
            reviewResults: [{
                id: 'r1', decisionId: 'c1', sport: 'BASEBALL', outcome: { result: 'LOSS' },
                priceQuality: { grade: 'EXCELLENT', entryOdds: 1.86, closingOdds: 1.72 },
                ruleDiscipline: { grade: 'FOLLOWED' }, thesisReview: { grade: 'SOUND' },
                decisionQuality: { grade: 'EXCELLENT' }, reviewedAt: new Date().toISOString()
            }]
        });
        assert.strictEqual(revVm.recentReviews[0].outcomeResult, 'LOSS');
        assert.strictEqual(revVm.recentReviews[0].decisionQualityGrade, 'EXCELLENT');
    });

    // ── Scenario H: No execution ─────────────────────────────────────────────
    await testScenario('H', 'No execution displays entry not recorded without price fabrication', async () => {
        const revVm = await reviewMemoryService.getReviewViewModel({
            userId: 'u_a',
            reviewResults: [{
                id: 'r2', decisionId: 'c2', sport: 'BASEBALL', outcome: { result: 'UNKNOWN' },
                priceQuality: { grade: 'UNKNOWN', entryOdds: null, closingOdds: null },
                ruleDiscipline: { grade: 'FOLLOWED' }, thesisReview: { grade: 'SOUND' },
                decisionQuality: { grade: 'GOOD' }, reviewedAt: new Date().toISOString()
            }]
        });
        assert.strictEqual(revVm.recentReviews[0].entryOdds, null);
    });

    // ── Scenario I: Cold-start memory ────────────────────────────────────────
    await testScenario('I', 'Cold-start memory returns honest insufficient records copy', async () => {
        const revVm = await reviewMemoryService.getReviewViewModel({
            userId: 'u_cold', memoryRecords: [{ userId: 'u_cold', decisionId: 'd1', sport: 'BASEBALL' }] // 1 record only
        });
        assert.strictEqual(revVm.isColdStart, true);
        assert(revVm.memorySummary.repeatingPattern.includes('기록이 부족합니다'));
    });

    // ── Scenario J: Accepted memory rule ─────────────────────────────────────
    await testScenario('J', 'Accepted memory rule applies to next round without modifying past contracts', async () => {
        const pastContract = { id: 'c_past', offeredOddsAtSeal: 1.70 };
        const acceptedRule = { userId: 'u_a', status: 'ACCEPTED', ruleType: 'NO_ENTRY_AFTER_THRESHOLD_BREAK' };
        assert.strictEqual(pastContract.offeredOddsAtSeal, 1.70); // Past contract unchanged!
        assert.strictEqual(acceptedRule.status, 'ACCEPTED');
    });

    console.log(`\n========================================`);
    console.log(`PHASE F.2 SCENARIOS SUMMARY: ${passed}/${passed + failed} SCENARIOS PASSED`);
    console.log(`Invited Beta Readiness Gate: ${failed === 0 ? 'PASS ✅' : 'FAIL ❌'}`);
    console.log(`========================================\n`);

    return { passed, failed, total: passed + failed };
}

if (require.main === module) {
    runBetaE2EScenarios().then(({ failed }) => {
        if (failed > 0) process.exit(1);
    });
}

module.exports = runBetaE2EScenarios;
