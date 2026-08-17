'use strict';

/**
 * src/fixtures/UIStateFixtures.js
 * Comprehensive library of UI state fixtures A through J for testing and preview.
 * ALL FIXTURES ARE EXPLICITLY LABELED AS FIXTURES.
 */

const UIStateFixtures = {
    // State A: VALID + ATTRACTIVE
    stateA_ValidAttractive: {
        _isFixture: true,
        fixtureCode: 'STATE_A_VALID_ATTRACTIVE',
        sport: 'BASEBALL',
        league: 'MLB',
        eventId: '260097_101',
        eventName: '토론토 vs 밴쿠버',
        marketId: 'm_ml_101',
        selectionId: 's1',
        selectionName: '밴쿠버 승',
        currentOdds: 1.86,
        marketFairOdds: 1.74,
        entryThreshold: 1.82,
        priceState: 'ATTRACTIVE',
        actionState: 'ENTER',
        thesisState: 'VALID',
        headline: '가격 조건 충족',
        whySummary: [
            '현재 배당(1.86)이 시장 적정선(1.74) 및 진입 기준(1.82) 이상입니다.',
            '선발 투수 매치업 우위 및 사전 가설 유지 중'
        ]
    },

    // State B: VALID + UNATTRACTIVE
    stateB_ValidUnattractive: {
        _isFixture: true,
        fixtureCode: 'STATE_B_VALID_UNATTRACTIVE',
        sport: 'BASEBALL',
        league: 'MLB',
        eventId: '260097_102',
        eventName: 'LA다저스 vs 샌프란시스코',
        marketId: 'm_ml_102',
        selectionId: 's1',
        selectionName: 'LA다저스 승',
        currentOdds: 1.62,
        marketFairOdds: 1.68,
        entryThreshold: 1.72,
        priceState: 'UNATTRACTIVE',
        actionState: 'DO_NOT_ENTER',
        thesisState: 'VALID',
        headline: '진입 기준 미달 (가격 불리)',
        whySummary: [
            '현재 배당(1.62)이 최소 진입 기준(1.72)보다 낮습니다.',
            '분석 가설은 유효하나 가격적 메리트가 없습니다.'
        ]
    },

    // State C: WEAKENED
    stateC_Weakened: {
        _isFixture: true,
        fixtureCode: 'STATE_C_WEAKENED',
        sport: 'SOCCER',
        league: 'EPL',
        eventId: '260097_201',
        eventName: '아스널 vs 첼시',
        marketId: 'm_ml_201',
        selectionId: 's1',
        selectionName: '아스널 승',
        currentOdds: 1.95,
        marketFairOdds: 1.90,
        entryThreshold: 1.92,
        priceState: 'ATTRACTIVE',
        actionState: 'REVIEW',
        thesisState: 'WEAKENED',
        headline: '가설 약화 — 재검토 필요',
        whySummary: [
            '핵심 미드필더 당일 훈련 불참 신호 감지',
            '선발 라인업 발표 시점까지 진입을 보류합니다.'
        ]
    },

    // State D: BROKEN
    stateD_Broken: {
        _isFixture: true,
        fixtureCode: 'STATE_D_BROKEN',
        sport: 'BASEBALL',
        league: 'KBO',
        eventId: '260097_301',
        eventName: 'LG vs KIA',
        marketId: 'm_ml_301',
        selectionId: 's1',
        selectionName: 'LG 승',
        currentOdds: 1.80,
        marketFairOdds: 1.85,
        entryThreshold: 1.82,
        priceState: 'UNATTRACTIVE',
        actionState: 'DO_NOT_ENTER',
        thesisState: 'BROKEN',
        headline: '처음 판단을 다시 봐야 해요 (파기 조건 발생)',
        whySummary: [
            '예정 선발 투수 경기 직전 담 증세로 교체됨',
            '핵심 전제 파기로 본 판단은 무효화되었습니다.'
        ]
    },

    // State E: WAIT
    stateE_Wait: {
        _isFixture: true,
        fixtureCode: 'STATE_E_WAIT',
        sport: 'BASKETBALL',
        league: 'KBL',
        eventId: '260097_401',
        eventName: 'SK vs KCC',
        marketId: 'm_ml_401',
        selectionId: 's1',
        selectionName: 'SK 승',
        currentOdds: 1.88,
        marketFairOdds: 1.85,
        entryThreshold: 1.85,
        priceState: 'ATTRACTIVE',
        actionState: 'WAIT',
        thesisState: 'WAIT',
        headline: '핵심 정보 확인 중',
        whySummary: [
            '주전 가드 출전 여부 경기 1시간 전 발표 대기',
            '정보 확인 전까지 대기 상태를 유지합니다.'
        ]
    },

    // State F: Zero Candidates
    stateF_NoCandidates: {
        _isFixture: true,
        fixtureCode: 'STATE_F_NO_CANDIDATES',
        candidates: [],
        emptyState: {
            title: '오늘은 억지로 고를 필요가 없어요.',
            subtitle: '가격이나 정보 조건이 좋아지면 다시 알려드릴게요.'
        }
    },

    // State G: LOSS + GOOD decision
    stateG_LossGoodDecision: {
        _isFixture: true,
        fixtureCode: 'STATE_G_LOSS_GOOD_DECISION',
        outcomeResult: 'LOSS',
        priceQualityGrade: 'EXCELLENT',
        ruleDisciplineGrade: 'FOLLOWED',
        thesisReviewGrade: 'SOUND',
        decisionQualityGrade: 'EXCELLENT',
        headline: '결과는 좋지 않았지만, 사전에 정한 가격과 규칙은 지켰습니다.',
        entryOdds: 1.86,
        closingOdds: 1.72,
        clv: 0.0814
    },

    // State H: WIN + POOR decision
    stateH_WinPoorDecision: {
        _isFixture: true,
        fixtureCode: 'STATE_H_WIN_POOR_DECISION',
        outcomeResult: 'WIN',
        priceQualityGrade: 'POOR',
        ruleDisciplineGrade: 'VIOLATED',
        thesisReviewGrade: 'UNSOUND',
        decisionQualityGrade: 'POOR',
        headline: '결과는 좋았지만, 사전에 정한 진입 기준과 판단 조건은 지켜지지 않았습니다.',
        entryOdds: 1.65,
        closingOdds: 1.80,
        clv: -0.0833
    },

    // State I: Memory Pattern Established
    stateI_MemoryPatternEstablished: {
        _isFixture: true,
        fixtureCode: 'STATE_I_MEMORY_PATTERN_ESTABLISHED',
        repeatingPattern: '최근 9번의 가격 하락 상황 중 7번에서 진입 기준 아래로 들어갔습니다 (77.8%).',
        biggestImplication: '분석보다 가격 추격에서 판단 품질이 더 자주 훼손되고 있습니다.',
        oneNextBehavior: '다음 회차에는 기준 배당 아래 신규 진입을 원천 차단하는 규칙을 적용합니다.',
        nextRoundApplied: false,
        evidenceCount: 7,
        confidence: 0.82
    },

    // State J: Memory Insufficient (Cold Start)
    stateJ_MemoryInsufficient: {
        _isFixture: true,
        fixtureCode: 'STATE_J_MEMORY_INSUFFICIENT',
        isColdStart: true,
        repeatingPattern: '아직 반복 패턴을 판단하기에 기록이 조금 더 필요합니다 (3/5건 검토됨).',
        biggestImplication: '판단 기록이 최소 5건 이상 누적되면 행동 패턴 분석이 활성화됩니다.',
        oneNextBehavior: '사전에 수립한 기준 배당과 파기 조건을 준수하며 기록을 축적하세요.',
        nextRoundApplied: false
    }
};

module.exports = UIStateFixtures;
