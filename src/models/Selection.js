'use strict';
/**
 * src/models/Selection.js
 */
class Selection {
    constructor({ selectionId, label, side, odds }) {
        if (!selectionId || !label) {
            throw new Error('Selection requires selectionId and label');
        }
        this.selectionId = selectionId;
        this.label = label; // '홈승' | '무' | '원정승' | '언더' | '오버' | '홀' | '짝' etc.
        this.side = side;   // 'HOME' | 'AWAY' | 'DRAW' | 'UNDER' | 'OVER' | 'ODD' | 'EVEN'
        this.odds = (odds !== null && odds !== undefined) ? parseFloat(odds) : null;
        Object.freeze(this);
    }
}

module.exports = Selection;
