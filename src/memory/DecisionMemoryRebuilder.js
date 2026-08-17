'use strict';

const MemoryRecordBuilder = require('./MemoryRecordBuilder');
const DecisionMemoryEngine = require('./DecisionMemoryEngine');

/**
 * src/memory/DecisionMemoryRebuilder.js
 * Rebuilds all memory records, patterns, scorecards, and implications from raw DB history.
 */
class DecisionMemoryRebuilder {
    static rebuildUserMemory({ contracts = [], executions = [], decisionEvents = [], reviews = [], userId, acceptedRules = [] }) {
        if (!userId) {
            throw new Error('DecisionMemoryRebuilder requires userId');
        }

        const memoryRecords = [];

        for (const contract of contracts) {
            const review = reviews.find(r => r.decisionId === contract.id);
            if (!review) continue;

            const execution = executions.find(e => e.decisionId === contract.id) || null;
            const events = decisionEvents.filter(e => e.decision_id === contract.id || e.decisionId === contract.id);

            const record = MemoryRecordBuilder.buildRecord({
                contract,
                entryExecution: execution,
                decisionEvents: events,
                reviewResult: review
            });

            memoryRecords.push(record);
        }

        // Evaluate rebuilt memory
        const memoryState = DecisionMemoryEngine.evaluateUserMemory(memoryRecords, userId, acceptedRules);

        return {
            memoryRecords,
            ...memoryState
        };
    }
}

module.exports = DecisionMemoryRebuilder;
