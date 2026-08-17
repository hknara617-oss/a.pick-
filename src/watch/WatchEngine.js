'use strict';

const DecisionContextEngine = require('../core/DecisionContextEngine');
const DecisionEvent = require('../models/DecisionEvent');
const WatchEvaluation = require('./WatchEvaluation');
const ChangeMaterialityEngine = require('./ChangeMaterialityEngine');
const NotificationSuppressionEngine = require('./NotificationSuppressionEngine');
const LastKnownGoodStore = require('./LastKnownGoodStore');
const MarketWatchRegistry = require('./MarketWatchRegistry');

/**
 * src/watch/WatchEngine.js
 * Master orchestrator for the A.PICK Multi-Sport WATCH Engine.
 */
class WatchEngine {
    constructor({
        registry = new MarketWatchRegistry(),
        lastKnownGood = new LastKnownGoodStore(),
        suppression = new NotificationSuppressionEngine()
    } = {}) {
        this.registry = registry;
        this.lastKnownGood = lastKnownGood;
        this.suppression = suppression;
        this.eventChains = new Map();       // contractId -> Array of DecisionEvent
        this.latestEvaluations = new Map(); // contractId -> WatchEvaluation
    }

    /**
     * Register a contract for watching.
     */
    registerWatch(contract, watchTarget) {
        this.registry.registerWatch(contract, watchTarget);

        // Initialize event chain with SEALED event if not already present
        if (!this.eventChains.has(contract.id)) {
            const genesisEvent = new DecisionEvent({
                contractId: contract.id,
                eventType: 'SEALED',
                payload: {
                    offeredOdds: contract.offeredOddsAtSeal,
                    marketFairOdds: contract.marketFairOddsAtSeal,
                    entryRule: contract.entryRule
                },
                timestamp: contract.sealedAt,
                previousEventHash: 'GENESIS'
            });
            this.eventChains.set(contract.id, [genesisEvent]);
        }
    }

    /**
     * Process an upstream market observation and fan out evaluation to all subscribed DecisionContracts.
     *
     * @param {string} marketKey
     * @param {Object} rawObservation
     * @param {Object} contextSnapshot
     * @param {Object} providerHealth
     * @returns {Array<WatchEvaluation>}
     */
    processMarketObservation(marketKey, rawObservation, contextSnapshot = null, providerHealth = { isDegraded: false }) {
        const subscriptions = this.registry.getContractsForMarket(marketKey);
        if (subscriptions.length === 0) return [];

        // 1. Resolve through LastKnownGoodStore (Shielding against corrupt fetches)
        const safeObservation = this.lastKnownGood.resolveMarketObservation(marketKey, rawObservation, providerHealth);

        if (contextSnapshot) {
            const eventKey = `${safeObservation.provider || 'BETMAN'}:${safeObservation.roundId}:${safeObservation.eventId}`;
            this.lastKnownGood.saveGoodContextSnapshot(eventKey, contextSnapshot);
        }

        const evaluations = [];

        // 2. Fan-out to each subscribed DecisionContract
        for (const { contract, watchTarget } of subscriptions) {
            if (!watchTarget.enabled || watchTarget.status !== 'ACTIVE') {
                continue; // Skip paused / closed / expired watches
            }

            const prevEval = this.latestEvaluations.get(contract.id) || null;
            const prevContext = prevEval ? prevEval.currentContext : {
                currentOdds: contract.offeredOddsAtSeal,
                priceState: contract.initialPriceState,
                thesisState: 'VALID',
                actionState: 'DO_NOT_ENTER',
                freshness: contract.sourceFreshnessAtSeal,
                signalsEvaluated: []
            };

            // 3. Evaluate new state via DecisionContextEngine (pure Core logic)
            const currentContext = DecisionContextEngine.evaluateContract(contract, {
                currentMarketOdds: safeObservation.currentMarketOdds,
                selectionIndex: safeObservation.selectionIndex !== undefined ? safeObservation.selectionIndex : 0,
                currentLine: safeObservation.currentLine,
                marketStatus: safeObservation.marketStatus || 'OPEN',
                observedAt: safeObservation.observedAt || new Date().toISOString(),
                contextSnapshot,
                providerHealth
            });

            // 4. Detect and filter changes (ChangeMaterialityEngine)
            const { detectedChanges, highestMateriality } = ChangeMaterialityEngine.detectChanges(
                prevContext,
                currentContext,
                contract,
                watchTarget.watchPolicy || {}
            );

            // 5. Check notification candidate generation & suppression
            const notifCandidate = this.suppression.evaluateAndGenerateCandidate(
                contract,
                detectedChanges,
                highestMateriality,
                currentContext,
                watchTarget.watchPolicy || {}
            );

            // 6. Append state-changing events to audit chain (Idempotent: zero duplicate events on identical inputs)
            this.appendEventsIfChanged(contract.id, detectedChanges, currentContext);

            // 7. Assemble WatchEvaluation
            const evaluation = new WatchEvaluation({
                watchTargetId: watchTarget.id,
                decisionId: contract.id,
                evaluatedAt: new Date().toISOString(),
                previousContext: prevContext,
                currentContext,
                detectedChanges,
                previousThesisState: prevContext.thesisState,
                currentThesisState: currentContext.thesisState,
                previousActionState: prevContext.actionState,
                currentActionState: currentContext.actionState,
                materiality: highestMateriality,
                notificationCandidate: notifCandidate,
                sourceFreshness: currentContext.freshness
            });

            this.latestEvaluations.set(contract.id, evaluation);
            evaluations.push(evaluation);
        }

        return evaluations;
    }

