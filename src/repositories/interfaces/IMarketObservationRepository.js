'use strict';

/**
 * src/repositories/interfaces/IMarketObservationRepository.js
 * Immutable market time-series repository interface.
 */
class IMarketObservationRepository {
    async saveMarketObservation(obs, selectionObsList = []) { throw new Error('Not implemented'); }
    async getLatestMarketObservation(provider, roundId, marketId) { throw new Error('Not implemented'); }
    async getMarketHistory(provider, roundId, marketId, limit = 50) { throw new Error('Not implemented'); }
    async getSelectionObservations(marketObservationId) { throw new Error('Not implemented'); }
}

module.exports = IMarketObservationRepository;
