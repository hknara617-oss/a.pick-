'use strict';

/**
 * src/models/ProposedBehaviorRule.js
 * Explicit proposed rule for future DecisionContracts requiring user acceptance.
 */
class ProposedBehaviorRule {
    constructor({
        id = null,
        userId,
        sourcePatternId = null,
        ruleType,
        rulePayload = {},
        reason,
        status = 'PROPOSED', // PROPOSED | ACCEPTED | DECLINED | EXPIRED
        proposedAt = new Date().toISOString(),
        decidedAt = null,
        expiresAt = null
    }) {
        if (!userId || !ruleType || !reason) {
            throw new Error('ProposedBehaviorRule requires userId, ruleType, reason');
        }

        const validStatuses = ['PROPOSED', 'ACCEPTED', 'DECLINED', 'EXPIRED'];
        if (!validStatuses.includes(status)) {
            throw new Error(`Invalid proposed rule status: ${status}`);
        }

        this.id = id || `prule_${userId}_${ruleType}_${Date.now()}`;
        this.userId = userId;
        this.sourcePatternId = sourcePatternId;
        this.ruleType = ruleType;
        this.rulePayload = Object.freeze({ ...rulePayload });
        this.reason = reason;
        this.status = status;
        this.proposedAt = proposedAt;
        this.decidedAt = decidedAt;
        this.expiresAt = expiresAt;

        Object.freeze(this);
    }
}

module.exports = ProposedBehaviorRule;
