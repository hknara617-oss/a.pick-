'use strict';
/**
 * FairModelMath.js
 * Pure functions: logit, sigmoid, log-odds model composition.
 * No side effects. Fully unit-testable.
 */

/** logit(p) = ln(p / (1-p)).  Requires 0 < p < 1. */
function logit(p) {
    if (p <= 0 || p >= 1) throw new RangeError(`logit requires 0<p<1, got ${p}`);
    return Math.log(p / (1 - p));
}

/** sigmoid(x) = 1 / (1 + e^(-x)) */
function sigmoid(x) {
    return 1 / (1 + Math.exp(-x));
}

/**
 * Log-odds model:
 *   L_raw = logit(P_market) + sum(deltas)
 *   P_raw = sigmoid(L_raw)
 *
 * @param {number} pMarket  - no-vig market probability (0<p<1)
 * @param {Object} deltas   - { starter, offense, bullpen, rest, park, other }
 * @param {number} globalCap - max abs logit departure from market prior
 * @returns {{ L_market, L_raw, L_capped, P_raw, appliedCap }}
 */
function applyLogOddsModel(pMarket, deltas = {}, globalCap = 0.50) {
    const L_market = logit(pMarket);
    const D_total = (deltas.starter || 0)
                  + (deltas.offense || 0)
                  + (deltas.bullpen || 0)   // = 0 until verified
                  + (deltas.rest    || 0)
                  + (deltas.park    || 0);

    const L_uncapped = L_market + D_total;
    const departure  = L_uncapped - L_market;
    const capped     = Math.max(-globalCap, Math.min(globalCap, departure));
    const L_capped   = L_market + capped;
    const appliedCap = Math.abs(capped) < Math.abs(departure);

    return {
        L_market,
        D_total,
        L_raw:    L_uncapped,
        L_capped,
        P_raw:    sigmoid(L_capped),
        appliedCap
    };
}

/**
 * Uncertainty shrinkage:
 *   P_final = P_market + confidence * (P_raw - P_market)
 *
 * confidence ∈ [0,1].  0 = ignore model, 1 = trust model fully.
 * In v0, confidence is always < 1 even at HIGH quality.
 */
function applyUncertaintyShrinkage(pMarket, pRaw, confidence) {
    if (confidence < 0 || confidence > 1) throw new RangeError('confidence must be in [0,1]');
    return pMarket + confidence * (pRaw - pMarket);
}

/**
 * Information edge:
 *   How much does A.PICK disagree with the market no-vig probability?
 *   informationEdge = P_final - P_noVigMarket
 */
function informationEdge(pFinal, pNoVigMarket) {
    return pFinal - pNoVigMarket;
}

/**
 * Betting edge:
 *   Is the offered price +EV at our probability?
 *   breakEven = 1 / offeredOdds
 *   bettingEdge = P_final - breakEven
 *
 * Can be NEGATIVE even when informationEdge > 0
 * (e.g., market has removed all value from price)
 */
function bettingEdge(pFinal, offeredOdds) {
    const breakEven = 1 / offeredOdds;
    return pFinal - breakEven;
}

/**
 * Expected value per 1 unit stake:
 *   EV = P * O - 1
 *   where O = decimal odds
 *
 * Positive EV = +EV bet at this probability estimate.
 */
function expectedValue(pFinal, offeredOdds) {
    return pFinal * offeredOdds - 1;
}

/**
 * logit approximation of %p move at a given base probability.
 * Used for cap design / interpretability.
 * Δlogit → Δp at p = base
 */
function logitDeltaToProb(deltaLogit, basep = 0.5) {
    return sigmoid(logit(basep) + deltaLogit) - basep;
}

module.exports = {
    logit, sigmoid,
    applyLogOddsModel,
    applyUncertaintyShrinkage,
    informationEdge,
    bettingEdge,
    expectedValue,
    logitDeltaToProb
};
