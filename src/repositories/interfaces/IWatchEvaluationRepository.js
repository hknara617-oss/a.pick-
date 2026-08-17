'use strict';

/**
 * src/repositories/interfaces/IWatchEvaluationRepository.js
 */
class IWatchEvaluationRepository {
    async saveEvaluation(evaluation) { throw new Error('Not implemented'); }
    async getLatestEvaluation(decisionId) { throw new Error('Not implemented'); }
    async getEvaluationsByDecisionId(decisionId, limit = 100) { throw new Error('Not implemented'); }
}

module.exports = IWatchEvaluationRepository;
