'use strict';

const ReviewEngine = require('./ReviewEngine');

/**
 * src/review/ReviewReplayEngine.js
 * Replays decision review from DB data only without hidden state.
 */
class ReviewReplayEngine {
    static replayFromDatabase({
        contract,
        settlementRecord = null,
        executionRecord = null,
        marketObservations = [],
        decisionEvents = [],
        watchEvaluations = [],
        contextSnapshots = [],
        eventStartTime = null
    }) {
        return ReviewEngine.reviewDecision({
            contract,
            settlementData: settlementRecord,
            entryExecutionData: executionRecord,
            marketObservations,
            decisionEvents,
            watchEvaluations,
            contextSnapshots,
            eventStartTime
        });
    }
}

module.exports = ReviewReplayEngine;
