'use strict';

/**
 * src/models/ReviewCard.js
 * User-facing presentation contract for post-game decision reviews.
 * Neutral Korean templates separating result from decision discipline.
 */
class ReviewCard {
    constructor({
        decisionId,
        sport,
        league,
        event,
        market,
        selection,
        outcome,
        priceQuality,
        ruleDiscipline,
        thesisQuality,
        decisionQuality,
        headline,
        keyFacts = [],
        whatWentWell = [],
        whatToImprove = [],
        reviewedAt = new Date().toISOString()
    }) {
        if (!decisionId || !outcome || !decisionQuality) {
            throw new Error('ReviewCard requires decisionId, outcome, decisionQuality');
        }

        this.decisionId = decisionId;
        this.sport = sport;
        this.league = league;
        this.event = event;
        this.market = market;
        this.selection = selection;

        this.outcome = outcome;
        this.priceQuality = priceQuality;
        this.ruleDiscipline = ruleDiscipline;
        this.thesisQuality = thesisQuality;
        this.decisionQuality = decisionQuality;

        this.headline = headline;
        this.keyFacts = Object.freeze([...keyFacts]);
        this.whatWentWell = Object.freeze([...whatWentWell]);
        this.whatToImprove = Object.freeze([...whatToImprove]);
        this.reviewedAt = reviewedAt;

        Object.freeze(this);
    }
}

module.exports = ReviewCard;
