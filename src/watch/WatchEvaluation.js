'use strict';

/**
 * src/watch/WatchEvaluation.js
 * Encapsulates the complete result of an individual watch evaluation cycle.
 */
class WatchEvaluation {
    constructor({
        id = null,
        watchTargetId,
        decisionId,
        evaluatedAt = new Date().toISOString(),
        previousContext = null,
        currentContext = null,
        detectedChanges = [],
        previousThesisState = 'VALID',
        currentThesisState = 'VALID',
        previousActionState = 'DO_NOT_ENTER',
        currentActionState = 'DO_NOT_ENTER',
        materiality = 'NONE',
        notificationCandidate = null,
        sourceFreshness = 'FRESH',
        engineVersion = 'v1.0.0'
    }) {
        if (!watchTargetId || !decisionId) {
            throw new Error('WatchEvaluation requires watchTargetId and decisionId');
        }
        this.id = id || `we_${Math.random().toString(36).slice(2, 10)}`;
        this.watchTargetId = watchTargetId;
        this.decisionId = decisionId;
        this.evaluatedAt = evaluatedAt;
        this.previousContext = previousContext ? Object.freeze({ ...previousContext }) : null;
        this.currentContext = currentContext ? Object.freeze({ ...currentContext }) : null;
        this.detectedChanges = Object.freeze([...detectedChanges]);
        this.previousThesisState = previousThesisState;
        this.currentThesisState = currentThesisState;
        this.previousActionState = previousActionState;
        this.currentActionState = currentActionState;
        this.materiality = materiality;
        this.notificationCandidate = notificationCandidate;
        this.sourceFreshness = sourceFreshness;
        this.engineVersion = engineVersion;

        Object.freeze(this);
    }
}

module.exports = WatchEvaluation;
