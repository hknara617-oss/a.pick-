'use strict';

/**
 * src/watch/MarketWatchRegistry.js
 * Registry for grouping multiple user DecisionContracts by upstream market & event.
 * Ensures that 1,000 user contracts watching 100 markets perform exactly 100 upstream fetches.
 */
class MarketWatchRegistry {
    constructor() {
        this.contractsByMarket = new Map(); // marketKey -> Set<contractId>
        this.contractsByEvent = new Map();  // eventKey -> Set<contractId>
        this.contracts = new Map();         // contractId -> { contract, watchTarget }
        this.latestEvaluations = new Map(); // contractId -> WatchEvaluation
    }

    /**
     * Register a sealed contract and its watch target.
     *
     * @param {DecisionContract} contract
     * @param {WatchTarget} watchTarget
     */
    registerWatch(contract, watchTarget) {
        if (!contract || !watchTarget) throw new Error('Contract and WatchTarget required');

        const marketKey = `${contract.provider}:${contract.roundId}:${contract.marketId}`;
        const eventKey = `${contract.provider}:${contract.roundId}:${contract.eventId}`;

        if (!this.contractsByMarket.has(marketKey)) {
            this.contractsByMarket.set(marketKey, new Set());
        }
        this.contractsByMarket.get(marketKey).add(contract.id);

        if (!this.contractsByEvent.has(eventKey)) {
            this.contractsByEvent.set(eventKey, new Set());
        }
        this.contractsByEvent.get(eventKey).add(contract.id);

        this.contracts.set(contract.id, { contract, watchTarget });
    }

    /**
     * Unregister a watch.
     */
    unregisterWatch(contractId) {
        const entry = this.contracts.get(contractId);
        if (!entry) return;

        const { contract } = entry;
        const marketKey = `${contract.provider}:${contract.roundId}:${contract.marketId}`;
        const eventKey = `${contract.provider}:${contract.roundId}:${contract.eventId}`;

        this.contractsByMarket.get(marketKey)?.delete(contractId);
        if (this.contractsByMarket.get(marketKey)?.size === 0) {
            this.contractsByMarket.delete(marketKey);
        }

        this.contractsByEvent.get(eventKey)?.delete(contractId);
        if (this.contractsByEvent.get(eventKey)?.size === 0) {
            this.contractsByEvent.delete(eventKey);
        }

        this.contracts.delete(contractId);
        this.latestEvaluations.delete(contractId);
    }

    /**
     * Get unique market keys that require upstream polling.
     */
    getUniqueMarketKeys() {
        return Array.from(this.contractsByMarket.keys());
    }

    /**
     * Get unique event keys that require context updates.
     */
    getUniqueEventKeys() {
        return Array.from(this.contractsByEvent.keys());
    }

    /**
     * Get all contracts subscribed to a specific market.
     */
    getContractsForMarket(marketKey) {
        const contractIds = this.contractsByMarket.get(marketKey);
        if (!contractIds) return [];
        return Array.from(contractIds).map(id => this.contracts.get(id)).filter(Boolean);
    }

    /**
     * Get stats on registration and fanout ratio.
     */
    getRegistryStats() {
        const totalContracts = this.contracts.size;
        const uniqueMarkets = this.contractsByMarket.size;
        const fanoutRatio = uniqueMarkets > 0 ? (totalContracts / uniqueMarkets).toFixed(2) : '1.00';
        return {
            totalContracts,
            uniqueMarkets,
            uniqueEvents: this.contractsByEvent.size,
            fanoutRatio: parseFloat(fanoutRatio)
        };
    }

    clear() {
        this.contractsByMarket.clear();
        this.contractsByEvent.clear();
        this.contracts.clear();
        this.latestEvaluations.clear();
    }
}

module.exports = MarketWatchRegistry;
