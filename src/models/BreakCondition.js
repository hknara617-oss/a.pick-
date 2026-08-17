'use strict';
/**
 * src/models/BreakCondition.js
 */
class BreakCondition {
    constructor({
        conditionId,
        type, // 'PRICE_LT' | 'PRICE_GT' | 'LINE_CHANGED' | 'MARKET_UNPRICED' | 'MARKET_STALE' | 'EVENT_TIME_REACHED' | 'DATA_MISSING' | 'DATA_STALE' | 'CONTEXT_SIGNAL_OCCURRED'
        threshold = null,
        targetField = null,
        targetCategory = null,
        targetCode = null,
        description = ''
    }) {
        if (!type) throw new Error('BreakCondition requires type');
        this.conditionId = conditionId || `${type}_${Math.random().toString(36).slice(2, 8)}`;
        this.type = type;
        this.threshold = threshold;
        this.targetField = targetField;
        this.targetCategory = targetCategory;
        this.targetCode = targetCode;
        this.description = description;
        Object.freeze(this);
    }
}

module.exports = BreakCondition;
