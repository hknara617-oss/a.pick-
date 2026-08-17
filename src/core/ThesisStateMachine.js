'use strict';

/**
 * src/core/ThesisStateMachine.js
 * Evaluates thesis state with strict deterministic precedence:
 * BROKEN > WAIT > WEAKENED > VALID
 */
class ThesisStateMachine {
    /**
     * @param {Object} inputs
     *   breakEvaluation: { anyHit: boolean, hitConditions: Array }
     *   isDataMissing: boolean (critical data required is missing)
     *   isSourceStale: boolean
     *   signals: ContextSignal[]
     * @returns {{ state: 'VALID' | 'WEAKENED' | 'BROKEN' | 'WAIT', reasons: string[] }}
     */
    static evaluateThesisState(inputs = {}) {
        const {
            breakEvaluation = { anyHit: false, hitConditions: [] },
            isDataMissing = false,
            isSourceStale = false,
            signals = []
        } = inputs;

        // 1. Precedence 1: BROKEN
        if (breakEvaluation.anyHit) {
            return {
                state: 'BROKEN',
                reasons: breakEvaluation.hitConditions.map(h => h.reason)
            };
        }

        // 2. Precedence 2: WAIT (missing critical data or stale sources)
        const waitReasons = [];
        if (isDataMissing) {
            waitReasons.push('Critical required context data is missing');
        }
        if (isSourceStale) {
            waitReasons.push('Source data is stale');
        }
        if (waitReasons.length > 0) {
            return {
                state: 'WAIT',
                reasons: waitReasons
            };
        }

        // 3. Precedence 3: WEAKENED (verified opposing signals without explicit break)
        const opposingSignals = signals.filter(s =>
            s.verified && (s.direction === 'OPPOSES_THESIS' || s.severity === 'HIGH' || s.severity === 'CRITICAL')
        );
        if (opposingSignals.length > 0) {
            return {
                state: 'WEAKENED',
                reasons: opposingSignals.map(s => `Opposing context signal: [${s.category}] ${s.code} (${s.evidenceRef || ''})`)
            };
        }

        // 4. Precedence 4: VALID
        return {
            state: 'VALID',
            reasons: ['All thesis conditions hold and no break conditions met']
        };
    }
}

module.exports = ThesisStateMachine;
