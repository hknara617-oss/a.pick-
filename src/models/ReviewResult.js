'use strict';

/**
 * src/models/ReviewResult.js
 * Encapsulates the 4-axis decision review and derived DecisionQuality.
 * Core invariant: Outcome NEVER directly determines DecisionQuality.
 */
class ReviewResult {
    constructor({
        id = null,
        decisionId,
        reviewedAt = new Date().toISOString(),
        outcome = {},
        priceQuality = {},
        ruleDiscipline = {},
        thesisReview = {},
        decisionQuality = {},
        inputFingerprint = null,
        reviewVersion = 'v1.0.0'
    }) {
        if (!decisionId) {
            throw new Error('ReviewResult requires decisionId');
        }

        this.id = id || `rev_${Math.random().toString(36).slice(2, 10)}`;
        this.decisionId = decisionId;
        this.reviewedAt = reviewedAt;

        this.outcome = Object.freeze({
            result: outcome.result || 'UNKNOWN', // WIN | LOSS | PUSH | VOID | UNKNOWN
            settlementStatus: outcome.settlementStatus || 'PENDING', // VERIFIED | PENDING | UNAVAILABLE
            sourceRef: outcome.sourceRef || null,
            ...outcome
        });

        this.priceQuality = Object.freeze({
            grade: priceQuality.grade || 'UNKNOWN', // EXCELLENT | GOOD | FAIR | POOR | UNKNOWN
            entryOdds: priceQuality.entryOdds !== undefined ? priceQuality.entryOdds : null,
            closingOdds: priceQuality.closingOdds !== undefined ? priceQuality.closingOdds : null,
            closingOddsStatus: priceQuality.closingOddsStatus || 'UNAVAILABLE', // VERIFIED | APPROXIMATE | UNAVAILABLE
            clv: priceQuality.clv !== undefined ? priceQuality.clv : null,
            clvMethod: priceQuality.clvMethod || 'CLV_RETURN_RATIO',
            ...priceQuality
        });

        this.ruleDiscipline = Object.freeze({
            grade: ruleDiscipline.grade || 'FOLLOWED', // FOLLOWED | PARTIAL | VIOLATED
            compliedRules: Object.freeze([...(ruleDiscipline.compliedRules || [])]),
            violations: Object.freeze([...(ruleDiscipline.violations || [])]),
            ...ruleDiscipline
        });

        this.thesisReview = Object.freeze({
            preGameFinalState: thesisReview.preGameFinalState || 'VALID', // VALID | WEAKENED | BROKEN | WAIT
            grade: thesisReview.grade || 'SOUND', // SOUND | MIXED | UNSOUND | UNREVIEWABLE
            supportingEvidence: Object.freeze([...(thesisReview.supportingEvidence || [])]),
            contradictingEvidence: Object.freeze([...(thesisReview.contradictingEvidence || [])]),
            ...thesisReview
        });

        this.decisionQuality = Object.freeze({
            grade: decisionQuality.grade || 'UNRATED', // EXCELLENT | GOOD | FAIR | POOR | UNRATED
            reasons: Object.freeze([...(decisionQuality.reasons || [])]),
            ...decisionQuality
        });

        this.inputFingerprint = inputFingerprint;
        this.reviewVersion = reviewVersion;

        Object.freeze(this);
    }
}

module.exports = ReviewResult;
