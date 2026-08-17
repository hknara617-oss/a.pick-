'use strict';
/**
 * OffenseAdjustment.js
 * Converts team batting stats into a logit-space delta.
 *
 * DESIGN PRINCIPLES:
 * - Compact, non-duplicative: OPS is primary metric
 *   (OBP + SLG already captured in OPS; redundant to also add separately)
 * - Supplement OPS with BB rate (plate discipline) and K rate (contact)
 *   as they capture information OPS misses
 * - Normalize vs league average (MLB 2026 computed from statsapi)
 * - Module cap: ±0.20 logits ≈ ±4.8%p at p=0.50
 * - Limitation: NO_HAND_SPLIT — season aggregate only in v0
 *
 * SELECTED FEATURES (non-duplicative):
 *   OPS        → primary run-scoring power
 *   BB rate    → plate discipline (captured partially by OBP, but explicit signal)
 *   K rate     → contact quality (negatively correlated with OPS but adds signal)
 *
 *   NOT INCLUDED: AVG, OBP, SLG separately (redundant given OPS)
 *   NOT INCLUDED: HR rate (mostly captured in SLG)
 */

const OFFENSE_MODULE_CAP = 0.20;   // max ±0.20 logits

/**
 * Compute per-team offensive Z-score relative to league.
 *
 * Z = w_ops * Z_ops + w_bb * Z_bb + w_k * (-Z_k)
 *
 * Negative K rate contribution: high K rate is bad.
 *
 * Weights: OPS 70%, BB rate 15%, K rate 15%
 * (OPS already encodes most batting value; BB/K are supplementary)
 *
 * @param {Object} teamStat    - { ops, obp, slg, avg, baseOnBalls, strikeOuts, plateAppearances }
 * @param {Object} leagueAvg   - { ops, bbRate, kRate, opsStd, bbRateStd, kRateStd }
 * @returns {number|null} Z-score (positive = better than average)
 */
function offenseZScore(teamStat, leagueAvg) {
    if (!teamStat || !teamStat.ops) return null;

    const ops = parseFloat(teamStat.ops);
    if (isNaN(ops)) return null;

    const Z_ops = (ops - leagueAvg.ops) / leagueAvg.opsStd;

    // BB rate = BB / PA
    let Z_bb = 0;
    if (teamStat.plateAppearances && teamStat.baseOnBalls) {
        const bbRate = teamStat.baseOnBalls / teamStat.plateAppearances;
        Z_bb = (bbRate - leagueAvg.bbRate) / leagueAvg.bbRateStd;
    }

    // K rate = K / PA
    let Z_k = 0;
    if (teamStat.plateAppearances && teamStat.strikeOuts) {
        const kRate = teamStat.strikeOuts / teamStat.plateAppearances;
        Z_k = (kRate - leagueAvg.kRate) / leagueAvg.kRateStd;
    }

    // Combine: higher Z = better offense
    return 0.70 * Z_ops + 0.15 * Z_bb + 0.15 * (-Z_k);
}

/**
 * Compute league averages from the 30-team batting splits.
 * Called once per run, not per game.
 *
 * @param {Array} splits  - statsapi splits [{team, stat:{ops,baseOnBalls,strikeOuts,plateAppearances}}]
 * @returns {Object} leagueAvg
 */
function computeLeagueOffenseAvg(splits) {
    const valid = splits.filter(s => s.stat?.ops && s.stat?.plateAppearances > 0);
    if (valid.length === 0) throw new Error('No valid batting splits for league average');

    const ops    = valid.map(s => parseFloat(s.stat.ops));
    const bbRates = valid.map(s => (s.stat.baseOnBalls || 0) / s.stat.plateAppearances);
    const kRates  = valid.map(s => (s.stat.strikeOuts  || 0) / s.stat.plateAppearances);

    function mean(arr) { return arr.reduce((a, b) => a + b, 0) / arr.length; }
    function std(arr, m) {
        return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length) || 1e-6;
    }

    const m_ops   = mean(ops);
    const m_bb    = mean(bbRates);
    const m_k     = mean(kRates);

    return {
        ops:       m_ops,
        opsStd:    std(ops, m_ops),
        bbRate:    m_bb,
        bbRateStd: std(bbRates, m_bb),
        kRate:     m_k,
        kRateStd:  std(kRates, m_k),
        n:         valid.length,
        computedAt: new Date().toISOString()
    };
}

/**
 * Offense logit delta for a game.
 *
 * D_offense = coefficient * (homeZ - awayZ)
 * Positive differential → home offense better → positive logit → higher home win prob.
 *
 * v0 coefficient: 0.10 logits per 1 Z-score unit
 * (offense is a shared-resource model — both teams hit, run environment matters more
 *  in totals than win probability directly; conservative coefficient)
 *
 * MODULE CAP: ±0.20 logits
 */
const OFFENSE_COEFFICIENT = 0.10;  // logits per Z-unit

function offenseLogitDelta(homeZ, awayZ) {
    if (homeZ === null || awayZ === null) {
        return { delta: 0, note: 'MISSING_OFFENSE_DATA' };
    }
    const raw = OFFENSE_COEFFICIENT * (homeZ - awayZ);
    const capped = Math.max(-OFFENSE_MODULE_CAP, Math.min(OFFENSE_MODULE_CAP, raw));
    return {
        delta:  capped,
        raw,
        homeZ,  awayZ,
        capped: Math.abs(capped) < Math.abs(raw),
        note: Math.abs(capped) < Math.abs(raw) ? 'CAP_APPLIED' : 'OK',
        limitation: 'NO_HAND_SPLIT'
    };
}

/**
 * Full offense adjustment for a game.
 *
 * @param {Object} homeOffense  - statsapi split stat object
 * @param {Object} awayOffense  - statsapi split stat object
 * @param {Object} leagueAvg    - output of computeLeagueOffenseAvg
 * @returns {{ logitDelta, homeZ, awayZ, note }}
 */
function computeOffenseAdjustment(homeOffense, awayOffense, leagueAvg) {
    const homeStat = homeOffense?.stat ?? null;
    const awayStat = awayOffense?.stat ?? null;

    const homeZ = offenseZScore(homeStat, leagueAvg);
    const awayZ  = offenseZScore(awayStat, leagueAvg);

    const result = offenseLogitDelta(homeZ, awayZ);
    return {
        logitDelta: result.delta,
        homeZ, awayZ,
        raw: result.raw,
        capped: result.capped,
        note: result.note,
        limitation: 'NO_HAND_SPLIT — v0 season aggregate only'
    };
}

module.exports = {
    OFFENSE_MODULE_CAP,
    OFFENSE_COEFFICIENT,
    offenseZScore,
    computeLeagueOffenseAvg,
    offenseLogitDelta,
    computeOffenseAdjustment
};
