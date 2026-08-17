'use strict';

/**
 * src/domain/ImportSession.js
 * Represents a screenshot / ticket image import session.
 */
class ImportSession {
    constructor({
        id,
        userId = 'founder_dogfood',
        sourceImageRef = null,
        imageHash = null,
        rawParsedText = '',
        selections = [],
        createdAt = new Date().toISOString()
    }) {
        if (!id) throw new Error('ImportSession requires id');
        this.id = id;
        this.userId = userId;
        this.sourceImageRef = sourceImageRef;
        this.imageHash = imageHash;
        this.rawParsedText = rawParsedText;
        this.selections = selections;
        this.createdAt = createdAt;
    }
}

/**
 * src/domain/ImportedSelection.js
 * Represents an individual parsed selection leg from a captured image.
 */
class ImportedSelection {
    constructor({
        id,
        importSessionId,
        parsedEvent = '',
        homeTeam = '',
        awayTeam = '',
        parsedMarket = '일반 승패',
        parsedSelection = '',
        parsedOdds = null,
        parsedRound = '260097',
        isPurchasedTicket = false,
        confidenceMap = {
            homeTeam: 0.95,
            awayTeam: 0.95,
            selection: 0.92,
            odds: 0.98,
            round: 0.99
        },
        reconciliationStatus = 'MATCHED', // MATCHED | PARTIAL_MATCH | UNMATCHED | NEEDS_CONFIRMATION
        matchedEventId = null,
        matchedMarketId = null,
        matchedSelectionId = null,
        matchedLiveOdds = null
    }) {
        if (!id) throw new Error('ImportedSelection requires id');
        this.id = id;
        this.importSessionId = importSessionId;
        this.parsedEvent = parsedEvent;
        this.homeTeam = homeTeam;
        this.awayTeam = awayTeam;
        this.parsedMarket = parsedMarket;
        this.parsedSelection = parsedSelection;
        this.parsedOdds = parsedOdds;
        this.parsedRound = parsedRound;
        this.isPurchasedTicket = isPurchasedTicket;
        this.confidenceMap = confidenceMap;
        this.reconciliationStatus = reconciliationStatus;
        this.matchedEventId = matchedEventId;
        this.matchedMarketId = matchedMarketId;
        this.matchedSelectionId = matchedSelectionId;
        this.matchedLiveOdds = matchedLiveOdds;
    }
}

module.exports = {
    ImportSession,
    ImportedSelection
};
