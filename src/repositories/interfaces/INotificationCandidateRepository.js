'use strict';

/**
 * src/repositories/interfaces/INotificationCandidateRepository.js
 */
class INotificationCandidateRepository {
    async saveCandidate(candidate) { throw new Error('Not implemented'); }
    async getPendingNotifications(limit = 100) { throw new Error('Not implemented'); }
    async updateDeliveryStatus(id, status) { throw new Error('Not implemented'); }
    async getNotificationsByDecisionId(decisionId) { throw new Error('Not implemented'); }
}

module.exports = INotificationCandidateRepository;
