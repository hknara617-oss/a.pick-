'use strict';

/**
 * src/repositories/interfaces/IContextSnapshotRepository.js
 */
class IContextSnapshotRepository {
    async saveContextSnapshot(snapshot) { throw new Error('Not implemented'); }
    async getLatestContextSnapshot(sport, eventId) { throw new Error('Not implemented'); }
    async getContextHistory(sport, eventId, limit = 20) { throw new Error('Not implemented'); }
}

module.exports = IContextSnapshotRepository;
