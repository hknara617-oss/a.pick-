'use strict';
/**
 * FairPriceResult.js
 * Assembles the final MLBFairPriceResult object.
 * Computes information edge, betting edge, EV.
 *
 * DO NOT add BUY/WATCH/PASS labels here — thresholds not yet calibrated.
 */

const { informationEdge, bettingEdge, expectedValue } = require('./FairModelMath');

const MODEL_VERSION = 'v0.1.0-SHADOW-NOT-CALIBRATED';

/**
 * @param {Object} p
 *   gameId
 *   homeTeam / awayTeam
 *   market: { homeOdds, awayOdds, noVigHome, noVigAway }
 *   adjustments: { starterLogitDelta, offenseLogitDelta, bullpenLogitDelta,
 *                  restLogitDelta, parkLogitDelta, L_raw, L_capped, P_raw, appliedGlobalCap }
 *   modelConfidence: number
 *   confidenceLabel: string
 *   confidenceBreakdown: object
 *   finalFairHomeProbability: number
 *   dataQuality: object
 *   missingFields: string[]
 *   shadow: boolean
 * @returns {Object} MLBFairPriceResult
 */
function buildFairPriceResult(p) {
    const {
        gameId, gamePk, gameDate, betmanMatchSeq,
        homeTeam, awayTeam,
        market,
        adjustments,
        modelConfidence,
        confidenceLabel,
        confidenceBreakdown,
        finalFairHomeProbability: P_final,
        dataQuality,
        missingFields
    } = p;

    const shadow = true; // always SHADOW in v0
    const pFair  = P_final;
    const pMarket = market.noVigHome;

    // Information edge: A.PICK vs market no-vig
    const infoEdge = informationEdge(pFair, pMarket);

    // Betting edge for HOME selection
    const betEdgeHome = bettingEdge(pFair, market.homeOdds);

    // Betting edge for AWAY selection (using 1 - P_final for away)
    const betEdgeAway = bettingEdge(1 - pFair, market.awayOdds);

    // EV per unit stake
    const evHome = expectedValue(pFair, market.homeOdds);
    const evAway = expectedValue(1 - pFair, market.awayOdds);

    // Fair decimal odds (two-way)
    const fairHomeOdds = pFair > 0 ? (1 / pFair) : null;
    const fairAwayOdds = (1 - pFair) > 0 ? (1 / (1 - pFair)) : null;

    return {
        gameId,
        gamePk,
        gameDate,
        betmanMatchSeq,

        homeTeam,
        awayTeam,

        market: {
            homeOdds: market.homeOdds,
            awayOdds: market.awayOdds,
            noVigHome: pct(market.noVigHome),
            noVigAway: pct(market.noVigAway),
            overround: pct(market.overround)
        },

        adjustments: {
            starterLogitDelta: round4(adjustments.starterLogitDelta),
            offenseLogitDelta: round4(adjustments.offenseLogitDelta),
            bullpenLogitDelta: 0,   // BLOCKED in v0
            restLogitDelta:    0,   // not yet implemented
            parkLogitDelta:    0,   // not yet implemented
            L_marketLogit:     round4(adjustments.L_market),
            L_rawLogit:        round4(adjustments.L_raw),
            L_cappedLogit:     round4(adjustments.L_capped),
            P_raw:             pct(adjustments.P_raw),
            globalCapApplied:  adjustments.appliedCap
        },

        modelConfidence: round4(modelConfidence),
        confidenceLabel,
        confidenceBreakdown,

        rawFairProbability:   pct(adjustments.P_raw),
        finalFairProbability: pct(P_final),

        fairOdds: {
            home: fairHomeOdds !== null ? round4(fairHomeOdds) : null,
            away: fairAwayOdds !== null ? round4(fairAwayOdds) : null
        },

        edges: {
            // Information edge: A.PICK vs market no-vig
            informationEdgePct:      pct(infoEdge),
            informationEdgeNote:     'P_final - noVigMarket (market disagreement)',

            // Betting edge: P_final vs break-even at offered price
            bettingEdgeHomePct:      pct(betEdgeHome),
            bettingEdgeAwayPct:      pct(betEdgeAway),
            bettingEdgeNote:         'P_final - (1/offeredOdds) — true +EV test',

            // These can differ significantly! See note below.
            edgeSignWarning: (infoEdge > 0 && betEdgeHome < 0)
                ? 'POSITIVE_INFO_EDGE_BUT_NEGATIVE_BETTING_EDGE: market has priced out the value'
                : (infoEdge < 0 && betEdgeAway > 0)
                ? 'CHECK_AWAY: model favors away but check infoEdge sign'
                : 'OK'
        },

        expectedReturn: {
            homeEVPerUnit:  round4(evHome),
            awayEVPerUnit:  round4(evAway),
            note: 'EV = P*O - 1. Positive = +EV at this fair probability estimate.'
        },

        dataQuality,
        missingFields,

        shadow: {
            isShadow: shadow,
            label: 'SHADOW / NOT CALIBRATED / DO NOT USE AS PICK',
            reason: 'v0 model — no historical calibration completed'
        },

        modelVersion: MODEL_VERSION,
        calculatedAt: new Date().toISOString()
    };
}

function pct(v) {
    return v !== null && v !== undefined ? parseFloat((v * 100).toFixed(2)) : null;
}
function round4(v) {
    return v !== null && v !== undefined ? parseFloat(v.toFixed(4)) : null;
}

module.exports = { buildFairPriceResult, MODEL_VERSION };
