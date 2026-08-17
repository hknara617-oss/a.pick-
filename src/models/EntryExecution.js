'use strict';

/**
 * src/models/EntryExecution.js
 * Explicit user execution tracking to avoid assuming seal price was executed price.
 */
class EntryExecution {
    constructor({
        decisionId,
        executed = false,
        entryOdds = null,
        executedAt = null,
        source = 'UNKNOWN' // USER_RECORDED | IMPORTED | UNKNOWN
    }) {
        if (!decisionId) {
            throw new Error('EntryExecution requires decisionId');
        }

        const validSources = ['USER_RECORDED', 'IMPORTED', 'UNKNOWN'];
        if (!validSources.includes(source)) {
            throw new Error(`Invalid execution source: ${source}`);
        }

        this.decisionId = decisionId;
        this.executed = Boolean(executed);
        this.entryOdds = entryOdds !== null && entryOdds !== undefined ? parseFloat(entryOdds) : null;
        this.executedAt = executedAt;
        this.source = source;

        Object.freeze(this);
    }
}

module.exports = EntryExecution;
