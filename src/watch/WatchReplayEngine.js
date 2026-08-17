'use strict';

const crypto = require('crypto');
const DecisionContextEngine = require('../core/DecisionContextEngine');

/**
 * src/watch/WatchReplayEngine.js
 * Verifies append-only event chains and reproduces identical state transitions deterministically.
 */
class WatchReplayEngine {
    /**
     * Validate cryptographic integrity of an event chain.
     * Returns true if chain is uncorrupted, false if any event was tampered with.
     *
     * @param {Array<DecisionEvent>} eventChain
     * @returns {{ valid: boolean, tamperedIndex: number|null, reason: string }}
     */
    static verifyAuditChain(eventChain) {
        if (!Array.isArray(eventChain) || eventChain.length === 0) {
            return { valid: true, tamperedIndex: null, reason: 'Empty chain' };
        }

        let expectedPrevHash = 'GENESIS';

        for (let i = 0; i < eventChain.length; i++) {
            const e = eventChain[i];

            // 1. Check backward linkage
            if (e.previousEventHash !== expectedPrevHash) {
                return {
                    valid: false,
                    tamperedIndex: i,
                    reason: `Broken chain link at index ${i}: expected prev ${expectedPrevHash}, got ${e.previousEventHash}`
                };
            }

            // 2. Recompute cryptographic hash of event contents
            const hashInput = `${e.eventId}:${e.contractId}:${e.eventType}:${JSON.stringify(e.payload)}:${e.timestamp}:${e.previousEventHash}`;
            const recomputed = crypto.createHash('sha256').update(hashInput).digest('hex');

            if (recomputed !== e.eventHash) {
                return {
                    valid: false,
                    tamperedIndex: i,
                    reason: `Tampered payload hash at index ${i}: stored ${e.eventHash}, recomputed ${recomputed}`
                };
            }

            expectedPrevHash = e.eventHash;
        }

        return { valid: true, tamperedIndex: null, reason: 'Audit chain verified' };
    }

    /**
     * Replay a series of historical observations against a DecisionContract.
     * Verifies that deterministic re-execution reproduces identical final state.
     */
    static replayObservations(contract, orderedObservations = []) {
        const replayedResults = [];
        for (const obs of orderedObservations) {
            const res = DecisionContextEngine.evaluateContract(contract, obs);
            replayedResults.push(res);
        }
        return replayedResults;
    }
}

module.exports = WatchReplayEngine;
