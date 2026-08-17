'use strict';

const NotificationCandidate = require('./NotificationCandidate');

/**
 * src/watch/NotificationSuppressionEngine.js
 * Generates compressed, template-based notification candidates and suppresses redundant noise.
 */
class NotificationSuppressionEngine {
    constructor() {
        this.activeDedupeKeys = new Map(); // dedupeKey -> { lastEmittedAt, count }
        this.oscillationHistory = new Map(); // decisionId -> Array of { value, timestamp }
    }

    /**
     * Evaluate changes and generate at most ONE compressed NotificationCandidate.
     * Returns null if changes are noise or suppressed.
     *
     * @param {DecisionContract} contract
     * @param {Array<Object>} detectedChanges
     * @param {string} highestMateriality
     * @param {Object} currentContext
     * @param {WatchPolicy} policy
     * @returns {NotificationCandidate|null}
     */
    evaluateAndGenerateCandidate(contract, detectedChanges, highestMateriality, currentContext, policy = {}) {
        if (!detectedChanges || detectedChanges.length === 0) return null;
        if (highestMateriality === 'NONE') return null;

        const notifPolicy = policy.notificationPolicy || { minSeverity: 'HIGH', suppressNoise: true, debounceWindowSeconds: 180 };
        const severityRank = { 'CRITICAL': 4, 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1, 'NONE': 0 };

        if ((severityRank[highestMateriality] || 0) < (severityRank[notifPolicy.minSeverity] || 3)) {
            // Below configured minimum severity for notifications
            return null;
        }

        // Hysteresis & Debounce check for rapid price oscillations
        const priceChange = detectedChanges.find(c => c.type === 'PRICE_THRESHOLD_CROSSED_DOWN' || c.type === 'PRICE_THRESHOLD_CROSSED_UP');
        if (priceChange && notifPolicy.suppressNoise) {
            const isOscillating = this.checkPriceOscillation(contract.id, currentContext.currentOdds, notifPolicy.debounceWindowSeconds);
            if (isOscillating) {
                return null; // Suppress rapid oscillation alert
            }
        }

        // Change Compression: Compress multiple simultaneous changes into one clear message
        const candidate = this.compressChangesToCandidate(contract, detectedChanges, highestMateriality, currentContext);
        if (!candidate) return null;

        // Deduplication Check
        if (this.isDeduplicated(candidate.dedupeKey, notifPolicy.debounceWindowSeconds)) {
            return null;
        }

        // Record dedupe key
        this.recordEmission(candidate.dedupeKey);

        return candidate;
    }

