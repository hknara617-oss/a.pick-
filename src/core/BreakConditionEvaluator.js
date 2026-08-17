'use strict';

/**
 * src/core/BreakConditionEvaluator.js
 * Sport-agnostic evaluator of contract break conditions.
 */
class BreakConditionEvaluator {
    /**
     * @param {Array<BreakCondition>} breakConditions
     * @param {Object} context
     *   currentOdds: number|null
     *   currentLine: number|string|null
     *   initialLine: number|string|null
     *   marketStatus: string
     *   isMarketStale: boolean
     *   currentTime: string (ISO)
     *   eventScheduledStart: string (ISO)
     *   contextSnapshot: SportsContextSnapshot
     * @returns {{ anyHit: boolean, hitConditions: Array<{ condition: BreakCondition, reason: string }> }}
     */
    static evaluate(breakConditions = [], context = {}) {
        const hitConditions = [];

        for (const cond of breakConditions) {
            let isHit = false;
            let reason = '';

            switch (cond.type) {
                case 'PRICE_LT':
                    if (context.currentOdds !== null && context.currentOdds !== undefined && cond.threshold !== null) {
                        if (context.currentOdds < cond.threshold) {
                            isHit = true;
                            reason = `Current odds (${context.currentOdds}) dropped below threshold (${cond.threshold})`;
                        }
                    }
                    break;

                case 'PRICE_GT':
                    if (context.currentOdds !== null && context.currentOdds !== undefined && cond.threshold !== null) {
                        if (context.currentOdds > cond.threshold) {
                            isHit = true;
                            reason = `Current odds (${context.currentOdds}) rose above threshold (${cond.threshold})`;
                        }
                    }
                    break;

                case 'LINE_CHANGED':
                    if (context.currentLine !== undefined && context.initialLine !== undefined) {
                        if (context.currentLine !== context.initialLine) {
                            isHit = true;
                            reason = `Market line changed from ${context.initialLine} to ${context.currentLine}`;
                        }
                    }
                    break;

                case 'MARKET_UNPRICED':
                    if (context.currentOdds === null || context.marketStatus === 'UNPRICED' || context.marketStatus === 'SUSPENDED') {
                        isHit = true;
                        reason = `Market became unpriced or suspended (status: ${context.marketStatus})`;
                    }
                    break;

                case 'MARKET_STALE':
                    if (context.isMarketStale) {
                        isHit = true;
                        reason = 'Market feed is stale';
                    }
                    break;

                case 'EVENT_TIME_REACHED':
                    if (context.currentTime && context.eventScheduledStart) {
                        if (new Date(context.currentTime) >= new Date(context.eventScheduledStart)) {
                            isHit = true;
                            reason = 'Scheduled event start time reached';
                        }
                    }
                    break;

                case 'DATA_MISSING':
                    if (cond.targetField && context.contextSnapshot?.criticalData?.missing?.includes(cond.targetField)) {
                        isHit = true;
                        reason = `Required critical data field missing: ${cond.targetField}`;
                    }
                    break;

                case 'DATA_STALE':
                    if (context.contextSnapshot?.freshness === 'STALE') {
                        isHit = true;
                        reason = 'Context data source is stale';
                    }
                    break;

                case 'CONTEXT_SIGNAL_OCCURRED':
                    if (context.contextSnapshot?.signals) {
                        const matchingSig = context.contextSnapshot.signals.find(s =>
                            (!cond.targetCategory || s.category === cond.targetCategory) &&
                            (!cond.targetCode || s.code === cond.targetCode)
                        );
                        if (matchingSig) {
                            isHit = true;
                            reason = `Context signal occurred: [${matchingSig.category}] ${matchingSig.code} (${matchingSig.evidenceRef || ''})`;
                        }
                    }
                    break;

                default:
                    // Unknown condition type: do not hit
                    break;
            }

            if (isHit) {
                hitConditions.push({ condition: cond, reason });
            }
        }

        return {
            anyHit: hitConditions.length > 0,
            hitConditions
        };
    }
}

module.exports = BreakConditionEvaluator;
