'use strict';
/**
 * StarterAdjustment.js
 * Converts starter profiles into a logit-space delta.
 *
 * DESIGN PRINCIPLES:
 * - Season data dominates recent form (~70-80% weight)
 * - Sample-size shrinkage: short IP → pulled toward league average
 * - UNKNOWN starter → delta=0, uncertainty increases externally
 * - Capped in logit space
 *
 * MODULE CAP: ±0.40 logits ≈ ±9.4%p at p=0.50
 * (largest single module, but still conservative for v0)
 */

// ── League averages (MLB 2026 — populated from statsapi at runtime) ──────────
// These are placeholder constants; run_model_gate.js will compute from real data.
const LEAGUE_DEFAULTS = {
    ERA:  4.10,
    WHIP: 1.27,
    TARGET_IP: 150,   // full-season starter baseline for reliability
    TARGET_IP_SEASON: 50  // minimum before results are unreliable
};

/**
 * Reliability weight based on IP (sample size).
 * reliability = min(1, IP / targetIP)
 * Short-IP pitchers are shrunk toward league average.
 */
function reliability(inningsPitched, targetIP = LEAGUE_DEFAULTS.TARGET_IP) {
    if (!inningsPitched || inningsPitched <= 0) return 0;
    return Math.min(1, inningsPitched / targetIP);
}

/**
 * Single pitcher quality score (lower = better).
 * Combines ERA and WHIP with 60/40 weighting.
 * Normalizes against league average.
 *
 * Returns a Z-score-like value:
 *   0   = exactly league average
 *   < 0 = better than average
 *   > 0 = worse than average
 */
function pitcherZScore(era, whip, ip, leagueEra, leagueWhip) {
    const eraStd  = 0.80;   // approximate MLB ERA std dev across starters
    const whipStd = 0.18;   // approximate WHIP std dev

    const eraZ  = (era  - leagueEra)  / eraStd;
    const whipZ = (whip - leagueWhip) / whipStd;

    // Weighted: ERA 60%, WHIP 40%
    const rawZ = 0.60 * eraZ + 0.40 * whipZ;

    // Sample-size shrinkage → pull toward 0 (league avg) for low IP
    const rel = reliability(ip);
    return rel * rawZ;
}

/**
 * Compute season + recent combined quality.
 * Season dominates (75%), recent is 25% but with aggressive additional shrinkage.
 *
 * @param {Object} seasonStats - { era, whip, inningsPitched }
 * @param {Array}  recentStarts - [{ip, er, bb, k}]   last 3-5 starts
 * @param {Object} leagueAvg    - { ERA, WHIP }
 * @returns {number} composite Z-score (negative = pitcher better than avg)
 */
function combinedStarterZ(seasonStats, recentStarts, leagueAvg) {
    const la = leagueAvg || LEAGUE_DEFAULTS;

    if (!seasonStats || !seasonStats.era || !seasonStats.whip) return null;

    const seasonZ = pitcherZScore(
        parseFloat(seasonStats.era),
        parseFloat(seasonStats.whip),
        parseFloat(seasonStats.inningsPitched || 0),
        la.ERA, la.WHIP
    );

    // Recent form: compute ERA/WHIP from last 3 starts if available
    let recentZ = 0;
    let recentWeight = 0;
    if (recentStarts && recentStarts.length >= 2) {
        const totalIP = recentStarts.reduce((s, g) => s + parseFloat(g.ip || 0), 0);
        const totalER = recentStarts.reduce((s, g) => s + parseFloat(g.er || 0), 0);
        const totalBB = recentStarts.reduce((s, g) => s + parseFloat(g.bb || 0), 0);
        const totalH  = 0; // not tracked currently — skip WHIP for recent

        if (totalIP > 0) {
            const recentERA  = (totalER / totalIP) * 9;
            // Use season WHIP as placeholder for recent WHIP (BB/IP * 9 approximation is unreliable without H)
            const recentWhip = parseFloat(seasonStats.whip); // fallback

            // Recent form has its own IP-based shrinkage (targetIP = 18 for 3 starts)
            const recentRel = reliability(totalIP, 18);
            recentZ = recentRel * pitcherZScore(recentERA, recentWhip, totalIP, la.ERA, la.WHIP);
            recentWeight = 0.25;
        }
    }

    // Blend: 75% season + 25% recent (when recent available)
    const seasonWeight = 1 - recentWeight;
    return seasonWeight * seasonZ + recentWeight * recentZ;
}