    /**
     * Appends DecisionEvents only if a state change occurred.
     */
    appendEventsIfChanged(contractId, detectedChanges, currentContext) {
        const chain = this.eventChains.get(contractId) || [];
        const lastEvent = chain[chain.length - 1];
        let prevHash = lastEvent ? lastEvent.eventHash : 'GENESIS';

        for (const change of detectedChanges) {
            if (change.materiality === 'NONE') continue; // Suppress sub-noise events in chain

            let eventType = null;
            if (change.type === 'PRICE_THRESHOLD_CROSSED_DOWN' || change.type === 'PRICE_THRESHOLD_CROSSED_UP') {
                eventType = 'THRESHOLD_CROSSED';
            } else if (change.type === 'PRICE_CHANGED') {
                eventType = 'PRICE_MOVED';
            } else if (change.type === 'LINE_CHANGED') {
                eventType = 'LINE_CHANGED';
            } else if (change.type === 'BREAK_CONDITION_HIT') {
                eventType = 'BREAK_CONDITION_HIT';
            } else if (change.type === 'THESIS_STATE_CHANGED') {
                eventType = 'THESIS_STATE_CHANGED';
            } else if (change.type === 'ACTION_STATE_CHANGED') {
                eventType = 'ACTION_STATE_CHANGED';
            } else if (change.type === 'CONTEXT_SIGNAL_ADDED') {
                eventType = 'CONTEXT_SIGNAL';
            }

            if (eventType) {
                const newEvent = new DecisionEvent({
                    contractId,
                    eventType,
                    payload: { ...change.payload, currentPrice: currentContext.currentOdds },
                    timestamp: new Date().toISOString(),
                    previousEventHash: prevHash
                });
                chain.push(newEvent);
                prevHash = newEvent.eventHash;
            }
        }
        this.eventChains.set(contractId, chain);
    }

    /**
     * Get the complete chronological change audit for a decision.
     */
    getChangesSinceSeal(contractId) {
        const chain = this.eventChains.get(contractId) || [];
        return chain.map(e => ({
            eventId: e.eventId,
            eventType: e.eventType,
            payload: e.payload,
            timestamp: e.timestamp,
            eventHash: e.eventHash,
            previousEventHash: e.previousEventHash
        }));
    }

    /**
     * Get the latest WatchEvaluation for a contract.
     */
    getLatestEvaluation(contractId) {
        return this.latestEvaluations.get(contractId) || null;
    }
}

module.exports = WatchEngine;
