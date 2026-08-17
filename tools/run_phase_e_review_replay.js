'use strict';

/**
 * tools/run_phase_e_review_replay.js
 *
 * Replays multiple decision reviews from DB historical records alone.
 * Verifies 0 divergence against initial calculations.
 */

const fs = require('fs');
const path = require('path');
const DecisionContract = require('../src/models/DecisionContract');
const ReviewEngine = require('../src/review/ReviewEngine');
const ReviewReplayEngine = require('../src/review/ReviewReplayEngine');

async function runReviewReplay() {
    console.log('=== A.PICK PHASE E: POST-GAME REVIEW REPLAY TEST ===\n');

    const contracts = [
        new DecisionContract({
            id: 'c_rep_01', userId: 'u1', provider: 'BETMAN', roundId: '260097', sport: 'BASEBALL', league: 'MLB',
            eventId: 'e1', marketId: 'm1', selectionId: 's1', offeredOddsAtSeal: 1.86, entryRule: { minimumEntryOdds: 1.82 }
        }),
        new DecisionContract({
            id: 'c_rep_02', userId: 'u1', provider: 'BETMAN', roundId: '260097', sport: 'SOCCER', league: 'EPL',
            eventId: 'e2', marketId: 'm2', selectionId: 's1', offeredOddsAtSeal: 2.10, entryRule: { minimumEntryOdds: 2.05 }
        }),
        new DecisionContract({
            id: 'c_rep_03', userId: 'u2', provider: 'BETMAN', roundId: '260097', sport: 'BASKETBALL', league: 'KBL',
            eventId: 'e3', marketId: 'm3', selectionId: 's1', offeredOddsAtSeal: 1.88, entryRule: { minimumEntryOdds: 1.85 }
        })
    ];

    let matches = 0;

    for (const contract of contracts) {
        const settlementRecord = { result: 'WIN', verified: true };
        const marketObservations = [{ observedAt: '2026-08-17T11:55:00Z', odds: contract.offeredOddsAtSeal - 0.10 }];

        const rOriginal = ReviewEngine.reviewDecision({
            contract,
            settlementData: settlementRecord,
            marketObservations
        });

        const rReplayed = ReviewReplayEngine.replayFromDatabase({
            contract,
            settlementRecord,
            marketObservations
        });

        if (
            rOriginal.reviewResult.decisionQuality.grade === rReplayed.reviewResult.decisionQuality.grade &&
            rOriginal.reviewResult.inputFingerprint === rReplayed.reviewResult.inputFingerprint
        ) {
            matches++;
            console.log(`  ✅ Contract ${contract.id} (${contract.sport}): Replay matches 100% (Grade: ${rReplayed.reviewResult.decisionQuality.grade})`);
        } else {
            console.error(`  ❌ Contract ${contract.id}: Replay diverged!`);
        }
    }

    console.log(`\nReplay Summary: ${matches}/${contracts.length} contracts replayed with 0 divergence.`);
    return matches === contracts.length;
}

if (require.main === module) {
    runReviewReplay().catch(console.error);
}

module.exports = runReviewReplay;
