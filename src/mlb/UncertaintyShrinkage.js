'use strict';
/**
 * UncertaintyShrinkage.js
 * Computes model confidence score and applies shrinkage toward market prior.
 *
 * PRINCIPLE:
 *   UNKNOWN starter → delta=0, NOT a penalty. Uncertainty increases.
 *   Missing data → A.PICK departs LESS from market, not more.
 *   confidence ∈ [0,1]
 *   P_final = P_market + confidence * (P_raw - P_market)
 *
 * CONFIDENCE STRUCTURE:
 *   base_confidence = 0.70   (v0: we never fully trust our model)
 *   Each missing input multiplies by a reduction factor.
 *
 * COMPONENTS:
 *   starterBothKnown      factor: 1.00 | 0.60 (one unknown) | 0.30 (both unknown)
 *   starterSampleSize     factor: based on min(homeIP, awayIP) / TARGET_IP
 *   offenseComplete       factor: 1.00 | 0.85
 *   bullpenVerified       factor: always 1.00 (D_bullpen=0, no penalty for missing)
 *   injuryDataAvailable   factor: always 1.00 (blocked — missing != unhealthy)
 *   parkFactorAvailable   factor: 1.00 | 0.98 (very small, park only matters strongly at COL)
 */

const BASE_CONFIDENCE = 0.70;  // v0 ceiling: model is unvalidated
const TARGET_IP       = 150;   // full-season starter

/**
 * @param {Object} inputs
 *   homeStarterStatus    'CONFIRMED' | 'UNKNOWN'
 *   awayStarterStatus    'CONFIRMED' | 'UNKNOWN'
 *   homeStarterIP        number|null
 *   awayStarterIP        number|null
 *   offenseComplete      boolean
 *   bullpenVerified      boolean  (= false always in v0)
 *   injuryDataAvailable  boolean  (= false always in v0)
 *   parkFactorAvailable  boolean
 * @returns {{ confidence, breakdown, label }}
 */
function computeConfidence(inputs) {
    const {
        homeStarterStatus,
        awayStarterStatus,
        homeStarterIP,
        awayStarterIP,
        offenseComplete,
        bullpenVerified = false,    // not used in v0 probability
        injuryDataAvailable = false,
        parkFactorAvailable = false
    } = inputs;

    let c = BASE_CONFIDENCE;
    const breakdown = { base: BASE_CONFIDENCE };

    // ── Starter status factor ─────────────────────────────────────────────
    const homeKnown = homeStarterStatus === 'CONFIRMED';
    const awayKnown = awayStarterStatus === 'CONFIRMED';

    let starterStatusFactor;
    if      ( homeKnown &&  awayKnown) starterStatusFactor = 1.00;
    else if (!homeKnown && !awayKnown) starterStatusFactor = 0.30;
    else                               starterStatusFactor = 0.60;

    c *= starterStatusFactor;
    breakdown.starterStatus = { factor: starterStatusFactor, homeKnown, awayKnown };

    // ── Starter sample size factor ────────────────────────────────────────
    // Uses the LOWER of the two known starters' IP
    const ips = [];
    if (homeKnown && homeStarterIP) ips.push(parseFloat(homeStarterIP));
    if (awayKnown && awayStarterIP) ips.push(parseFloat(awayStarterIP));

    let sampleFactor = 1.00;
    if (ips.length > 0) {
        const minIP = Math.min(...ips);
        // Linear scale: 0 IP → 0.50 factor, TARGET_IP → 1.00 factor
        sampleFactor = 0.50 + 0.50 * Math.min(1, minIP / TARGET_IP);
    }
    c *= sampleFactor;
    breakdown.starterSample = { factor: sampleFactor, ips };

    // ── Offense completeness ──────────────────────────────────────────────
    const offenseFactor = offenseComplete ? 1.00 : 0.85;
    c *= offenseFactor;
    breakdown.offense = { factor: offenseFactor, complete: offenseComplete };

    // ── Bullpen: v0 exclusion ─────────────────────────────────────────────
    // D_bullpen = 0, so missing bullpen data doesn't reduce confidence
    // (we're not using it, so its absence doesn't hurt our model)
    breakdown.bullpen = { factor: 1.00, note: 'D_bullpen=0 in v0 — not contributing to probability' };

    // ── Injury data ───────────────────────────────────────────────────────
    // Missing ≠ healthy. But since we can't act on it, no reduction.
    breakdown.injury = { factor: 1.00, note: 'injuryDataAvailable=false — ESPN blocked; uncertainty is external' };

    // ── Park factor ───────────────────────────────────────────────────────
    // Small factor — park matters mostly at Coors (D_park still 0 in v0)
    const parkFactor = parkFactorAvailable ? 1.00 : 0.98;
    c *= parkFactor;
    breakdown.park = { factor: parkFactor, available: parkFactorAvailable };

    // ── Final ─────────────────────────────────────────────────────────────
    const confidence = Math.max(0, Math.min(1, c));
    const label = confidence >= 0.55 ? 'HIGH'
                : confidence >= 0.35 ? 'MEDIUM'
                : 'LOW';

    return { confidence, breakdown, label };
}

/**
 * Apply shrinkage.
 * P_final = P_market + confidence * (P_raw - P_market)
 */
function shrink(pMarket, pRaw, confidence) {
    return pMarket + confidence * (pRaw - pMarket);
}

module.exports = { BASE_CONFIDENCE, TARGET_IP, computeConfidence, shrink };
