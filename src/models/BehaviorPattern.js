'use strict';

/**
 * src/models/BehaviorPattern.js
 * Cumulative behavioral pattern model with sample size gating and confidence.
 */
class BehaviorPattern {
    constructor({
        id = null,
        userId,
        patternCode,
        status = 'EMERGING', // EMERGING | ESTABLISHED | STRONG | INACTIVE
        sampleCount = 0,
        applicableCount = 0,
        occurrenceRate = 0,
        confidence = 0,
        firstObservedAt = new Date().toISOString(),
        lastObservedAt = new Date().toISOString(),
        supportingDecisionIds = [],
        descriptionTemplate = '',
        implicationTemplate = '',
        trend = 'STABLE' // IMPROVING | STABLE | WORSENING | INSUFFICIENT
    }) {
        if (!userId || !patternCode) {
            throw new Error('BehaviorPattern requires userId and patternCode');
        }

        this.id = id || `pat_${userId}_${patternCode}`;
        this.userId = userId;
        this.patternCode = patternCode;
        this.status = status;
        this.sampleCount = sampleCount;
        this.applicableCount = applicableCount;
        this.occurrenceRate = parseFloat(occurrenceRate) || 0;
        this.confidence = parseFloat(confidence) || 0;
        this.firstObservedAt = firstObservedAt;
        this.lastObservedAt = lastObservedAt;
        this.supportingDecisionIds = Object.freeze([...supportingDecisionIds]);
        this.descriptionTemplate = descriptionTemplate;
        this.implicationTemplate = implicationTemplate;
        this.trend = trend;

        Object.freeze(this);
    }
}

module.exports = BehaviorPattern;
