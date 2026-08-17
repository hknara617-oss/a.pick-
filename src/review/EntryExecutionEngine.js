'use strict';

const EntryExecution = require('../models/EntryExecution');

/**
 * src/review/EntryExecutionEngine.js
 * Explicit verification of user execution.
 */
class EntryExecutionEngine {
    static resolveExecution(executionData, contract) {
        if (!executionData) {
            return new EntryExecution({
                decisionId: contract.id,
                executed: false,
                entryOdds: null,
                executedAt: null,
                source: 'UNKNOWN'
            });
        }

        return new EntryExecution({
            decisionId: contract.id,
            executed: Boolean(executionData.executed),
            entryOdds: executionData.entryOdds !== undefined ? executionData.entryOdds : null,
            executedAt: executionData.executedAt || null,
            source: executionData.source || 'USER_RECORDED'
        });
    }
}

module.exports = EntryExecutionEngine;
