'use strict';

/**
 * src/repositories/interfaces/IDecisionContractRepository.js
 * Contract interface for DecisionContract persistence.
 */
class IDecisionContractRepository {
    /**
     * Save a sealed DecisionContract.
     * @param {DecisionContract} contract
     * @returns {Promise<void>}
     */
    async saveContract(contract) { throw new Error('Not implemented'); }

    /**
     * Get a contract by its ID.
     * @param {string} id
     * @returns {Promise<DecisionContract|null>}
     */
    async getContractById(id) { throw new Error('Not implemented'); }

    /**
     * Get all contracts belonging to a specific user.
     * @param {string} userId
     * @returns {Promise<Array<DecisionContract>>}
     */
    async getContractsByUser(userId) { throw new Error('Not implemented'); }

    /**
     * Get all contracts subscribed to a specific market key.
     * @param {string} provider
     * @param {string} roundId
     * @param {string} marketId
     * @returns {Promise<Array<DecisionContract>>}
     */
    async getContractsByMarket(provider, roundId, marketId) { throw new Error('Not implemented'); }

    /**
     * Attempted mutation (must be rejected for sealed contracts).
     * @param {string} id
     * @param {Object} patch
     * @returns {Promise<void>}
     */
    async updateContract(id, patch) { throw new Error('Not implemented'); }
}

module.exports = IDecisionContractRepository;
