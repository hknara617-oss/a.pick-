'use strict';

/**
 * src/watch/ChangeMaterialityEngine.js
 * Detects differences between prior and current evaluation state,
 * categorizes change types, and determines deterministic materiality.
 */
class ChangeMaterialityEngine {
    /**
     * Detect changes between previous and current evaluation contexts.
     *
     * @param {Object} prev - previous evaluation snapshot
     * @param {Object} curr - current evaluation snapshot
     * @param {DecisionContract} contract
     * @param {WatchPolicy} policy
     * @returns {{ detectedChanges: Array<{ type: string, payload: Object, materiality: string }>, highestMateriality: string }}
     */
    static detectChanges(prev, curr, contract, policy = {}) {
        const changes = [];

        if (!prev) {
            // Initial baseline observation
            return {
                detectedChanges: [{
                    type: 'WATCH_INITIALIZED',
                    payload: { odds: curr.currentOdds, priceState: curr.priceState, thesisState: curr.thesisState },
                    materiality: 'NONE'
                }],
                highestMateriality: 'NONE'
            };
        }

        const minDelta = policy.minimumPriceChange || 0.03;

        // 1. Price Changes & Threshold Crossing
        if (prev.currentOdds !== null && curr.currentOdds !== null && prev.currentOdds !== curr.currentOdds) {
            const delta = Math.abs(curr.currentOdds - prev.currentOdds);
            const minEntry = curr.minimumEntryOdds;

            // Threshold Crossing Down (was >= minEntry, now < minEntry)
            if (minEntry && prev.currentOdds >= minEntry && curr.currentOdds < minEntry) {
                changes.push({
                    type: 'PRICE_THRESHOLD_CROSSED_DOWN',
                    payload: { prevOdds: prev.currentOdds, currOdds: curr.currentOdds, minEntry },
                    materiality: 'HIGH'
                });
            }
            // Threshold Crossing Up (was < minEntry, now >= minEntry)
            else if (minEntry && prev.currentOdds < minEntry && curr.currentOdds >= minEntry) {
                changes.push({
                    type: 'PRICE_THRESHOLD_CROSSED_UP',
                    payload: { prevOdds: prev.currentOdds, currOdds: curr.currentOdds, minEntry },
                    materiality: 'HIGH'
                });
            }
            // General price change
            else if (delta >= minDelta) {
                changes.push({
                    type: 'PRICE_CHANGED',
                    payload: { prevOdds: prev.currentOdds, currOdds: curr.currentOdds, delta: parseFloat(delta.toFixed(4)) },
                    materiality: delta >= 0.10 ? 'MEDIUM' : 'LOW'
                });
            } else {
                // Sub-threshold noise
                changes.push({
                    type: 'PRICE_CHANGED_NOISE',
                    payload: { prevOdds: prev.currentOdds, currOdds: curr.currentOdds, delta: parseFloat(delta.toFixed(4)) },
                    materiality: 'NONE'
                });
            }
        }

        // 2. Line Movement
        if (prev.currentLine !== undefined && curr.currentLine !== undefined && prev.currentLine !== curr.currentLine) {
            changes.push({
                type: 'LINE_CHANGED',
                payload: { prevLine: prev.currentLine, currLine: curr.currentLine },
                materiality: 'HIGH'
            });
        }

        // 3. Market Availability / Status
        if (prev.priceState !== curr.priceState) {
            if (curr.priceState === 'UNPRICED') {
                changes.push({
                    type: 'MARKET_UNPRICED',
                    payload: { prevPriceState: prev.priceState },
                    materiality: 'HIGH'
                });
            } else if (prev.priceState === 'UNPRICED' && curr.priceState !== 'UNPRICED') {
                changes.push({
                    type: 'MARKET_PRICED',
                    payload: { currPriceState: curr.priceState, odds: curr.currentOdds },
                    materiality: 'MEDIUM'
                });
            }
        }

        // 4. Freshness Transitions
        if (prev.freshness !== curr.freshness) {
            if (curr.freshness === 'STALE') {
                changes.push({
                    type: 'MARKET_STALE',
                    payload: { prevFreshness: prev.freshness },
                    materiality: 'HIGH'
                });
            } else if (curr.freshness === 'DEGRADED') {
                changes.push({
                    type: 'MARKET_AGING',
                    payload: { prevFreshness: prev.freshness },
                    materiality: 'LOW'
                });
            } else if (curr.freshness === 'FRESH' && prev.freshness !== 'FRESH') {
                changes.push({
                    type: 'MARKET_FRESH',
                    payload: { prevFreshness: prev.freshness },
                    materiality: 'LOW'
                });
            }
        }

        // 5. Break Conditions
        if (prev.thesisState !== 'BROKEN' && curr.thesisState === 'BROKEN') {
            changes.push({
                type: 'BREAK_CONDITION_HIT',
                payload: { reasons: curr.brokenReasons },
                materiality: 'CRITICAL'
            });
        }

        // 6. Thesis State Transitions
        if (prev.thesisState !== curr.thesisState && curr.thesisState !== 'BROKEN') {
            changes.push({
                type: 'THESIS_STATE_CHANGED',
                payload: { prevThesis: prev.thesisState, currThesis: curr.thesisState, reasons: curr.weakenedReasons },
                materiality: curr.thesisState === 'WEAKENED' ? 'HIGH' : 'MEDIUM'
            });
        }

        // 7. Action State Transitions
        if (prev.actionState !== curr.actionState) {
            changes.push({
                type: 'ACTION_STATE_CHANGED',
                payload: { prevAction: prev.actionState, currAction: curr.actionState },
                materiality: (curr.actionState === 'REVIEW' || curr.actionState === 'ENTER' || prev.actionState === 'ENTER') ? 'HIGH' : 'MEDIUM'
            });
        }

        // 8. Context Signals Added / Changed
        const prevSigCodes = new Set((prev.signalsEvaluated || []).map(s => s.code));
        const newSignals = (curr.signalsEvaluated || []).filter(s => !prevSigCodes.has(s.code));
        for (const sig of newSignals) {
            const mat = (sig.severity === 'CRITICAL') ? 'CRITICAL'
                      : (sig.severity === 'HIGH') ? 'HIGH'
                      : (sig.severity === 'MEDIUM') ? 'MEDIUM' : 'LOW';
            changes.push({
                type: 'CONTEXT_SIGNAL_ADDED',
                payload: { category: sig.category, code: sig.code, direction: sig.direction, severity: sig.severity, ref: sig.evidenceRef },
                materiality: mat
            });
        }

        // Calculate highest materiality
        const priorityOrder = { 'CRITICAL': 4, 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1, 'NONE': 0 };
        let maxVal = 0;
        let highest = 'NONE';
        for (const c of changes) {
            const val = priorityOrder[c.materiality] || 0;
            if (val > maxVal) {
                maxVal = val;
                highest = c.materiality;
            }
        }

        return {
            detectedChanges: changes,
            highestMateriality: highest
        };
    }
}

module.exports = ChangeMaterialityEngine;
