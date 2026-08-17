'use strict';

/**
 * src/intelligence/Evidence.js
 * Atomic structural evidence unit for Sports Decision Intelligence.
 * No prediction essays — strictly structured facts with baselines, deltas, and break conditions.
 */
class Evidence {
    constructor({
        evidenceId,
        domain, // MARKET | STARTER | LINEUP | OFFENSE | DEFENSE | BULLPEN | SCHEDULE | TACTICAL
        claim,
        value = null,
        baseline = null,
        delta = null,
        direction, // SUPPORT | OPPOSE | NEUTRAL
        materiality = 'MEDIUM', // LOW | MEDIUM | HIGH | CRITICAL
        reliability = 'VERIFIED', // VERIFIED | STRONG | WEAK | UNKNOWN | SAMPLE_TOO_SMALL
        sampleSize = null, // e.g. '9.0 IP', '21 Games'
        decisionRelevance = 'DIRECT', // DIRECT | CONTEXTUAL | LOW_CONFIDENCE
        evidenceClass = 'OUTCOME_EVIDENCE', // OUTCOME_EVIDENCE | MARKET_STRUCTURE | INFORMATION_RISK | USER_DECISION_RISK
        rawEvidenceRef = null, // link to raw JSON payload or official API endpoint
        source = 'BETMAN_PROVIDER',
        observedAt = new Date().toISOString(),
        invalidationCondition = null
    }) {
        if (!domain || !claim || !direction) {
            throw new Error('Evidence requires domain, claim, direction');
        }
        this.evidenceId = evidenceId || `ev_${Math.random().toString(36).slice(2, 10)}`;
        this.domain = domain;
        this.claim = claim;
        this.value = value;
        this.baseline = baseline;
        this.delta = delta;
        this.direction = direction;
        this.materiality = materiality;
        this.reliability = reliability;
        this.sampleSize = sampleSize;
        this.decisionRelevance = decisionRelevance;
        this.evidenceClass = evidenceClass;
        this.rawEvidenceRef = rawEvidenceRef || `${source}_${domain}_${Date.now()}`;
        this.source = source;
        this.observedAt = observedAt;
        this.invalidationCondition = invalidationCondition;
    }
}

module.exports = Evidence;
