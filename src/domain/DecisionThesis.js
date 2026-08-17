'use strict';

/**
 * src/domain/DecisionThesis.js
 * Immutable pre-decision reasoning snapshot.
 * Captures user's original thoughts BEFORE outcome contamination.
 */
class DecisionThesis {
    constructor({
        decisionId,
        userId = 'founder_dogfood',
        selectedReasonCodes = [],
        userStatement = '',
        primaryDriver = 'OTHER', // STARTER | LINEUP | PRICE | TACTICAL | OTHER
        biggestConcern = '',
        suggestedKillCondition = '',
        evidenceRefs = [],
        createdAt = new Date().toISOString(),
        thesisVersion = 1
    }) {
        if (!decisionId) throw new Error('DecisionThesis requires decisionId');
        
        this.decisionId = decisionId;
        this.userId = userId;
        this.selectedReasonCodes = selectedReasonCodes;
        this.userStatement = userStatement.trim();
        this.primaryDriver = primaryDriver;
        this.biggestConcern = biggestConcern.trim();
        this.suggestedKillCondition = suggestedKillCondition.trim();
        this.evidenceRefs = evidenceRefs;
        this.createdAt = createdAt;
        this.thesisVersion = thesisVersion;
        this.sourceType = 'USER_STATED';
        
        // Structural quality flags (No IQ score, only structural traits)
        this.hasSpecificStatement = this.userStatement.length > 5;
        this.hasPrimaryDriver = Boolean(primaryDriver && primaryDriver !== 'OTHER');
        this.hasConcernLinkage = Boolean(this.biggestConcern && this.suggestedKillCondition);
    }
}

module.exports = DecisionThesis;
