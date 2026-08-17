'use strict';

/**
 * src/repositories/interfaces/IWatchTargetRepository.js
 */
class IWatchTargetRepository {
    async saveWatchTarget(target) { throw new Error('Not implemented'); }
    async updateWatchTarget(id, patch) { throw new Error('Not implemented'); }
    async getWatchTargetByDecisionId(decisionId) { throw new Error('Not implemented'); }
    async getActiveWatchTargets() { throw new Error('Not implemented'); }
    async getActiveTargetsByMarket(provider, roundId, marketId) { throw new Error('Not implemented'); }
}

module.exports = IWatchTargetRepository;
