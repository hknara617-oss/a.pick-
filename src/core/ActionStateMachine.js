'use strict';

/**
 * src/core/ActionStateMachine.js
 * Evaluates actionable states: ENTER | WAIT | DO_NOT_ENTER | REVIEW
 *
 * CRITICAL RULE:
 * - STALE / UNPRICED can NEVER produce ENTER.
 * - BROKEN always requires REVIEW.
 */
class ActionStateMachine {
    /**
     * @param {'VALID' | 'WEAKENED' | 'BROKEN' | 'WAIT'} thesisState
     * @param {'ATTRACTIVE' | 'FAIR' | 'UNATTRACTIVE' | 'UNPRICED' | 'STALE'} priceState
     * @param {'FRESH' | 'STALE' | 'DEGRADED' | 'UNKNOWN'} freshness
     * @returns {'ENTER' | 'WAIT' | 'DO_NOT_ENTER' | 'REVIEW'}
     */
    static evaluateActionState(thesisState, priceState, freshness = 'FRESH') {
        // Rule 1: Broken thesis always requires manual review
        if (thesisState === 'BROKEN') {
            return 'REVIEW';
        }

        // Rule 2: Wait thesis means context is incomplete or stale
        if (thesisState === 'WAIT') {
            return 'WAIT';
        }

        // Rule 3: Stale or unpriced price state can never enter
        if (priceState === 'STALE' || freshness === 'STALE' || priceState === 'UNPRICED') {
            return 'WAIT';
        }

        // Rule 4: Thesis is VALID
        if (thesisState === 'VALID') {
            if (priceState === 'ATTRACTIVE' && freshness === 'FRESH') {
                return 'ENTER';
            } else if (priceState === 'FAIR' && freshness === 'FRESH') {
                return 'WAIT'; // Fair price without margin buffer
            } else {
                return 'DO_NOT_ENTER';
            }
        }

        // Rule 5: Thesis is WEAKENED
        if (thesisState === 'WEAKENED') {
            if (priceState === 'ATTRACTIVE') {
                return 'WAIT'; // Attractive price but weakened thesis -> wait for clarity
            } else {
                return 'DO_NOT_ENTER';
            }
        }

        return 'DO_NOT_ENTER';
    }
}

module.exports = ActionStateMachine;
