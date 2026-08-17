'use strict';
/**
 * src/models/DecisionCard.js
 * Generic UI data contract.
 */
class DecisionCard {
    constructor({
        cardId,
        sport,
        event,      // { id, league, home, away, scheduledStart }
        market,     // { id, type, line }
        selection,  // { id, label, side }
        currentOdds,
        marketFairLabel = '시장 무마진 배당',
        marketFairOdds,
        entryThreshold,
        thesisState,
        actionState,
        headline,
        changedSinceSeal = [],
        nextCheck = null,
        lastUpdated = new Date().toISOString()
    }) {
        this.cardId = cardId;
        this.sport = sport;
        this.event = Object.freeze({ ...event });
        this.market = Object.freeze({ ...market });
        this.selection = Object.freeze({ ...selection });
        this.currentOdds = currentOdds;
        this.marketFairLabel = marketFairLabel;
        this.marketFairOdds = marketFairOdds;
        this.entryThreshold = entryThreshold;
        this.thesisState = thesisState;
        this.actionState = actionState;
        this.headline = headline;
        this.changedSinceSeal = Object.freeze([...changedSinceSeal]);
        this.nextCheck = nextCheck;
        this.lastUpdated = lastUpdated;
        Object.freeze(this);
    }
}

module.exports = DecisionCard;
