'use strict';

/**
 * src/watch/LastKnownGoodStore.js
 * In-memory / persistent store for LastKnownGood snapshots.
 * Shields watch evaluation against corrupt, partial, or malformed provider fetches.
 */
class LastKnownGoodStore {
    constructor() {
        this.marketStore = new Map();   // marketKey -> { observation, updatedAt }
        this.contextStore = new Map();  // eventKey -> { contextSnapshot, updatedAt }
    }

    /**
     * Store a valid market observation.
     */
    saveGoodMarketObservation(marketKey, observation) {
        if (!marketKey || !observation) return;
        this.marketStore.set(marketKey, {
            observation: Object.freeze({ ...observation }),
            updatedAt: new Date().toISOString()
        });
    }

    /**
     * Get the last known good market observation.
     */
    getLastGoodMarketObservation(marketKey) {
        return this.marketStore.get(marketKey)?.observation || null;
    }

    /**
     * Store a valid sport context snapshot.
     */
    saveGoodContextSnapshot(eventKey, contextSnapshot) {
        if (!eventKey || !contextSnapshot) return;
        this.contextStore.set(eventKey, {
            contextSnapshot,
            updatedAt: new Date().toISOString()
        });
    }

    /**
     * Get the last known good context snapshot.
     */
    getLastGoodContextSnapshot(eventKey) {
        return this.contextStore.get(eventKey)?.contextSnapshot || null;
    }

    /**
     * Resolve working market observation safely:
     * If incoming payload is valid, return it and save as last known good.
     * If incoming payload is corrupt/partial, fallback to last known good with DEGRADED freshness.
     */
    resolveMarketObservation(marketKey, incomingPayload, providerHealth = { isDegraded: false }) {
        const isValid = incomingPayload && Array.isArray(incomingPayload.currentMarketOdds) && incomingPayload.currentMarketOdds.length >= 2;

        if (isValid && !providerHealth.isDegraded) {
            this.saveGoodMarketObservation(marketKey, incomingPayload);
            return incomingPayload;
        }

        const lastGood = this.getLastGoodMarketObservation(marketKey);
        if (lastGood) {
            return {
                ...lastGood,
                freshness: 'DEGRADED',
                fallbackToLastKnownGood: true
            };
        }

        return incomingPayload; // No prior baseline
    }

    clear() {
        this.marketStore.clear();
        this.contextStore.clear();
    }
}

module.exports = LastKnownGoodStore;
