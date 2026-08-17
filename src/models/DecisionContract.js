'use strict';
/**
 * src/models/DecisionContract.js
 * Immutable DecisionContract v1.
 */
class DecisionContract {
    constructor({
        id,
        userId = 'default_user',
        provider = 'BETMAN',
        roundId,
        sport,
        league,
        eventId,
        marketId,
        selectionId,
        createdAt = new Date().toISOString(),
        sealedAt = new Date().toISOString(),
        offeredOddsAtSeal,
        marketFairOddsAtSeal,
        marketNoVigProbabilityAtSeal,
        entryRule, // { fairBasis, requiredMargin, minimumEntryOdds, version }
        initialPriceState = 'ATTRACTIVE',
        thesis = { summary: '', supportingEvidence: [], opposingEvidence: [] },
        breakConditions = [],
        validity = { validUntil: null, maxToleratedLineShift: null },
        sourceFreshnessAtSeal = 'FRESH',
        status = 'SEALED'
    }) {
        if (!id || !eventId || !marketId || !selectionId || !offeredOddsAtSeal) {
            throw new Error('DecisionContract requires id, eventId, marketId, selectionId, offeredOddsAtSeal');
        }
        this.id = id;
        this.userId = userId;
        this.provider = provider;
        this.roundId = roundId;
        this.sport = sport;
        this.league = league;
        this.eventId = eventId;
        this.marketId = marketId;
        this.selectionId = selectionId;
        this.createdAt = createdAt;
        this.sealedAt = sealedAt;
        this.offeredOddsAtSeal = parseFloat(offeredOddsAtSeal);
        this.marketFairOddsAtSeal = marketFairOddsAtSeal ? parseFloat(marketFairOddsAtSeal) : null;
        this.marketNoVigProbabilityAtSeal = marketNoVigProbabilityAtSeal ? parseFloat(marketNoVigProbabilityAtSeal) : null;
        this.entryRule = Object.freeze({ ...entryRule });
        this.initialPriceState = initialPriceState;
        this.thesis = Object.freeze({
            summary: thesis.summary || '',
            supportingEvidence: Object.freeze([...(thesis.supportingEvidence || [])]),
            opposingEvidence: Object.freeze([...(thesis.opposingEvidence || [])])
        });
        this.breakConditions = Object.freeze([...(breakConditions || [])]);
        this.validity = Object.freeze({ ...validity });
        this.sourceFreshnessAtSeal = sourceFreshnessAtSeal;
        this.status = status; // 'SEALED' | 'ARCHIVED' | 'CANCELLED'

        Object.freeze(this);
    }
}

module.exports = DecisionContract;
