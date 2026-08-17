'use strict';

/**
 * src/watch/WatchPolicy.js
 * Generic policy controlling change detection, noise filtering, and notification rules.
 */
class WatchPolicy {
    constructor({
        watchPrice = true,
        watchLine = true,
        watchAvailability = true,
        watchFreshness = true,
        watchBreakConditions = true,
        watchContextSignals = true,
        minimumPriceChange = 0.03, // minimum odds delta to trigger low-level alert
        notificationPolicy = {
            minSeverity: 'HIGH', // 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
            suppressNoise: true,
            debounceWindowSeconds: 180
        },
        version = 'v1.0.0'
    } = {}) {
        this.watchPrice = Boolean(watchPrice);
        this.watchLine = Boolean(watchLine);
        this.watchAvailability = Boolean(watchAvailability);
        this.watchFreshness = Boolean(watchFreshness);
        this.watchBreakConditions = Boolean(watchBreakConditions);
        this.watchContextSignals = Boolean(watchContextSignals);
        this.minimumPriceChange = parseFloat(minimumPriceChange) || 0.03;
        this.notificationPolicy = Object.freeze({
            minSeverity: notificationPolicy.minSeverity || 'HIGH',
            suppressNoise: notificationPolicy.suppressNoise !== false,
            debounceWindowSeconds: notificationPolicy.debounceWindowSeconds || 180
        });
        this.version = version;

        Object.freeze(this);
    }
}

module.exports = WatchPolicy;
