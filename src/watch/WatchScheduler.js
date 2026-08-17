'use strict';

/**
 * src/watch/WatchScheduler.js
 * Manages adaptive polling frequency based on event lifecycle.
 */
class WatchScheduler {
    /**
     * Determine event lifecycle tier based on time until scheduled start.
     *
     * @param {string} scheduledStart - ISO timestamp
     * @param {string} currentTime - ISO timestamp
     * @returns {'FAR_FROM_EVENT' | 'NORMAL' | 'PRE_EVENT' | 'CRITICAL_WINDOW' | 'CLOSED'}
     */
    static getLifecycleTier(scheduledStart, currentTime = new Date().toISOString()) {
        if (!scheduledStart) return 'NORMAL';
        const startMs = new Date(scheduledStart).getTime();
        const nowMs = new Date(currentTime).getTime();
        if (isNaN(startMs) || isNaN(nowMs)) return 'NORMAL';

        const hoursRemaining = (startMs - nowMs) / (1000 * 3600);

        if (hoursRemaining <= 0) return 'CLOSED';
        if (hoursRemaining <= 1.0) return 'CRITICAL_WINDOW'; // < 1 hour
        if (hoursRemaining <= 6.0) return 'PRE_EVENT';       // 1 - 6 hours
        if (hoursRemaining <= 24.0) return 'NORMAL';         // 6 - 24 hours
        return 'FAR_FROM_EVENT';                             // > 24 hours
    }

    /**
     * Recommended polling interval in seconds for each lifecycle tier.
     */
    static getPollingIntervalSeconds(tier) {
        switch (tier) {
            case 'CRITICAL_WINDOW': return 30;   // 30s
            case 'PRE_EVENT':       return 120;  // 2m
            case 'NORMAL':          return 600;  // 10m
            case 'FAR_FROM_EVENT':  return 1800; // 30m
            case 'CLOSED':          return 0;    // stopped
            default:                return 300;
        }
    }
}

module.exports = WatchScheduler;
