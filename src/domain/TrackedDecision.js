'use strict';

/**
 * src/domain/TrackedDecision.js
 * Unified WATCH entity for both A.PICK-created and externally imported decisions.
 * Preserves strict provenance and never fabricates missing decision history.
 */
class TrackedDecision {
    constructor({
        id,
        userId = 'founder_dogfood',
        origin = 'APICK_CREATED', // APICK_CREATED | EXTERNAL_CAPTURE
        
        eventId = null,
        marketId = null,
        selectionId = null,
        eventName = '',
        selectionName = '',
        sport = 'BASEBALL',
        league = 'MLB',
        
        provider = 'BETMAN',
        roundId = '260097',
        
        importedSourceId = null,
        contractId = null,
        executionId = null,
        thesisId = null,
        
        contractStatus = 'SEALED', // SEALED | IMPORTED
        thesisStatus = 'RECORDED', // RECORDED | NOT_RECORDED
        reconciliationStatus = 'MATCHED', // MATCHED | PARTIAL_MATCH | UNMATCHED | NEEDS_CONFIRMATION
        
        capturedOdds = null,
        currentOdds = null,
        entryThreshold = null,
        
        thesisSummary = '',
        thesisOrigin = 'ORIGINAL_AT_DECISION', // ORIGINAL_AT_DECISION | RECONSTRUCTED_AFTER_IMPORT | NOT_RECORDED
        
        watchCoverage = [],
        breakConditions = [],
        
        executed = false,
        entryOdds = null,
        executedAt = null,
        
        isFinished = false,
        matchStatus = '발매중',

        imageHash = null,
        createdAt = new Date().toISOString(),
        updatedAt = new Date().toISOString()
    }) {
        if (!id) throw new Error('TrackedDecision requires id');

        this.id = id;
        this.userId = userId;
        this.origin = origin;
        
        this.eventId = eventId;
        this.marketId = marketId;
        this.selectionId = selectionId;
        this.eventName = eventName;
        this.selectionName = selectionName;
        this.sport = sport;
        this.league = league;
        
        this.provider = provider;
        this.roundId = roundId;
        
        this.importedSourceId = importedSourceId;
        this.contractId = contractId;
        this.executionId = executionId;
        this.thesisId = thesisId;
        
        this.contractStatus = contractStatus;
        this.thesisStatus = thesisStatus;
        this.reconciliationStatus = reconciliationStatus;
        
        this.capturedOdds = capturedOdds;
        this.currentOdds = currentOdds || capturedOdds;
        this.entryThreshold = entryThreshold;
        
        this.thesisSummary = thesisSummary;
        this.thesisOrigin = thesisOrigin;
        
        this.watchCoverage = watchCoverage;
        this.breakConditions = breakConditions;

        this.executed = executed;
        this.entryOdds = entryOdds;
        this.executedAt = executedAt;
        
        this.isFinished = isFinished || false;
        this.matchStatus = matchStatus || '발매중';

        this.imageHash = imageHash;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }
}

module.exports = TrackedDecision;
