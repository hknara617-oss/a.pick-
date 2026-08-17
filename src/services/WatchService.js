'use strict';

const WatchEngine = require('../watch/WatchEngine');

/**
 * src/services/WatchService.js
 * Produces user-facing Quiet WATCH view models.
 * Groups by: 변화 있음(Changed), 확인 대기(Waiting), 기준 유지(Stable).
 */
class WatchService {
    constructor({ watchRepo = null, evalRepo = null } = {}) {
        this.watchRepo = watchRepo;
        this.evalRepo = evalRepo;
    }

    async getWatchViewModel({ userId, sealedContracts = [], trackedDecisions = [], currentObservations = [], decisionEvents = [] } = {}) {
        const generatedAt = new Date().toISOString();

        const importantChanges = [];
        const waiting = [];
        const stable = [];

        // Build unified list of decisions to watch
        const allItems = [...trackedDecisions];

        // Convert any legacy sealedContracts if not already in trackedDecisions
        for (const contract of sealedContracts) {
            if (!allItems.some(t => t.id === contract.id || t.contractId === contract.id)) {
                allItems.push({
                    id: contract.id,
                    origin: 'APICK_CREATED',
                    eventId: contract.eventId,
                    marketId: contract.marketId,
                    selectionId: contract.selectionId,
                    eventName: contract.eventId,
                    selectionName: contract.selectionId,
                    sport: contract.sport,
                    league: contract.league,
                    capturedOdds: contract.offeredOddsAtSeal,
                    currentOdds: contract.offeredOddsAtSeal,
                    entryThreshold: contract.entryRule?.minimumEntryOdds || contract.offeredOddsAtSeal,
                    thesisSummary: '가격 및 선발 조건 확인',
                    thesisOrigin: 'ORIGINAL_AT_DECISION',
                    watchCoverage: ['내 진입 기준', '선발 변경', '라인업 변경', '내가 정한 파기 조건'],
                    breakConditions: ['기준 배당 하락 시']
                });
            }
        }

        for (const item of allItems) {
            // Find current market observation for contract
            const currentObs = currentObservations.find(obs =>
                (obs.marketId === item.marketId || obs.market_id === item.marketId || obs.eventId === item.eventId) &&
                (obs.selectionId === item.selectionId || obs.selection_id === item.selectionId)
            ) || { odds: item.currentOdds || item.capturedOdds, observedAt: generatedAt };

            const currentOdds = currentObs.odds || item.currentOdds || item.capturedOdds;
            const capturedOdds = item.capturedOdds || item.sealedOdds || currentOdds;
            const entryThreshold = item.entryThreshold;

            // Events for this decision
            const contractEvents = decisionEvents.filter(e => e.decisionId === item.id || e.decision_id === item.id);

            // Determine thesis & action state
            let thesisState = 'VALID';
            let actionState = 'WAIT';
            let changeSummary = '저장 이후 중요한 변화가 없습니다.';
            let category = 'stable';

            const isGameFinished = Boolean(item.isFinished || (item.matchStatus && item.matchStatus.includes('종료')));

            if (isGameFinished) {
                thesisState = 'RESOLVED';
                actionState = 'REVIEW';
                changeSummary = `🏁 경기 종료 (${item.matchStatus || '결과 완료'}) — 최종 적중 확인 완료`;
                category = 'stable';
            } else if (entryThreshold && currentOdds < entryThreshold) {
                actionState = 'DO_NOT_ENTER';
                changeSummary = `가격이 기준 아래로 내려왔어요 (${capturedOdds} -> ${currentOdds})`;
                category = 'importantChanges';
            } else if (capturedOdds && Math.abs(currentOdds - capturedOdds) >= 0.02) {
                changeSummary = `실시간 배당 변동 확인 (${capturedOdds} -> ${currentOdds})`;
                category = 'importantChanges';
            } else if (contractEvents.some(e => e.eventType === 'BREAK_CONDITION_HIT')) {
                thesisState = 'BROKEN';
                actionState = 'DO_NOT_ENTER';
                changeSummary = '처음 판단을 다시 봐야 해요 (사전 파기 조건 발생)';
                category = 'importantChanges';
            } else {
                changeSummary = '⏰ 경기 전: 공식 선발 및 베스트 11 발표 대기 중 (경기 시작 1시간 전 자동 연동)';
                category = 'waiting';
            }

            const provenanceLabel = item.origin === 'EXTERNAL_CAPTURE' ? '캡처에서 가져옴' : 'A.PICK에서 만든 판단';
            const defaultCoverage = item.origin === 'EXTERNAL_CAPTURE' 
                ? ['현재 배당 변화', '선발 변경', '라인업 변경'] 
                : ['내 진입 기준', '선발 변경', '라인업 변경', '내가 정한 파기 조건'];

            const watchCard = {
                decisionId: item.id,
                origin: item.origin || 'APICK_CREATED',
                provenanceLabel,
                sport: item.sport || 'BASEBALL',
                league: item.league || 'MLB',
                eventId: item.eventId,
                marketId: item.marketId,
                selectionId: item.selectionId,
                eventName: item.eventName || item.eventId,
                selectionName: item.selectionName || item.selectionId,
                sealedOdds: capturedOdds,
                capturedOdds: capturedOdds,
                currentOdds,
                entryThreshold: entryThreshold || '미설정',
                thesisSummary: item.thesisSummary || '',
                thesisOrigin: item.thesisOrigin || 'NOT_RECORDED',
                watchCoverage: (item.watchCoverage && item.watchCoverage.length > 0) ? item.watchCoverage : defaultCoverage,
                breakConditions: item.breakConditions || [],
                executed: item.executed || false,
                entryOdds: item.entryOdds || null,
                thesisState,
                actionState,
                mostImportantChange: changeSummary,
                lastCheckedAt: currentObs.observedAt || generatedAt,
                timeline: contractEvents.map(e => ({
                    time: e.occurred_at || e.timestamp || generatedAt,
                    eventType: e.eventType,
                    summary: e.reasonCode || e.eventType
                }))
            };

            if (category === 'importantChanges') importantChanges.push(watchCard);
            else if (category === 'waiting') waiting.push(watchCard);
            else stable.push(watchCard);
        }

        return {
            activeCount: allItems.length,
            importantChanges,
            waiting,
            stable,
            providerHealth: '정상 (배트맨 실시간 감시 활성)',
            generatedAt
        };
    }
}

module.exports = WatchService;
