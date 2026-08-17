'use strict';

/**
 * src/repositories/interfaces/IProviderHealthRepository.js
 */
class IProviderHealthRepository {
    async recordHealthObservation(healthObs) { throw new Error('Not implemented'); }
    async getLatestHealth(provider) { throw new Error('Not implemented'); }
}

module.exports = IProviderHealthRepository;
