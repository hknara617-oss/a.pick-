'use strict';

/**
 * src/review/PreGameStateResolver.js
 * Derives preGameFinalState from the LAST valid evaluation before event start.
 */
class PreGameStateResolver {
    static resolvePreGameState(watchEvaluations = [], eventStartTime = null) {
        if (!watchEvaluations || watchEvaluations.length === 0) {
            return 'VALID'; // Default initial sealed state
        }

        const cutoffTime = eventStartTime ? new Date(eventStartTime).getTime() : Infinity;
        const preGameEvals = watchEvaluations.filter(ev => {
            const t = new Date(ev.evaluatedAt || ev.evaluated_at).getTime();
            return t <= cutoffTime;
        }).sort((a, b) => new Date(b.evaluatedAt || b.evaluated_at).getTime() - new Date(a.evaluatedAt || a.evaluated_at).getTime());

        if (preGameEvals.length === 0) {
            return 'VALID';
        }

        const lastEval = preGameEvals[0];
        return lastEval.currentThesisState || lastEval.current_thesis_state || 'VALID';
    }
}

module.exports = PreGameStateResolver;
