'use strict';

/**
 * src/repositories/interfaces/IDecisionEventRepository.js
 * Append-only audit trail repository interface.
 */
class IDecisionEventRepository {
    /**
     * Append a new DecisionEvent to the audit trail.
     * @param {DecisionEvent} event
     * @returns {Promise<void>}
     */
    async appendEvent(event) { throw new Error('Not implemented'); }

    /**
     * Append multiple events in an atomic transaction.
     * @param {Array<DecisionEvent>} events
     * @returns {Promise<void>}
     */
    async appendEvents(events) { throw new Error('Not implemented'); }

    /**
     * Get the chronological event chain for a decision.
     * @param {string} decisionId
     * @returns {Promise<Array<DecisionEvent>>}
     */
    async getEventsByDecisionId(decisionId) { throw new Error('Not implemented'); }

    /**
     * Get the latest event for a decision (for hash linking).
     * @param {string} decisionId
     * @returns {Promise<DecisionEvent|null>}
     */
    async getLatestEvent(decisionId) { throw new Error('Not implemented'); }
}

module.exports = IDecisionEventRepository;
