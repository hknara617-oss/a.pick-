'use strict';

/**
 * src/core/ContextFreshnessEngine.js
 * Evaluates provider freshness and data latency.
 */
class ContextFreshnessEngine {
    /**
     * @param {string} observedAt - ISO timestamp
     * @param {number} maxAgeSeconds - maximum allowed age before considered stale
     * @param {string} currentTime - ISO timestamp
     * @returns {'FRESH' | 'STALE' | 'DEGRADED'}
     */
    static evaluateFreshness(observedAt, maxAgeSeconds = 300, currentTime = new Date().toISOString()) {
        if (!observedAt) return 'STALE';
        const observedTime = new Date(observedAt).getTime();
        const now = new Date(currentTime).getTime();
        if (isNaN(observedTime) || isNaN(now)) return 'STALE';

        const ageSeconds = (now - observedTime) / 1000;
        if (ageSeconds < 0) return 'FRESH'; // slight clock drift tolerance
        if (ageSeconds <= maxAgeSeconds) return 'FRESH';
        if (ageSeconds <= maxAgeSeconds * 3) return 'DEGRADED';
        return 'STALE';
    }

    /**
     * Evaluates provider health. Partial payload does not cause mass breaking.
     */
    static evaluateProviderHealth(providerStatus) {
        if (!providerStatus || providerStatus.status === 'DOWN') {
            return { health: 'DOWN', isDegraded: true, message: 'Provider feed unreachable' };
        }
        if (providerStatus.status === 'DEGRADED' || providerStatus.isPartial) {
            return { health: 'DEGRADED', isDegraded: true, message: 'Provider feed partial/degraded — retaining prior state' };
        }
        return { health: 'HEALTHY', isDegraded: false, message: 'Provider feed healthy' };
    }
}

module.exports = ContextFreshnessEngine;