    /**
     * Compress multiple changes into a single Korean template notification.
     */
    compressChangesToCandidate(contract, detectedChanges, materiality, currentContext) {
        const breakHit = detectedChanges.find(c => c.type === 'BREAK_CONDITION_HIT');
        const thresholdDown = detectedChanges.find(c => c.type === 'PRICE_THRESHOLD_CROSSED_DOWN');
        const thresholdUp = detectedChanges.find(c => c.type === 'PRICE_THRESHOLD_CROSSED_UP');
        const lineChanged = detectedChanges.find(c => c.type === 'LINE_CHANGED');
        const starterChanged = detectedChanges.find(c => c.type === 'CONTEXT_SIGNAL_ADDED' && c.payload.code === 'STARTER_CHANGED');
        const marketStale = detectedChanges.find(c => c.type === 'MARKET_STALE');

        // Case 1: Starter changed + Break hit + Price movement (Multi-event compression)
        if (starterChanged && breakHit) {
            const oddsText = thresholdDown || thresholdUp ? ` 배당도 ${currentContext.currentOdds}로 변동되었습니다.` : '';
            return new NotificationCandidate({
                decisionId: contract.id,
                severity: 'CRITICAL',
                reasonCode: 'COMPRESSED_MULTI_CHANGE',
                title: '처음 판단을 다시 봐야 해요',
                body: `저장할 때 예정된 선발이 변경되어 사전에 정한 재검토 조건이 발생했습니다.${oddsText}`,
                actionState: currentContext.actionState,
                thesisState: currentContext.thesisState,
                evidenceRefs: starterChanged.payload.ref ? [starterChanged.payload.ref] : []
            });
        }

        // Case 2: Break condition hit
        if (breakHit) {
            const reason = breakHit.payload.reasons?.[0] || '조건 충족';
            return new NotificationCandidate({
                decisionId: contract.id,
                severity: 'CRITICAL',
                reasonCode: 'BREAK_CONDITION_HIT',
                title: '사전 설정한 재검토 조건이 발생했어요',
                body: `조건: ${reason}. 현재 상태를 다시 검토해야 합니다.`,
                actionState: currentContext.actionState,
                thesisState: currentContext.thesisState
            });
        }

        // Case 3: Price threshold crossed down
        if (thresholdDown) {
            return new NotificationCandidate({
                decisionId: contract.id,
                severity: 'HIGH',
                reasonCode: 'PRICE_THRESHOLD_CROSSED_DOWN',
                title: '진입 기준 아래로 내려왔어요',
                body: `저장 당시 ${contract.offeredOddsAtSeal} → 현재 ${thresholdDown.payload.currOdds}. 설정한 진입 기준(${thresholdDown.payload.minEntry})보다 낮아졌습니다.`,
                actionState: currentContext.actionState,
                thesisState: currentContext.thesisState
            });
        }

        // Case 4: Price threshold crossed up
        if (thresholdUp) {
            return new NotificationCandidate({
                decisionId: contract.id,
                severity: 'HIGH',
                reasonCode: 'PRICE_THRESHOLD_CROSSED_UP',
                title: '진입 기준 이상으로 회복되었어요',
                body: `현재 배당 ${thresholdUp.payload.currOdds}이(가) 설정한 진입 기준(${thresholdUp.payload.minEntry})을 충족했습니다.`,
                actionState: currentContext.actionState,
                thesisState: currentContext.thesisState
            });
        }

        // Case 5: Line changed
        if (lineChanged) {
            return new NotificationCandidate({
                decisionId: contract.id,
                severity: 'HIGH',
                reasonCode: 'LINE_CHANGED',
                title: '기준점(라인)이 변동되었습니다',
                body: `기준 라인이 ${lineChanged.payload.prevLine}에서 ${lineChanged.payload.currLine}(으)로 변경되었습니다.`,
                actionState: currentContext.actionState,
                thesisState: currentContext.thesisState
            });
        }

        // Case 6: Market Stale
        if (marketStale) {
            return new NotificationCandidate({
                decisionId: contract.id,
                severity: 'HIGH',
                reasonCode: 'MARKET_STALE',
                title: '마켓 데이터 수신이 지연되고 있어요',
                body: '배트맨 시장 데이터 수신이 지연되어 즉시 진입을 일시 대기합니다.',
                actionState: currentContext.actionState,
                thesisState: currentContext.thesisState
            });
        }

        // Fallback for general HIGH/CRITICAL change
        return new NotificationCandidate({
            decisionId: contract.id,
            severity: materiality,
            reasonCode: 'STATE_CHANGED',
            title: '판단 상태가 변경되었어요',
            body: currentContext.explanation || '새로운 시장 정보가 반영되었습니다.',
            actionState: currentContext.actionState,
            thesisState: currentContext.thesisState
        });
    }

    /**
     * Check if odds are rapidly oscillating around threshold within debounce window.
     */
    checkPriceOscillation(decisionId, currentOdds, windowSeconds) {
        if (!this.oscillationHistory.has(decisionId)) {
            this.oscillationHistory.set(decisionId, []);
        }
        const history = this.oscillationHistory.get(decisionId);
        const now = Date.now();
        const cutoff = now - windowSeconds * 1000;

        // Clean old history
        const recent = history.filter(h => h.timestamp >= cutoff);
        recent.push({ odds: currentOdds, timestamp: now });
        this.oscillationHistory.set(decisionId, recent);

        // If flipped direction >= 3 times within window, it is an oscillation
        if (recent.length >= 4) {
            return true;
        }
        return false;
    }

    isDeduplicated(dedupeKey, windowSeconds = 180) {
        const entry = this.activeDedupeKeys.get(dedupeKey);
        if (!entry) return false;
        const elapsedSeconds = (Date.now() - entry.lastEmittedAt) / 1000;
        return elapsedSeconds <= windowSeconds;
    }

    recordEmission(dedupeKey) {
        const count = (this.activeDedupeKeys.get(dedupeKey)?.count || 0) + 1;
        this.activeDedupeKeys.set(dedupeKey, {
            lastEmittedAt: Date.now(),
            count
        });
    }

    clear() {
        this.activeDedupeKeys.clear();
        this.oscillationHistory.clear();
    }
}

module.exports = NotificationSuppressionEngine;