/**
 * Convert differential starter Z-score to logit delta.
 *
 * D_starter = -coefficient * (homeZ - awayZ)
 *
 * Negative because:
 *   lower Z = better pitcher → negative Z differential favors home
 *   → positive logit adjustment for home probability
 *
 * v0 coefficient: 0.25 logits per 1 Z-score unit
 * (empirically: 1 SD ERA difference ≈ 5-7%p at 50% → 0.20-0.28 logits)
 *
 * MODULE CAP: ±0.40 logits
 */
const STARTER_COEFFICIENT  = 0.25;   // logits per Z-unit
const STARTER_MODULE_CAP   = 0.40;   // max ±0.40 logits from this module

function starterLogitDelta(homeZ, awayZ) {
    if (homeZ === null || awayZ === null) return { delta: 0, note: 'UNKNOWN_STARTER_DELTA_ZERO' };
    const raw = -STARTER_COEFFICIENT * (homeZ - awayZ);
    const capped = Math.max(-STARTER_MODULE_CAP, Math.min(STARTER_MODULE_CAP, raw));
    return {
        delta:  capped,
        raw,
        capped: Math.abs(capped) < Math.abs(raw),
        homeZ,  awayZ,
        note: Math.abs(capped) < Math.abs(raw) ? 'CAP_APPLIED' : 'OK'
    };
}

/**
 * Full starter adjustment for a game.
 *
 * @param {Object} homeStarter  - StarterProfile
 * @param {Object} awayStarter  - StarterProfile
 * @param {Object} leagueAvg    - { ERA, WHIP }
 * @returns {{ logitDelta, homeZ, awayZ, confidence, note }}
 */
function computeStarterAdjustment(homeStarter, awayStarter, leagueAvg) {
    const homeUnknown = !homeStarter || homeStarter.status === 'UNKNOWN';
    const awayUnknown = !awayStarter || awayStarter.status === 'UNKNOWN';

    if (homeUnknown && awayUnknown) {
        return { logitDelta: 0, homeZ: null, awayZ: null,
                 uncertaintyPenalty: 'BOTH_UNKNOWN', note: 'delta=0, max_uncertainty' };
    }

    const homeZ = homeUnknown ? null
        : combinedStarterZ(homeStarter.seasonStats, homeStarter.recentStarts, leagueAvg);
    const awayZ  = awayUnknown ? null
        : combinedStarterZ(awayStarter.seasonStats, awayStarter.recentStarts, leagueAvg);

    // If one side is UNKNOWN → we know the other side's quality
    // but cannot compute differential → conservative: delta=0
    if (homeZ === null || awayZ === null) {
        return { logitDelta: 0, homeZ, awayZ,
                 uncertaintyPenalty: homeUnknown ? 'HOME_UNKNOWN' : 'AWAY_UNKNOWN',
                 note: 'one_side_unknown → delta=0, uncertainty increases' };
    }

    const result = starterLogitDelta(homeZ, awayZ);
    return {
        logitDelta: result.delta,
        homeZ, awayZ,
        raw: result.raw,
        capped: result.capped,
        uncertaintyPenalty: null,
        note: result.note
    };
}

module.exports = {
    LEAGUE_DEFAULTS,
    reliability,
    pitcherZScore,
    combinedStarterZ,
    computeStarterAdjustment,
    STARTER_COEFFICIENT,
    STARTER_MODULE_CAP
};
