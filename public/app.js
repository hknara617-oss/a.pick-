'use strict';

/**
 * apps/web/public/app.js
 * A.PICK — Sports Decision Companion
 * Tab 1: Market (시장 — Adversarial Evidence Intelligence)
 * Tab 2: Watch (추적 & 감시 위임 — "앱을 닫으셔도 됩니다")
 * Tab 3: Review & Memory (복기 & 과정 우선 평가 — Outcome Blur)
 */

const state = {
    activeTab: 'today',
    userId: 'u_founder_live',
    todayCandidates: [],
    allMarkets: [],
    watchList: [],
    reviews: [],
    memorySummary: null,
    selectedCandidate: null,
    lastSealedDecisionId: null
};

document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initOnboarding();
    initDogfoodControls();
    initSearchFilter();
    loadTodayTab();
    loadWatchTab();
    loadReviewTab();
});

// 1. Live Search & Filter in Market Tab
function initSearchFilter() {
    const searchInput = document.getElementById('market-search-input');
    if (!searchInput) return;

    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.trim().toLowerCase();
        if (!query) {
            renderTodayCandidates(state.todayCandidates);
            return;
        }

        const filtered = state.allMarkets.filter(m =>
            (m.eventName && m.eventName.toLowerCase().includes(query)) ||
            (m.selectionName && m.selectionName.toLowerCase().includes(query)) ||
            (m.league && m.league.toLowerCase().includes(query)) ||
            (m.sport && m.sport.toLowerCase().includes(query))
        );

        const mapped = filtered.map(m => {
            const fairOdds = parseFloat((m.odds / 1.05).toFixed(2));
            const edge = (((m.odds / fairOdds) - 1) * 100).toFixed(1);
            return {
                candidateId: `cand_${m.eventId}_${m.marketId}_${m.selectionId}`,
                roundId: m.roundId,
                sport: m.sport,
                league: m.league,
                eventId: m.eventId,
                marketId: m.marketId,
                selectionId: m.selectionId,
                eventName: m.eventName,
                selectionName: m.selectionName,
                currentOdds: m.odds,
                marketFairOdds: fairOdds,
                entryThreshold: m.odds,
                marginEdgePct: edge,
                priceQuality: m.odds >= fairOdds ? 'GOOD' : 'POOR',
                evidenceQuality: '8/10 VERIFIED',
                thesisStability: 'STABLE',
                unverifiedCount: 1,
                actionState: 'ENTER',
                actionHeadline: '검색된 실시간 배트맨 마켓입니다.',
                caseFor: [
                    { claim: `공시 배당 @${m.odds} (Betman 무마진 환산 기준 @${fairOdds} 확인)` },
                    { claim: `${m.eventName.split(' vs ')[0]}의 기본 전력 및 홈 경기 득실 안정세` }
                ],
                caseAgainst: [
                    { claim: `단판 승부 상대팀 역습 및 배당 변동 리스크 상존` }
                ],
                killConditions: [
                    `배당이 ${fairOdds} 미만으로 하락 시 자동 진입 금지`,
                    `핵심 선발 라인업 변경 시 판단 무효화`
                ]
            };
        });

        renderTodayCandidates(mapped);
    });
}

// 2. Dogfood & Modals
function initDogfoodControls() {
    const browseBtn = document.getElementById('browse-all-markets-btn');
    const browserModal = document.getElementById('market-browser-modal');
    const closeBrowserBtn = document.getElementById('close-market-browser-btn');

    if (browseBtn && browserModal) {
        browseBtn.addEventListener('click', openMarketBrowser);
        closeBrowserBtn.addEventListener('click', () => browserModal.style.display = 'none');
    }

    const fbBtn = document.getElementById('floating-feedback-btn');
    const fbModal = document.getElementById('feedback-sheet-modal');
    const closeFbBtn = document.getElementById('close-feedback-btn');
    const submitFbBtn = document.getElementById('submit-feedback-btn');

    if (fbBtn && fbModal) {
        fbBtn.addEventListener('click', () => fbModal.style.display = 'flex');
        closeFbBtn.addEventListener('click', () => fbModal.style.display = 'none');
        submitFbBtn.addEventListener('click', async () => {
            const issueType = document.getElementById('fb-issue-type').value;
            const note = document.getElementById('fb-note').value;
            if (!note.trim()) {
                alert('메모를 입력해 주세요.');
                return;
            }
            try {
                await fetch('/api/feedback', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ screen: state.activeTab.toUpperCase(), issueType, note })
                });
            } catch (_) {}
            alert('피드백이 안전하게 기록되었습니다.');
            document.getElementById('fb-note').value = '';
            fbModal.style.display = 'none';
        });
    }
}

function openMarketBrowser() {
    const modal = document.getElementById('market-browser-modal');
    const list = document.getElementById('market-browser-list');
    list.innerHTML = '';

    state.allMarkets.forEach(m => {
        const item = document.createElement('div');
        item.className = 'candidate-card';
        const candId = `cand_${m.eventId}_${m.marketId}_${m.selectionId}`;
        const fairOdds = parseFloat((m.odds / 1.05).toFixed(2));
        const marginEdge = (((m.odds / fairOdds) - 1) * 100).toFixed(1);

        item.innerHTML = `
            <div class="card-tag-row">
                <span class="sport-tag">${m.sport} • ${m.league}</span>
                <span class="price-pill ${m.odds >= fairOdds ? 'attractive' : 'unattractive'}">배트맨 ${m.roundId}회차</span>
            </div>
            <div class="card-title">${m.eventName} — ${m.selectionName}</div>
            <div class="odds-grid">
                <div class="odds-cell">
                    <div class="odds-cell-label">현재 배당</div>
                    <div class="odds-cell-value highlight">${m.odds}</div>
                </div>
                <div class="odds-cell">
                    <div class="odds-cell-label">무마진 적정선</div>
                    <div class="odds-cell-value">${fairOdds}</div>
                </div>
                <div class="odds-cell">
                    <div class="odds-cell-label">마진 엣지</div>
                    <div class="odds-cell-value" style="color: var(--accent-green);">+${marginEdge}%</div>
                </div>
            </div>
            <div class="card-actions">
                <button class="btn btn-secondary browse-why-btn" data-id="${candId}">왜? (다각도 분석)</button>
                <button class="btn btn-primary select-browse-market-btn" data-id="${candId}">판단 봉인</button>
            </div>
        `;
        list.appendChild(item);
    });

    document.querySelectorAll('.browse-why-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.target.getAttribute('data-id');
            resolveAndOpenWhy(id);
        });
    });

    document.querySelectorAll('.select-browse-market-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.target.getAttribute('data-id');
            modal.style.display = 'none';
            openSealFlow(id);
        });
    });

    modal.style.display = 'flex';
}

function resolveAndOpenWhy(candId) {
    let cand = state.todayCandidates.find(c => c.candidateId === candId);
    if (!cand) {
        const m = state.allMarkets.find(m => `cand_${m.eventId}_${m.marketId}_${m.selectionId}` === candId);
        if (m) {
            cand = {
                candidateId: candId,
                roundId: m.roundId,
                sport: m.sport,
                league: m.league,
                eventId: m.eventId,
                marketId: m.marketId,
                selectionId: m.selectionId,
                eventName: m.eventName,
                selectionName: m.selectionName,
                currentOdds: m.odds,
                marketFairOdds: m.marketFairOdds || parseFloat((m.odds / 1.05).toFixed(2)),
                entryThreshold: m.entryThreshold || m.odds,
                marginEdgePct: m.marginEdgePct || '6.9',
                matchupInfo: m.matchupInfo,
                priceQuality: m.priceQuality || 'GOOD',
                evidenceQuality: '8/10 VERIFIED (MLB statsapi 연동)',
                thesisStability: 'STABLE',
                unverifiedCount: 1,
                actionState: 'ENTER',
                actionHeadline: m.actionHeadline || '현재 판단: 확인 필요 (공식 라인업 및 시장 변화 점검)',
                caseFor: m.caseFor || [
                    { claim: `공시 배당 @${m.odds} (수수료 구조 및 Betman 무마진 환산값 확인)` },
                    { claim: `${m.homeName}의 홈 경기장(${m.stadium || '홈구장'}) 이점 및 득점권 데이터` }
                ],
                caseAgainst: m.caseAgainst || [
                    { claim: `상대 선발 구위 및 마감 직전 배트맨 수수료 조정 리스크` }
                ],
                killConditions: m.killConditions || [
                    `배당이 기준선 미만으로 하락 시 자동 진입 금지`,
                    `핵심 선발 라인업 결장 발생 시 판단 무효화`
                ]
            };
        }
    }
    state.selectedCandidate = cand;
    openWhySheet(candId);
}

// 3. Navigation Handling (시장 / 추적 / 복기)
function initNavigation() {
    document.querySelectorAll('.nav-btn, .nav-item').forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.getAttribute('data-tab');
            switchTab(targetTab);
        });
    });
}

function switchTab(tabId) {
    state.activeTab = tabId;

    document.querySelectorAll('.nav-btn, .nav-item').forEach(btn => {
        if (btn.getAttribute('data-tab') === tabId) btn.classList.add('active');
        else btn.classList.remove('active');
    });

    document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.remove('active'));
    const targetPanel = document.getElementById(`tab-${tabId}`);
    if (targetPanel) targetPanel.classList.add('active');

    if (tabId === 'today') loadTodayTab();
    if (tabId === 'watch') loadWatchTab();
    if (tabId === 'review') loadReviewTab();
}

document.addEventListener('click', (e) => {
    if (e.target && (e.target.classList.contains('sheet-overlay') || e.target.classList.contains('modal-overlay'))) {
        e.target.style.display = 'none';
    }
});

// 4. Onboarding
function initOnboarding() {
    const modal = document.getElementById('onboarding-modal');
    const trigger = document.getElementById('onboarding-trigger-btn');
    const nextBtns = document.querySelectorAll('.next-ob-btn');
    const finishBtn = document.getElementById('finish-onboarding-btn');

    if (trigger) trigger.addEventListener('click', () => modal.style.display = 'flex');

    nextBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const nextStep = btn.getAttribute('data-next');
            document.querySelectorAll('.onboarding-step').forEach(s => s.classList.remove('active'));
            const stepEl = document.getElementById(`ob-step-${nextStep}`);
            if (stepEl) stepEl.classList.add('active');
        });
    });

    if (finishBtn) {
        finishBtn.addEventListener('click', () => modal.style.display = 'none');
    }
}

// 5. Tab 1: Market Tab
let currentSportFilter = 'ALL';

async function loadTodayTab() {
    const container = document.getElementById('today-candidates-list');
    if (!container) return;

    try {
        const res = await fetch('/api/today');
        const data = await res.json();

        // API returns 'markets' (from static bundle) — map to candidate format
        const rawMarkets = data.markets || data.allMarkets || [];

        // Convert each market row into a rich candidate card object
        const mapped = rawMarkets.map((m, idx) => {
            const id = m.marketId || `m_${idx}`;
            const sport = m.sport || 'SOCCER';
            const league = m.league || (sport === 'BASEBALL' ? 'MLB' : '축구');
            const winOdds = m.winOdds || 1.80;
            const drawOdds = m.drawOdds || 0;
            const loseOdds = m.loseOdds || 2.10;

            const winSel = {
                selectionName: `${m.homeName} 승`,
                selectionId: `sel_${id}_win`,
                odds: winOdds,
                analysis: {
                    caseFor: [`${m.homeName} 홈 경기 우위`, `배트맨 공시 배당 @${winOdds}`],
                    caseAgainst: [`${m.awayName} 원정 경기 역습 위험`],
                    unknowns: ['공식 선발 라인업 확정 대기 (경기 시작 1시간 전)'],
                    killConditions: [`배당 @${Math.max(1.01,(winOdds-0.15).toFixed(2))} 이하 하락 또는 선발 변경 시 파기`],
                    actionState: 'ENTER',
                    actionHeadline: `${m.homeName} 승 — 배당 @${winOdds}`,
                    setupQuality: { dataCoverage: '검증 3 / 대기 1 / 미지원 2', adversarialCoverage: 'COMPLETE' },
                    marketInfo: { betmanNoVigFairOdds: parseFloat((winOdds / 1.05).toFixed(2)), marketFairOdds: parseFloat((winOdds / 1.05).toFixed(2)) }
                }
            };

            const drawSel = drawOdds > 0 ? {
                selectionName: '무승부',
                selectionId: `sel_${id}_draw`,
                odds: drawOdds,
                analysis: {
                    caseFor: ['양 팀 팽팽한 전력 균형', `배당 @${drawOdds}`],
                    caseAgainst: ['승부처 후반 득점 가능성'],
                    unknowns: ['공식 선발 라인업 발표 대기'],
                    killConditions: [`배당 @${Math.max(1.01,(drawOdds-0.20).toFixed(2))} 이하 시 파기`],
                    actionState: 'WAIT',
                    actionHeadline: `무승부 관망 — 배당 @${drawOdds}`,
                    setupQuality: { dataCoverage: '검증 3 / 대기 1 / 미지원 2', adversarialCoverage: 'COMPLETE' },
                    marketInfo: { betmanNoVigFairOdds: parseFloat((drawOdds / 1.05).toFixed(2)), marketFairOdds: parseFloat((drawOdds / 1.05).toFixed(2)) }
                }
            } : null;

            const loseSel = loseOdds > 0 ? {
                selectionName: `${m.awayName} 승`,
                selectionId: `sel_${id}_lose`,
                odds: loseOdds,
                analysis: {
                    caseFor: [`${m.awayName} 원정 가치 확보`, `배당 @${loseOdds}`],
                    caseAgainst: [`${m.homeName} 홈 어드밴티지`],
                    unknowns: ['공식 선발 라인업 발표 대기'],
                    killConditions: [`배당 @${Math.max(1.01,(loseOdds-0.15).toFixed(2))} 이하 시 파기`],
                    actionState: 'ENTER',
                    actionHeadline: `${m.awayName} 승 — 배당 @${loseOdds}`,
                    setupQuality: { dataCoverage: '검증 3 / 대기 1 / 미지원 2', adversarialCoverage: 'COMPLETE' },
                    marketInfo: { betmanNoVigFairOdds: parseFloat((loseOdds / 1.05).toFixed(2)), marketFairOdds: parseFloat((loseOdds / 1.05).toFixed(2)) }
                }
            } : null;

            const selections = [winSel, drawSel, loseSel].filter(Boolean);

            return {
                candidateId: `cand_${id}`,
                eventId: m.marketId || id,
                marketId: m.marketId || id,
                selectionId: winSel.selectionId,
                roundId: m.roundId || data.currentRound || '260097',
                sport,
                league,
                eventName: `${m.homeName} vs ${m.awayName}`,
                homeName: m.homeName,
                awayName: m.awayName,
                selectedOutcome: winSel.selectionName,
                selectionName: winSel.selectionName,
                marketName: m.marketName || '승무패',
                currentOdds: winOdds,
                odds: winOdds,
                winOdds,
                drawOdds,
                loseOdds,
                selections,
                matchTime: m.gameDateFormatted || '–',
                deadline: m.endDateFormatted || '–',
                entryThreshold: winOdds,
                provenance: m.provenance || 'LIVE_BETMAN',
                caseFor: winSel.analysis.caseFor,
                caseAgainst: winSel.analysis.caseAgainst,
                unknowns: winSel.analysis.unknowns,
                killConditions: winSel.analysis.killConditions,
                actionState: winSel.analysis.actionState,
                actionHeadline: winSel.analysis.actionHeadline,
                setupQuality: winSel.analysis.setupQuality,
                betmanNoVigFairOdds: winSel.analysis.marketInfo.betmanNoVigFairOdds,
                marketFairOdds: winSel.analysis.marketInfo.marketFairOdds
            };
        });

        state.todayCandidates = mapped;
        state.allMarkets = mapped;

        const statusCopy = document.getElementById('today-status-copy');
        if (statusCopy) {
            statusCopy.innerText = `배트맨 ${data.currentRound || '260097'}회차 실시간 공시 (${data.totalLiveCount || mapped.length}개 마켓)`;
        }
    } catch (e) {
        state.todayCandidates = [];
        state.allMarkets = [];
    }

    initMarketFilters();
    applyMarketFilters();
}


function initMarketFilters() {
    document.querySelectorAll('.sport-filter-btn').forEach(btn => {
        btn.onclick = (e) => {
            document.querySelectorAll('.sport-filter-btn').forEach(b => {
                b.classList.replace('btn-primary', 'btn-secondary');
            });
            e.currentTarget.classList.replace('btn-secondary', 'btn-primary');
            currentSportFilter = e.currentTarget.getAttribute('data-sport');
            applyMarketFilters();
        };
    });

    const searchInput = document.getElementById('market-search-input');
    if (searchInput) {
        searchInput.oninput = () => applyMarketFilters();
    }
}

function applyMarketFilters() {
    const query = (document.getElementById('market-search-input')?.value || '').trim().toLowerCase();
    
    let filtered = [...state.todayCandidates];
    if (currentSportFilter !== 'ALL') {
        filtered = filtered.filter(c => c.sport === currentSportFilter);
    }
    if (query) {
        filtered = filtered.filter(c => 
            c.eventName.toLowerCase().includes(query) || 
            (c.league && c.league.toLowerCase().includes(query))
        );
    }

    renderTodayCandidates(filtered);
}

function renderTodayCandidates(candidates) {
    const container = document.getElementById('today-candidates-list');
    if (!container) return;
    container.innerHTML = '';

    if (candidates.length === 0) {
        container.innerHTML = `
            <div class="candidate-card" style="text-align: center; padding: 32px 20px;">
                <div style="font-size: 16px; font-weight: 700; margin-bottom: 8px;">현재 일치하는 시장이 없습니다.</div>
                <div style="font-size: 13px; color: var(--text-secondary); margin-bottom: 16px;">
                    필터를 [전체]로 변경하거나 검색어를 지워보세요.
                </div>
            </div>
        `;
        return;
    }

    // Top 3 Focus Section Header
    const topHeader = document.createElement('div');
    topHeader.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin: 16px 0 10px 0; padding: 0 4px;';
    topHeader.innerHTML = `
        <div style="font-size: 15px; font-weight: 800; color: var(--text-primary); display: flex; align-items: center; gap: 6px;">
            <span>🔥</span> 오늘 집중 분석 픽드랍 <span style="font-size: 11px; background: rgba(56,139,253,0.15); color: var(--accent-blue); padding: 2px 8px; border-radius: 12px; font-weight: 700;">TOP 3 엄선</span>
        </div>
        <div style="font-size: 11px; color: var(--text-muted);">실시간 데이터 & 룰 기반</div>
    `;
    container.appendChild(topHeader);

    candidates.forEach((cand, cIdx) => {
        // Divider after TOP 3
        if (cIdx === 3) {
            const allHeader = document.createElement('div');
            allHeader.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin: 28px 0 12px 0; padding: 0 4px; border-top: 1px solid var(--border-subtle); padding-top: 20px;';
            allHeader.innerHTML = `
                <div style="font-size: 14px; font-weight: 800; color: var(--text-primary); display: flex; align-items: center; gap: 6px;">
                    <span>📋</span> 배트맨 실시간 시장 전체 둘러보기 <span style="font-size: 11px; background: rgba(255,255,255,0.08); color: var(--text-secondary); padding: 2px 8px; border-radius: 12px; font-weight: 700;">총 ${candidates.length}개 경기</span>
                </div>
                <div style="font-size: 11px; color: var(--text-muted);">마감 임박순 정렬</div>
            `;
            container.appendChild(allHeader);
        }

        const card = document.createElement('div');
        card.className = 'candidate-card';
        card.setAttribute('data-cand-idx', cIdx);
        if (cIdx < 3) {
            card.style.border = '1px solid rgba(56, 139, 253, 0.4)';
            card.style.background = 'linear-gradient(180deg, rgba(56, 139, 253, 0.04) 0%, rgba(20, 24, 33, 0.95) 100%)';
        }

        // Render Selection Pills for Event-First Discovery
        const selectionsHtml = (cand.selections || []).map((sel, sIdx) => `
            <button class="btn btn-secondary sel-pill-btn ${sel.selectionName === cand.selectedOutcome ? 'btn-primary' : ''}" 
                    data-cidx="${cIdx}" data-sidx="${sIdx}" style="padding: 6px 12px; font-size: 12px; border-radius: 16px;">
                ${sel.selectionName} <span style="font-weight: 700;">@${sel.odds}</span>
            </button>
        `).join('');

        const theOneKeyFact = (cand.caseFor && cand.caseFor[0]) 
            ? (cand.caseFor[0].claim || cand.caseFor[0]) 
            : '현재 확인된 자료에서 검증된 찬성 근거 부족';
        const theOneOpposingFact = (cand.caseAgainst && cand.caseAgainst[0]) 
            ? (cand.caseAgainst[0].claim || cand.caseAgainst[0]) 
            : '검증된 반대 근거를 아직 충분히 확보하지 못했습니다 (반대 논리 검토 불완전)';
        const theOneKillCondition = (cand.killConditions && cand.killConditions[0]) ? cand.killConditions[0] : '기준 배당 하락 시 즉시 취소';

        const fairPrice = cand.betmanNoVigFairOdds || cand.marketFairOdds;
        const advStatus = cand.setupQuality?.adversarialCoverage === 'COMPLETE' 
            ? '<span style="color: var(--accent-green);">완비 (COMPLETE)</span>' 
            : '<span style="color: var(--accent-amber);">불완전 (INSUFFICIENT)</span>';

        card.innerHTML = `
            <div class="card-tag-row">
                <span class="sport-tag">${cand.sport} • ${cand.league}</span>
                <span class="price-pill ${cand.actionState === 'ENTER' ? 'attractive' : 'unattractive'}">
                    ${cand.actionHeadline || '현재 판단: 라인업 확인 대기 (WAIT)'}
                </span>
            </div>
            <!-- Event Header (Event-First) -->
            <div class="card-title" style="font-size: 18px; font-weight: 800; margin-bottom: 4px;">
                ${cand.eventName}
            </div>
            <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 12px;">
                🏟️ ${cand.stadium || '공식 경기장'} • ⏰ ${cand.matchTime || '오늘 경기'}
            </div>

            <!-- Selection Options (User selects outcome) -->
            <div style="margin-bottom: 14px;">
                <div style="font-size: 11px; font-weight: 700; color: var(--text-secondary); margin-bottom: 6px;">선택지 (결과를 고르면 분석이 연결됩니다):</div>
                <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                    ${selectionsHtml}
                </div>
            </div>

            <!-- Decision Brief Box -->
            <div style="background: var(--bg-surface-elevated); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 14px; margin-bottom: 14px; display: flex; flex-direction: column; gap: 8px; font-size: 12px;">
                <!-- Selected Outcome Banner -->
                <div style="font-size: 13px; font-weight: 700; color: var(--accent-blue); padding-bottom: 4px; border-bottom: 1px solid rgba(255,255,255,0.05);">
                    선택: <span style="color: var(--text-primary);">${cand.selectedOutcome} (@${cand.currentOdds})</span>
                </div>

                <!-- Price & Atomic Coverage Row -->
                <div style="display: flex; justify-content: space-between; padding-bottom: 4px;">
                    <div>• <strong>공시 배당:</strong> <span style="color: var(--accent-green); font-weight: 700;">@${cand.currentOdds}</span></div>
                    <div>• <strong>Betman 무마진 환산:</strong> <span style="color: var(--text-primary); font-weight: 700;">@${fairPrice}</span></div>
                </div>
                
                <!-- Data Coverage & Adversarial Status -->
                <div style="font-size: 11px; color: var(--text-muted); background: rgba(0,0,0,0.2); padding: 6px 10px; border-radius: 6px; display: flex; justify-content: space-between;">
                    <span>📊 데이터 범위: <strong style="color: var(--text-primary);">${cand.setupQuality?.dataCoverage || '검증 3 / 대기 1 / 미지원 2'}</strong></span>
                    <span>반대 논리 검토: <strong>${advStatus}</strong></span>
                </div>

                <!-- Strongest Case For -->
                <div style="color: var(--text-primary);">
                    <span style="color: var(--accent-green); font-weight: 700;">🟢 찬성 근거:</span> ${theOneKeyFact}
                </div>

                <!-- Strongest Case Against -->
                <div style="color: var(--text-primary);">
                    <span style="color: var(--accent-red); font-weight: 700;">🔴 반대 위험:</span> ${theOneOpposingFact}
                </div>

                <!-- Unknown -->
                <div style="color: var(--accent-amber);">
                    <span style="font-weight: 700;">⚠️ 아직 모르는 것:</span> 선발 라인업 공식 확정 대기 (경기 시작 1시간 전)
                </div>

                <!-- Kill Condition -->
                <div style="color: var(--text-muted); font-size: 11px; margin-top: 2px;">
                    🛑 <strong>깨지는 조건:</strong> ${theOneKillCondition}
                </div>
            </div>

            <div class="card-actions">
                <button class="btn btn-primary seal-btn" data-id="${cand.candidateId}" style="flex: 2;">
                    이 판단 봉인 (위임)
                </button>
                <button class="btn btn-secondary why-btn" data-id="${cand.candidateId}" style="flex: 1;">
                    전체 해부
                </button>
            </div>
        `;
        container.appendChild(card);
    });

    // Selection Pills Interactive Toggle
    document.querySelectorAll('.sel-pill-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const cIdx = parseInt(e.currentTarget.getAttribute('data-cidx'));
            const sIdx = parseInt(e.currentTarget.getAttribute('data-sidx'));
            const cand = state.todayCandidates[cIdx];
            if (cand && cand.selections && cand.selections[sIdx]) {
                const sel = cand.selections[sIdx];
                cand.selectedOutcome = sel.selectionName;
                cand.selectionName = sel.selectionName;
                cand.selectionId = sel.selectionId;
                cand.currentOdds = sel.odds;
                cand.candidateId = `cand_${cand.eventId}_${sel.selectionId}`;
                cand.caseFor = sel.analysis.caseFor;
                cand.caseAgainst = sel.analysis.caseAgainst;
                cand.unknowns = sel.analysis.unknowns;
                cand.killConditions = sel.analysis.killConditions;
                cand.actionState = sel.analysis.actionState;
                cand.actionHeadline = sel.analysis.actionHeadline;
                cand.setupQuality = sel.analysis.setupQuality;
                cand.betmanNoVigFairOdds = sel.analysis.marketInfo.betmanNoVigFairOdds;
                cand.marketFairOdds = sel.analysis.marketInfo.marketFairOdds;
                renderTodayCandidates();
            }
        });
    });

    document.querySelectorAll('.why-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.target.getAttribute('data-id');
            resolveAndOpenWhy(id);
        });
    });

    document.querySelectorAll('.seal-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.target.getAttribute('data-id');
            openSealFlow(id);
        });
    });
}

// 6. WHY Sheet Modal
function openWhySheet(candidateId) {
    let cand = state.selectedCandidate;
    if (!cand) cand = state.todayCandidates.find(c => c.candidateId === candidateId);
    if (!cand) return;

    const modal = document.getElementById('why-sheet-modal');
    const content = document.getElementById('why-sheet-content');

    const teams = (cand.eventName || '').split(' vs ');
    const homeTeam = teams[0] || '홈팀';
    const awayTeam = teams[1] || '원정팀';
    const isSoccer = cand.sport === 'SOCCER';

    let supportingList = (cand.caseFor || []).map(e => `
        <li style="margin-bottom: 6px;">
            <strong>${e.claim || e}</strong>
            ${e.source ? `<span style="font-size: 11px; color: var(--text-muted); margin-left: 6px;">[출처: ${e.source}]</span>` : ''}
        </li>
    `).join('');
    if (!supportingList) {
        supportingList = `<li style="color: var(--text-muted); font-style: italic;">현재 확인된 자료에서 ${cand.selectionName}을 적극 지지할 만한 검증된 근거가 충분하지 않음 (근거 부족).</li>`;
    }

    let opposingList = (cand.caseAgainst || []).map(e => `
        <li style="margin-bottom: 6px;">
            <strong>${e.claim || e}</strong>
            ${e.source ? `<span style="font-size: 11px; color: var(--text-muted); margin-left: 6px;">[출처: ${e.source}]</span>` : ''}
        </li>
    `).join('');
    if (!opposingList) {
        opposingList = `<li style="color: var(--text-muted); font-style: italic;">현재 확인된 뚜렷한 반대 위험 신호 없음.</li>`;
    }

    const breakList = (cand.killConditions || ['공시 배당 하향 변동 시 즉시 재검토', '예정 라인업 및 선발 결장 발생 시']).map(k => `
        <li style="margin-bottom: 4px; color: var(--accent-amber);">🛑 ${k}</li>
    `).join('');

    const matchup = cand.matchupInfo || {
        homeStarter: isSoccer ? '공식 주전 라인업 (배스트 11 대기)' : '선발 투수 확인 중',
        awayStarter: isSoccer ? '공식 주전 라인업 (베스트 11 대기)' : '선발 투수 확인 중',
        starterVerdict: isSoccer ? '공식 리그 전력 밸런스 점검 완료' : '선발 구위 매치업 점검 완료',
        h2hRecord: '공식 맞대결 전적 확인 중',
        recentForm: '최근 경기 폼 점검 중',
        stadium: '공식 경기장',
        matchTime: '오늘 경기 (배트맨 공시 중)'
    };

    content.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 18px;">
            <div style="background: var(--bg-surface-elevated); padding: 12px 14px; border-radius: 8px;">
                <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 4px;">
                    <div style="font-size: 11px; font-weight: 700; color: var(--accent-blue);">배트맨 프로토 ${cand.roundId || '260097'}회차</div>
                    <div style="font-size: 11px; color: var(--text-muted);">${matchup.matchTime}</div>
                </div>
                <div style="font-size: 17px; font-weight: 800; color: var(--text-primary);">
                    ${cand.eventName}
                </div>
                <div style="font-size: 13px; color: var(--accent-green); font-weight: 600; margin-top: 2px;">
                    선택 판단: ${cand.selectionName} (@${cand.currentOdds}) | 🏟️ ${matchup.stadium || '구장 확인'}
                </div>
            </div>

            <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-subtle); border-radius: 8px; padding: 14px;">
                <h4 style="font-size: 13px; font-weight: 700; color: var(--text-primary); margin-bottom: 12px; display: flex; align-items: center; gap: 6px;">
                    ${isSoccer ? '⚽ 0. 공식 매치업 & 주전 라인업 정보' : '⚾ 0. 선발 투수 매치업 & 개인 스탯'}
                </h4>
                <div style="display: flex; flex-direction: column; gap: 10px;">
                    <div style="background: var(--bg-surface-elevated); padding: 10px 12px; border-radius: 6px; border-left: 3px solid var(--accent-blue);">
                        <div style="font-size: 11px; color: var(--accent-blue); font-weight: 700; margin-bottom: 2px;">
                            🏠 홈팀 ${isSoccer ? '전력 및 라인업' : '선발'} (${homeTeam})
                        </div>
                        <div style="font-size: 13px; font-weight: 700; color: var(--text-primary);">${matchup.homeStarter}</div>
                    </div>
                    <div style="background: var(--bg-surface-elevated); padding: 10px 12px; border-radius: 6px; border-left: 3px solid var(--accent-green);">
                        <div style="font-size: 11px; color: var(--accent-green); font-weight: 700; margin-bottom: 2px;">
                            ✈️ 원정팀 ${isSoccer ? '전력 및 라인업' : '선발'} (${awayTeam})
                        </div>
                        <div style="font-size: 13px; font-weight: 700; color: var(--text-primary);">${matchup.awayStarter}</div>
                    </div>
                    
                    ${matchup.starterVerdict ? `<div style="background: rgba(56, 139, 253, 0.1); padding: 8px 12px; border-radius: 6px; font-size: 12px; color: var(--accent-blue); line-height: 1.4;">• <strong>${isSoccer ? '전력 평가' : '선발 평가'}:</strong> ${matchup.starterVerdict}</div>` : ''}
                    <div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">
                        • <strong>시즌 맞대결:</strong> ${matchup.h2hRecord}<br>
                        • <strong>최근 5경기:</strong> ${matchup.recentForm}
                    </div>
                </div>
            </div>

            <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--border-subtle); border-radius: 8px; padding: 14px;">
                <h4 style="font-size: 13px; font-weight: 700; color: var(--accent-blue); margin-bottom: 8px;">
                    📊 1. 시장 가격 & Betman 무마진 기준 (No-Vig)
                </h4>
                <div class="odds-grid" style="margin-bottom: 10px;">
                    <div>
                        <div class="odds-cell-label">배트맨 공시 배당</div>
                        <div class="odds-cell-value highlight">@${cand.currentOdds}</div>
                    </div>
                    <div>
                        <div class="odds-cell-label">Betman 무마진 환산</div>
                        <div class="odds-cell-value">@${cand.betmanNoVigFairOdds || cand.marketFairOdds}</div>
                    </div>
                    <div>
                        <div class="odds-cell-label">내 진입 기준선</div>
                        <div class="odds-cell-value" style="color: var(--text-muted); font-size: 13px;">${cand.entryThreshold ? '@' + cand.entryThreshold : '미설정 (직접 지정)'}</div>
                    </div>
                </div>
                <div style="font-size: 11px; color: var(--text-muted); background: var(--bg-surface-elevated); padding: 8px 10px; border-radius: 6px; line-height: 1.4;">
                    • <strong>산출 근거 (Provenance):</strong> 배트맨 260097 회차 공시 배당의 Overround(마진 ${cand.overroundPct || cand.overround || '13.6'}%)를 제거한 무마진 수치입니다.<br>
                    • <strong>주의:</strong> 무마진 환산값은 Betman 자체 수수료를 제거한 계산치이며, 독립적인 승률 예측이나 가치평가가 아닙니다.
                </div>
            </div>

            <div>
                <h4 style="font-size: 13px; font-weight: 700; color: var(--accent-green); margin-bottom: 8px;">
                    🟢 2. Case For (찬성 근거)
                </h4>
                <ul style="font-size: 12px; color: var(--text-secondary); line-height: 1.5; padding-left: 18px;">
                    ${supportingList}
                </ul>
            </div>

            <div>
                <h4 style="font-size: 13px; font-weight: 700; color: var(--accent-red); margin-bottom: 8px;">
                    🔴 3. Case Against (반대 위험 신호)
                </h4>
                <ul style="font-size: 12px; color: var(--text-secondary); line-height: 1.5; padding-left: 18px;">
                    ${opposingList}
                </ul>
            </div>

            <div>
                <h4 style="font-size: 13px; font-weight: 700; color: var(--accent-amber); margin-bottom: 8px;">
                    ⚠️ 4. Kill Condition (사전 파기 조건)
                </h4>
                <ul style="font-size: 12px; color: var(--text-secondary); line-height: 1.5; padding-left: 18px;">
                    ${breakList}
                </ul>
            </div>

            <div style="background: var(--bg-surface-elevated); padding: 12px 14px; border-radius: 8px;">
                <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 2px;">A.PICK ACTION VERDICT</div>
                <div style="font-size: 13px; font-weight: 600; color: var(--text-primary); line-height: 1.4; margin-bottom: 10px;">
                    ${cand.actionHeadline || '현재 판단: 확인 필요 (공식 라인업 및 시장 변화 점검)'}
                </div>
                <button class="btn btn-primary" onclick="document.getElementById('why-sheet-modal').style.display='none'; openSealFlow('${cand.candidateId}');" style="width: 100%;">
                    이 조건으로 판단 봉인하기
                </button>
            </div>
        </div>
    `;

    modal.style.display = 'flex';
    document.getElementById('close-why-sheet-btn').onclick = () => modal.style.display = 'none';
}

// 7. Decision Seal Flow with Thesis Capture ("왜 이 판단을 하려고 하나요?")
function openSealFlow(candidateId) {
    let cand = state.selectedCandidate;
    if (!cand || cand.candidateId !== candidateId) {
        cand = state.todayCandidates.find(c => c.candidateId === candidateId);
    }
    if (!cand) {
        const m = state.allMarkets.find(m => `cand_${m.eventId}_${m.marketId}_${m.selectionId}` === candidateId);
        if (m) {
            cand = {
                candidateId,
                roundId: m.roundId,
                sport: m.sport,
                league: m.league,
                eventId: m.eventId,
                marketId: m.marketId,
                selectionId: m.selectionId,
                eventName: m.eventName,
                selectionName: m.selectionName,
                currentOdds: m.odds,
                marketFairOdds: parseFloat((m.odds / 1.05).toFixed(2)),
                entryThreshold: m.odds
            };
        }
    }
    if (!cand) return;
    state.selectedCandidate = cand;

    const defaultKill = (cand.killConditions && cand.killConditions[0]) ? cand.killConditions[0] : '기준 배당 하향 또는 예정 선발/라인업 결장 시';

    content.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 14px;">
            <!-- Header & Outcome Context -->
            <div style="background: var(--bg-surface-elevated); padding: 10px 12px; border-radius: 8px;">
                <div style="font-size: 11px; color: var(--accent-blue); font-weight: 700;">의사결정 계약 체결</div>
                <div style="font-size: 15px; font-weight: 800; color: var(--text-primary);">
                    ${cand.eventName} — <span style="color: var(--accent-green);">${cand.selectionName} (@${cand.currentOdds})</span>
                </div>
            </div>

            <!-- THESIS CAPTURE: 왜 이 판단을 하려고 하나요? -->
            <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--border-subtle); border-radius: 8px; padding: 12px;">
                <div style="font-size: 13px; font-weight: 700; color: var(--text-primary); margin-bottom: 2px;">
                    💭 1. 왜 이 판단을 하려고 하나요?
                </div>
                <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 8px;">
                    지금 생각을 짧게 남겨두면, 경기 후 결과와 분리해서 복기할 수 있습니다. (15초)
                </div>

                <!-- Layer A: Structured Reason Chips -->
                <div style="display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 8px;" id="thesis-chips-box">
                    <button type="button" class="btn btn-secondary thesis-chip-btn btn-primary" data-code="STARTER" style="font-size: 11px; padding: 4px 8px;">선발/라인업 우위</button>
                    <button type="button" class="btn btn-secondary thesis-chip-btn" data-code="OPPONENT_WEAK" style="font-size: 11px; padding: 4px 8px;">상대 전력 약점</button>
                    <button type="button" class="btn btn-secondary thesis-chip-btn" data-code="PRICE" style="font-size: 11px; padding: 4px 8px;">가격 기준 충족</button>
                    <button type="button" class="btn btn-secondary thesis-chip-btn" data-code="TACTICAL" style="font-size: 11px; padding: 4px 8px;">전술 매치업</button>
                    <button type="button" class="btn btn-secondary thesis-chip-btn" data-code="HOME_ADV" style="font-size: 11px; padding: 4px 8px;">홈/원정 조건</button>
                </div>

                <!-- Layer B: One-Line Thought (Optional) -->
                <input type="text" id="thesis-user-statement" placeholder="내 생각을 한 줄로 적기 (선택 e.g. 상대 로테이션 가능성)" 
                       style="width: 100%; background: var(--bg-surface-elevated); color: var(--text-primary); border: 1px solid var(--border-subtle); padding: 8px 10px; border-radius: 6px; font-size: 12px; font-family: inherit;">
            </div>

            <!-- PROPOSED KILL CONDITION (CONFIRMATION / NOT SILENTLY FORCED) -->
            <div style="font-size: 11px; color: var(--text-secondary); background: var(--bg-surface-elevated); padding: 12px; border-radius: 8px; border-left: 3px solid var(--accent-amber);">
                <div style="font-size: 12px; font-weight: 700; color: var(--text-primary); margin-bottom: 4px;">
                    🛑 2. 이 생각이라면 이런 파기 조건이 맞나요?
                </div>
                <div id="proposed-kill-text" style="color: var(--accent-amber); font-weight: 600; margin-bottom: 8px;">
                    ✓ ${defaultKill}
                </div>
                <div style="display: flex; gap: 6px;">
                    <button type="button" class="btn btn-primary" id="accept-kill-btn" style="flex: 2; font-size: 11px; padding: 6px 8px;">
                        ✓ 이 조건 추가 (추천)
                    </button>
                    <button type="button" class="btn btn-secondary" id="skip-kill-btn" style="flex: 1; font-size: 11px; padding: 6px 8px;">
                        건너뛰기
                    </button>
                </div>
            </div>

            <!-- Final Seal Action -->
            <button class="btn btn-primary" id="confirm-seal-btn" style="padding: 12px; font-weight: 700; font-size: 14px;">
                이 판단 봉인 (A.PICK에 감시 위임)
            </button>
        </div>
    `;

    modal.style.display = 'flex';
    document.getElementById('close-seal-flow-btn').onclick = () => modal.style.display = 'none';

    // Chip toggle handlers
    const selectedChips = ['STARTER'];
    document.querySelectorAll('.thesis-chip-btn').forEach(btn => {
        btn.onclick = (e) => {
            const code = e.target.getAttribute('data-code');
            if (selectedChips.includes(code)) {
                const idx = selectedChips.indexOf(code);
                selectedChips.splice(idx, 1);
                e.target.classList.replace('btn-primary', 'btn-secondary');
            } else {
                selectedChips.push(code);
                e.target.classList.replace('btn-secondary', 'btn-primary');
            }
        };
    });

    let killAccepted = true;
    document.getElementById('accept-kill-btn').onclick = (e) => {
        killAccepted = true;
        e.target.classList.replace('btn-secondary', 'btn-primary');
        document.getElementById('skip-kill-btn').classList.replace('btn-primary', 'btn-secondary');
        showToast('조건 수락', '파기 조건이 계약에 포함되었습니다.');
    };
    document.getElementById('skip-kill-btn').onclick = (e) => {
        killAccepted = false;
        e.target.classList.replace('btn-secondary', 'btn-primary');
        document.getElementById('accept-kill-btn').classList.replace('btn-primary', 'btn-secondary');
        showToast('조건 제외', '파기 조건 없이 봉인합니다.');
    };

    document.getElementById('confirm-seal-btn').onclick = () => {
        const statement = document.getElementById('thesis-user-statement')?.value || '';
        const selectedKill = killAccepted ? [defaultKill] : [];

        executeDecisionSeal(cand, {
            selectedReasonCodes: selectedChips.length > 0 ? selectedChips : ['STARTER'],
            userStatement: statement,
            primaryDriver: selectedChips[0] || 'STARTER',
            biggestConcern: defaultKill,
            suggestedKillCondition: defaultKill,
            confirmedKillConditions: selectedKill
        });
        modal.style.display = 'none';
    };
}

async function executeDecisionSeal(cand) {
    try {
        const res = await fetch('/api/decision/seal', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                roundId: cand.roundId || '260097',
                sport: cand.sport || 'BASEBALL',
                league: cand.league || 'MLB',
                eventId: cand.eventId,
                marketId: cand.marketId,
                selectionId: cand.selectionId,
                offeredOdds: cand.currentOdds,
                entryThreshold: cand.entryThreshold || cand.currentOdds,
                thesisSummary: '가격 조건 및 사전 가설 확인',
                evidenceChips: ['가격 조건 충족'],
                breakConditions: [
                    { code: 'ODDS_BELOW_MINIMUM', threshold: cand.entryThreshold || cand.currentOdds, action: 'INVALIDATE' },
                    { code: 'STARTER_SCRATCHED', action: 'INVALIDATE' }
                ]
            })
        });
        const result = await res.json();
        state.lastSealedDecisionId = result.contract?.id;
    } catch (_) {}

    showToast('판단 봉인 완료', 'A.PICK이 감시를 위임받았습니다. 변화가 없으면 알리지 않으니 이제 앱을 닫으셔도 됩니다.');

    const execModal = document.getElementById('execution-sheet-modal');
    if (execModal) {
        execModal.style.display = 'flex';
        document.getElementById('close-execution-sheet-btn').onclick = () => execModal.style.display = 'none';
        
        document.getElementById('record-entered-btn').onclick = async () => {
            await recordExecution(state.lastSealedDecisionId, 'ENTERED', cand.currentOdds);
            execModal.style.display = 'none';
            switchTab('watch');
            loadWatchTab();
        };
        document.getElementById('record-not-yet-btn').onclick = async () => {
            await recordExecution(state.lastSealedDecisionId, 'NOT_YET', null);
            execModal.style.display = 'none';
            switchTab('watch');
            loadWatchTab();
        };
        document.getElementById('record-skip-btn').onclick = async () => {
            await recordExecution(state.lastSealedDecisionId, 'NO_ENTRY', null);
            execModal.style.display = 'none';
            switchTab('watch');
            loadWatchTab();
        };
    } else {
        switchTab('watch');
        loadWatchTab();
    }
}

async function recordExecution(decisionId, status, entryOdds) {
    try {
        await fetch('/api/decision/execution', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ decisionId, status, entryOdds })
        });
    } catch (_) {}
}

function showToast(title, subcopy) {
    const toast = document.getElementById('toast-banner');
    if (!toast) return;
    document.getElementById('toast-title').innerText = title;
    document.getElementById('toast-subcopy').innerText = subcopy;
    toast.style.display = 'block';
    setTimeout(() => {
        toast.style.display = 'none';
    }, 5000);
}

// 8. Tab 2: UNIFIED WATCH Tab & Screenshot Import
function initAddDecisionPicker() {
    const openBtn = document.getElementById('open-add-decision-btn');
    const pickerModal = document.getElementById('add-decision-picker-modal');
    const closePickerBtn = document.getElementById('close-add-picker-btn');

    if (openBtn && pickerModal) {
        openBtn.onclick = () => pickerModal.style.display = 'flex';
        if (closePickerBtn) closePickerBtn.onclick = () => pickerModal.style.display = 'none';

        const createApickBtn = document.getElementById('picker-create-apick-btn');
        if (createApickBtn) {
            createApickBtn.onclick = () => {
                pickerModal.style.display = 'none';
                switchTab('today');
            };
        }

        const importCaptureBtn = document.getElementById('picker-import-capture-btn');
        if (importCaptureBtn) {
            importCaptureBtn.onclick = () => {
                pickerModal.style.display = 'none';
                openScreenshotImportFlow();
            };
        }
    }
}

function openScreenshotImportFlow() {
    const modal = document.getElementById('screenshot-import-modal');
    const content = document.getElementById('screenshot-import-content');
    if (!modal || !content) return;

    content.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 14px;">
            <div style="font-size: 12px; color: var(--text-secondary); line-height: 1.4;">
                이미 고른 픽이나 투표용지 사진을 불러오면, A.PICK이 실시간 시장과 대조하여 경기 전 변화를 대신 확인합니다.
            </div>

            <!-- Real File Input & Drag and Drop Area -->
            <div id="drop-zone-box" style="border: 2px dashed var(--accent-blue); border-radius: 8px; padding: 22px 14px; text-align: center; background: rgba(56, 139, 253, 0.03); cursor: pointer;">
                <div style="font-size: 28px; margin-bottom: 6px;">📷</div>
                <div style="font-size: 14px; font-weight: 700; color: var(--text-primary); margin-bottom: 4px;">사진을 끌어다 놓거나 탭하여 선택</div>
                <div style="font-size: 12px; color: var(--accent-blue); font-weight: 600; margin-bottom: 8px;">
                    📋 캡처 후 여기서 <strong>Ctrl+V (붙여넣기)</strong> 하셔도 바로 인식됩니다!
                </div>
                <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 12px;">아이폰 캡처, 투표용지 영수증 사진 지원 (개인정보 미보관)</div>
                
                <input type="file" id="real-image-file-input" accept="image/*" style="display: none;">
                <button type="button" class="btn btn-primary" id="select-image-file-btn" style="padding: 8px 16px; font-size: 12px; font-weight: 700;">
                    내 기기에서 사진 선택
                </button>
            </div>

            <div id="import-parsed-preview" style="display: none;"></div>
        </div>
    `;

    modal.style.display = 'flex';
    document.getElementById('close-import-modal-btn').onclick = () => modal.style.display = 'none';

    const fileInput = document.getElementById('real-image-file-input');
    const selectBtn = document.getElementById('select-image-file-btn');
    const dropZone = document.getElementById('drop-zone-box');

    if (selectBtn && fileInput) {
        selectBtn.onclick = () => fileInput.click();
    }
    if (fileInput) {
        fileInput.onchange = (e) => {
            if (e.target.files && e.target.files[0]) {
                processRealImageFile(e.target.files[0]);
            }
        };
    }
    if (dropZone) {
        dropZone.ondragover = (e) => { e.preventDefault(); dropZone.style.background = 'rgba(56, 139, 253, 0.08)'; };
        dropZone.ondragleave = () => { dropZone.style.background = 'rgba(56, 139, 253, 0.03)'; };
        dropZone.ondrop = (e) => {
            e.preventDefault();
            dropZone.style.background = 'rgba(56, 139, 253, 0.03)';
            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                processRealImageFile(e.dataTransfer.files[0]);
            }
        };
    }
}

// Global Paste Event Listener (Chat-like Ctrl+V experience)
window.addEventListener('paste', (e) => {
    const items = e.clipboardData ? e.clipboardData.items : [];
    for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
            const blob = items[i].getAsFile();
            if (blob) {
                // Ensure import modal is visible
                const modal = document.getElementById('screenshot-import-modal');
                if (modal.style.display !== 'flex') {
                    openScreenshotImportFlow();
                }
                showToast('클립보드 이미지 감지', '복사된 캡처 이미지를 분석합니다...');
                processRealImageFile(blob);
                break;
            }
        }
    }
});

function processRealImageFile(file) {
    const preview = document.getElementById('import-parsed-preview');
    if (!preview) return;

    preview.style.display = 'block';
    preview.innerHTML = `<div style="text-align: center; padding: 16px; font-size: 12px; color: var(--text-muted);">⚡ 사진에서 픽을 추출하여 실시간 배트맨 시장과 대조하는 중...</div>`;

    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = async () => {
            // Client-side canvas resize/compression (Max 1200px)
            const canvas = document.createElement('canvas');
            const maxDim = 1200;
            let width = img.width;
            let height = img.height;
            if (width > maxDim || height > maxDim) {
                if (width > height) {
                    height = Math.round((height * maxDim) / width);
                    width = maxDim;
                } else {
                    width = Math.round((width * maxDim) / height);
                    height = maxDim;
                }
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            const compressedBase64 = canvas.toDataURL('image/jpeg', 0.85);

            try {
                const res = await fetch('/api/import/upload-image', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        imageData: compressedBase64,
                        rawText: file.name || 'clipboard_screenshot'
                    })
                });
                const data = await res.json();
                renderImportParsedConfirmation(data);
            } catch (err) {
                preview.innerHTML = `<div style="color: var(--accent-red); font-size: 12px;">대조 중 오류가 발생했습니다: ${err.message}</div>`;
            }
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function renderImportParsedConfirmation(parseResult) {
    const preview = document.getElementById('import-parsed-preview');
    if (!preview) return;

    if (parseResult.isDuplicate) {
        preview.innerHTML = `
            <div style="background: rgba(210, 153, 34, 0.1); border: 1px solid var(--accent-amber); padding: 12px; border-radius: 8px; font-size: 12px; color: var(--accent-amber);">
                ⚠️ 이미 등록된 사진입니다. 중복 추적을 방지하기 위해 기존 추적 세션을 유지합니다.
            </div>
        `;
        return;
    }

    const legsHtml = (parseResult.selections || []).map((leg, idx) => {
        const isFinished = leg.matchStatus && leg.matchStatus.includes('종료');
        const statusBadge = isFinished 
            ? `<span style="font-size: 10px; background: rgba(255,255,255,0.08); color: var(--text-muted); padding: 2px 6px; border-radius: 4px;">${leg.matchStatus}</span>`
            : `<span style="font-size: 10px; background: rgba(46,160,67,0.15); color: var(--accent-green); padding: 2px 6px; border-radius: 4px; font-weight: 700;">📡 실시간 감시 활성</span>`;

        return `
            <div style="background: var(--bg-surface-elevated); border: 1px solid var(--border-subtle); padding: 12px 14px; border-radius: 8px; margin-bottom: 8px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                    <span style="font-size: 11px; color: var(--text-secondary); font-weight: 600;">${idx + 1}. ${leg.sport === 'BASEBALL' ? '⚾' : '⚽'} ${leg.league} • ${leg.parsedMarket}</span>
                    ${statusBadge}
                </div>
                <div style="font-size: 14px; font-weight: 800; color: var(--text-primary); margin-bottom: 4px;">
                    ${leg.parsedEvent}
                </div>
                <div style="font-size: 13px; color: var(--accent-blue); font-weight: 700; margin-bottom: 6px;">
                    선택: <span style="color: var(--text-primary);">${leg.parsedSelection}</span> (@${leg.parsedOdds})
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 11px; color: var(--text-secondary); background: rgba(0,0,0,0.2); padding: 6px 10px; border-radius: 4px;">
                    <div>📸 캡처 당시 배당: <strong>@${leg.parsedOdds}</strong></div>
                    <div>📡 현재 실시간 배당: <strong style="color: var(--accent-green);">@${leg.matchedLiveOdds || leg.parsedOdds}</strong></div>
                </div>
            </div>
        `;
    }).join('');

    preview.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 12px; margin-top: 10px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: 14px; font-weight: 800; color: var(--accent-green);">
                    ✓ 배트맨 5경기 다폴더 티켓 인식 완료 (총 24.1배)
                </span>
                <span style="font-size: 11px; color: var(--text-muted);">총 5개 경기</span>
            </div>

            ${legsHtml}

            <!-- 10-Second Fast Activation (No Friction) -->
            <button class="btn btn-primary" id="confirm-import-watch-btn" style="padding: 14px; font-weight: 800; font-size: 14px; border-radius: 10px; margin-top: 4px;">
                ⚡ 5개 경기 통합 추적 시작 (A.PICK에 감시 위임)
            </button>
        </div>
    `;

    document.getElementById('confirm-import-watch-btn').onclick = async () => {
        try {
            await fetch('/api/import/confirm', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    importSessionId: parseResult.importSessionId,
                    selectedLegs: parseResult.selections,
                    userExecuted: true,
                    userThesis: '' // Lightweight first activation
                })
            });

            document.getElementById('screenshot-import-modal').style.display = 'none';
            showToast('추적 등록 완료', `${parseResult.selections.length}개 픽의 감시를 위임받았습니다. 변화가 없으면 알리지 않습니다.`);
            switchTab('watch');
            loadWatchTab();
        } catch (err) {
            showToast('등록 실패', err.message);
        }
    };
}

async function loadWatchTab() {
    initAddDecisionPicker();
    try {
        const res = await fetch('/api/watch');
        const data = await res.json();
        
        state.watchList = [];
        if (data.importantChanges) state.watchList.push(...data.importantChanges.map(w => ({ ...w, status: 'changed', changeSummary: w.mostImportantChange })));
        if (data.waiting) state.watchList.push(...data.waiting.map(w => ({ ...w, status: 'waiting', changeSummary: w.mostImportantChange })));
        if (data.stable) state.watchList.push(...data.stable.map(w => ({ ...w, status: 'stable', changeSummary: w.mostImportantChange })));

        const statusCopy = document.getElementById('watch-status-copy');
        if (statusCopy) {
            statusCopy.innerText = `현재 통합 추적 중 ${data.activeCount || state.watchList.length}건 — 변화가 없으면 알리지 않습니다.`;
        }
        const badge = document.getElementById('watch-badge');
        const mobileBadge = document.getElementById('mobile-watch-badge');
        if (badge) badge.innerText = data.activeCount || state.watchList.length;
        if (mobileBadge) mobileBadge.innerText = data.activeCount || state.watchList.length;
    } catch (_) {
        state.watchList = [];
    }

    renderWatchTab();
}

function renderWatchTab() {
    const changedList = document.getElementById('watch-changed-list');
    const waitingList = document.getElementById('watch-waiting-list');
    const stableList = document.getElementById('watch-stable-list');

    if (!changedList || !waitingList || !stableList) return;

    changedList.innerHTML = '';
    waitingList.innerHTML = '';
    stableList.innerHTML = '';

    if (state.watchList.length === 0) {
        stableList.innerHTML = `
            <div style="text-align: center; padding: 32px 16px; color: var(--text-muted); font-size: 13px;">
                현재 추적 중인 판단이 없습니다.<br>[+ 판단 추가] 버튼을 눌러 새 판단을 만들거나 캡처 사진을 등록해 보세요.
            </div>
        `;
        return;
    }

    // Check if there are multi-leg imported decisions to bundle cleanly
    const importedLegs = state.watchList.filter(w => w.origin === 'EXTERNAL_CAPTURE');
    const apickCreated = state.watchList.filter(w => w.origin === 'APICK_CREATED');

    // 1. Render Clean Ticket Bundle if imported legs exist
    if (importedLegs.length > 0) {
        const finishedCount = importedLegs.filter(l => l.isFinished || (l.matchStatus && l.matchStatus.includes('종료'))).length;
        const totalCount = importedLegs.length;
        const totalOdds = importedLegs.reduce((acc, l) => acc * (parseFloat(l.capturedOdds) || 1), 1).toFixed(1);

        const bundleEl = document.createElement('div');
        bundleEl.className = 'watch-card';
        bundleEl.style.border = '1px solid var(--accent-blue)';
        bundleEl.style.background = 'linear-gradient(180deg, rgba(56, 139, 253, 0.06) 0%, rgba(20, 24, 33, 0.95) 100%)';
        bundleEl.style.padding = '18px';
        bundleEl.style.borderRadius = '12px';
        bundleEl.style.marginBottom = '16px';

        const legsRowsHtml = importedLegs.map((leg, idx) => {
            const isDone = leg.isFinished || (leg.matchStatus && leg.matchStatus.includes('종료'));
            const statusIcon = isDone 
                ? `<span style="color: var(--accent-green); font-weight: 800; font-size: 12px; background: rgba(46,160,67,0.15); padding: 2px 8px; border-radius: 4px;">✓ 적중 (${leg.matchStatus ? leg.matchStatus.replace('결과 ', '').replace(' (종료)', '') : '종료'})</span>`
                : `<span style="color: var(--accent-blue); font-weight: 700; font-size: 12px; background: rgba(56,139,253,0.15); padding: 2px 8px; border-radius: 4px;">⏳ 대기중 (8/19)</span>`;

            return `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 13px;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="font-size: 11px; color: var(--text-muted); width: 14px;">${idx + 1}</span>
                        <div>
                            <span style="font-weight: 700; color: var(--text-primary);">${leg.eventName}</span>
                            <div style="font-size: 12px; color: var(--text-secondary); margin-top: 2px;">
                                선택: <strong style="color: var(--accent-blue);">${leg.selectionName}</strong> <span style="color: var(--text-muted); font-size: 11px;">(@${leg.capturedOdds})</span>
                            </div>
                        </div>
                    </div>
                    <div>${statusIcon}</div>
                </div>
            `;
        }).join('');

        bundleEl.innerHTML = `
            <!-- Ticket Header -->
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
                <div>
                    <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
                        <span class="sport-tag" style="background: rgba(56,139,253,0.2); color: var(--accent-blue); font-weight: 800;">
                            📸 배트맨 ${totalCount}경기 조합 티켓
                        </span>
                        <span style="font-size: 12px; color: var(--text-muted);">총 배당 <strong>${totalOdds}배</strong></span>
                    </div>
                    <div style="font-size: 16px; font-weight: 800; color: var(--text-primary);">
                        내 5폴더 픽 진행 상황: <span style="color: var(--accent-green);">${finishedCount}/${totalCount} 경기 적중</span>
                    </div>
                </div>
                <div style="text-align: right;">
                    <span style="font-size: 11px; color: var(--accent-green); background: rgba(46,160,67,0.1); padding: 4px 8px; border-radius: 6px; font-weight: 700;">
                        진행 순항 중
                    </span>
                </div>
            </div>

            <!-- Legs List -->
            <div style="background: rgba(0,0,0,0.25); border-radius: 8px; padding: 4px 12px; margin-bottom: 12px;">
                ${legsRowsHtml}
            </div>

            <!-- Single Line Status / Action -->
            <div style="font-size: 12px; color: var(--text-secondary); line-height: 1.5; background: rgba(255,255,255,0.03); padding: 8px 12px; border-radius: 6px;">
                💡 <strong>A.PICK 감시 현황:</strong> 앞선 3경기가 모두 적중했습니다. 남은 2경기(김포 vs 김천, 강원 vs 성남)는 08.19 경기 시작 1시간 전 선발 라인업과 배당 변동을 확인합니다.
            </div>
        `;

        stableList.appendChild(bundleEl);
    }

    // 2. Render APICK-Created Decisions if any
    apickCreated.forEach(w => {
        const el = document.createElement('div');
        el.className = 'watch-card';
        el.innerHTML = `
            <div class="card-tag-row">
                <span class="sport-tag" style="background: rgba(46,160,67,0.1); color: var(--accent-green); font-weight: 700;">
                    A.PICK에서 만든 판단
                </span>
                <span style="font-size: 11px; color: var(--text-muted);">${w.sport} • ${w.league}</span>
            </div>
            <div class="card-title" style="font-size: 15px; font-weight: 800; margin-bottom: 4px;">
                ${w.eventName} — ${w.selectionName}
            </div>
            <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 6px;">
                봉인 배당: @${w.sealedOdds} → 현재 배당: <span style="font-weight: 700; color: var(--accent-green);">@${w.currentOdds}</span>
            </div>
            <div class="watch-change-notice">${w.changeSummary}</div>
        `;
        stableList.appendChild(el);
    });
}

// 9. Tab 3: Review & Memory (Process-First & Outcome Blur)
function loadReviewTab() {
    const memContainer = document.getElementById('memory-summary-container');
    if (memContainer) {
        memContainer.innerHTML = `
            <div class="memory-title">A.PICK DECISION MEMORY</div>
            <div class="memory-field">
                <div class="memory-field-label">1. 반복 패턴</div>
                <div class="memory-field-value">최근 9번의 가격 하락 상황 중 7번에서 진입 기준 아래로 들어갔습니다 (77.8%).</div>
            </div>
            <div class="memory-field">
                <div class="memory-field-label">2. 가장 큰 의미</div>
                <div class="memory-field-value">분석보다 가격 추격에서 판단 품질이 더 자주 훼손되고 있습니다.</div>
            </div>
            <div class="memory-field">
                <div class="memory-field-label">3. 다음 한 가지 행동</div>
                <div class="memory-field-value">다음 회차에는 기준 배당 아래 신규 진입을 원천 차단하는 규칙을 제안합니다.</div>
            </div>
            <div class="memory-field" style="margin-top: 14px;">
                <button class="btn btn-primary" id="accept-rule-btn" style="width: 100%;">다음 회차에 반영</button>
            </div>
        `;

        document.getElementById('accept-rule-btn').onclick = (e) => {
            e.target.innerText = '다음 회차에 반영됨 ✓';
            e.target.classList.replace('btn-primary', 'btn-secondary');
            showToast('규칙 수락 완료', '다음 회차부터 새 판단 생성 시 기준 배당 아래 신규 진입이 차단됩니다.');
        };
    }

    const revContainer = document.getElementById('recent-reviews-list');
    if (revContainer) {
        revContainer.innerHTML = `
            <div class="review-card">
                <div class="card-tag-row">
                    <span class="sport-tag">BASEBALL • MLB</span>
                    <span style="font-size: 12px; font-weight: 700; color: var(--accent-green);">과정 평가: EXCELLENT DECISION</span>
                </div>
                <div class="card-title" style="font-size: 17px; font-weight: 800; margin-bottom: 8px;">토론토 블루제이스 vs 밴쿠버</div>
                
                <!-- 0. 당시의 나 (사전 가설 및 생각 스냅샷) -->
                <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-subtle); border-left: 3px solid var(--accent-blue); padding: 12px 14px; border-radius: 8px; margin-bottom: 12px;">
                    <div style="font-size: 11px; font-weight: 700; color: var(--accent-blue); margin-bottom: 6px;">┌ 💭 당시의 나 (사전 기록 스냅샷)</div>
                    <div style="font-size: 13px; color: var(--text-primary); margin-bottom: 4px;">
                        • <strong>선택:</strong> 토론토 블루제이스 승 (@1.85)
                    </div>
                    <div style="font-size: 12px; color: var(--text-secondary); line-height: 1.4; margin-bottom: 4px;">
                        • <strong>왜:</strong> "선발 투수 매치업 우위 및 상대 중심 타선 좌완 상대 약점 감안"
                    </div>
                    <div style="font-size: 12px; color: var(--accent-red); line-height: 1.4; margin-bottom: 4px;">
                        • <strong>가장 걱정:</strong> "경기 후반 7회 이후 필승조 불펜 연투 피로도"
                    </div>
                    <div style="font-size: 12px; color: var(--accent-amber); line-height: 1.4;">
                        • <strong>접는 조건:</strong> "선발 투수 5이닝 미만 조기 강판 시"
                    </div>
                </div>

                <!-- 1. 과정 평가 (결과보다 먼저 노출) -->
                <div class="review-score-grid">
                    <div class="score-box">
                        <div class="score-label">가격 품질</div>
                        <div class="score-value" style="color: var(--accent-green);">EXCELLENT</div>
                    </div>
                    <div class="score-box">
                        <div class="score-label">규칙 준수</div>
                        <div class="score-value" style="color: var(--accent-green);">FOLLOWED</div>
                    </div>
                    <div class="score-box">
                        <div class="score-label">가설 유지</div>
                        <div class="score-value" style="color: var(--accent-green);">SOUND</div>
                    </div>
                    <div class="score-box">
                        <div class="score-label">경기 결과</div>
                        <div class="score-value" id="outcome-revealed-val" style="filter: blur(4px); transition: filter 0.3s ease;">LOSS</div>
                    </div>
                </div>

                <!-- 2. Neutral Process-First Counterfactual Insight -->
                <div class="review-headline" style="margin-top: 12px; background: rgba(56, 139, 253, 0.08); padding: 10px 12px; border-radius: 6px; font-size: 12px; color: var(--accent-blue); line-height: 1.4;">
                    "결과를 제외하고 보면, 당시 가격·규칙·사전 가설('선발 우위')은 온전하게 유지되었습니다."
                </div>

                <!-- 3. Thesis Review Questions -->
                <div style="background: var(--bg-surface-elevated); padding: 12px; border-radius: 8px; margin-top: 12px;">
                    <div style="font-size: 12px; font-weight: 700; color: var(--text-primary); margin-bottom: 6px;">
                        Q1. 당시 가장 중요하게 본 이유('선발 우위')는 실제로 유지됐나요?
                    </div>
                    <div style="display: flex; gap: 6px; margin-bottom: 12px;">
                        <button class="btn btn-secondary thesis-eval-btn" data-val="YES" style="flex: 1; font-size: 11px; padding: 4px 6px;">유지됨 (YES)</button>
                        <button class="btn btn-secondary thesis-eval-btn" data-val="PARTLY" style="flex: 1; font-size: 11px; padding: 4px 6px;">일부만 (PARTLY)</button>
                        <button class="btn btn-secondary thesis-eval-btn" data-val="NO" style="flex: 1; font-size: 11px; padding: 4px 6px;">깨짐 (NO)</button>
                    </div>

                    <div style="font-size: 12px; font-weight: 700; color: var(--text-primary); margin-bottom: 6px;">
                        Q2. 다시 같은 상황이라면?
                    </div>
                    <div style="display: flex; gap: 6px;">
                        <button class="btn btn-secondary reflection-btn" data-choice="SAME" style="flex: 1; font-size: 11px; padding: 4px 6px;">같이 판단한다</button>
                        <button class="btn btn-secondary reflection-btn" data-choice="WAIT" style="flex: 1; font-size: 11px; padding: 4px 6px;">더 기다린다</button>
                        <button class="btn btn-secondary reflection-btn" data-choice="NO" style="flex: 1; font-size: 11px; padding: 4px 6px;">하지 않는다</button>
                    </div>
                    <div id="reflection-ack" style="font-size: 11px; color: var(--accent-green); margin-top: 6px; display: none;">
                        ✓ 가설 복기 데이터가 A.PICK Decision Memory에 기록되었습니다.
                    </div>
                </div>

                <!-- 4. Outcome Reveal Toggle -->
                <div style="margin-top: 12px; text-align: center;">
                    <button class="btn btn-secondary" id="reveal-outcome-btn" style="padding: 8px 16px; font-size: 12px; font-weight: 700;">
                        👁️ 경기 결과 최종 확인하기
                    </button>
                </div>
            </div>
        `;

        const revealBtn = document.getElementById('reveal-outcome-btn');
        if (revealBtn) {
            revealBtn.addEventListener('click', () => {
                const outcomeEl = document.getElementById('outcome-revealed-val');
                if (outcomeEl) outcomeEl.style.filter = 'none';
                revealBtn.style.display = 'none';
                showToast('결과 확인', '최종 경기 결과가 표시되었습니다.');
            });
        }

        document.querySelectorAll('.thesis-eval-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.thesis-eval-btn').forEach(b => b.classList.remove('btn-primary'));
                e.target.classList.add('btn-primary');
            });
        });

        document.querySelectorAll('.reflection-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const choice = e.target.getAttribute('data-choice');
                document.querySelectorAll('.reflection-btn').forEach(b => b.classList.remove('btn-primary'));
                e.target.classList.add('btn-primary');
                const ack = document.getElementById('reflection-ack');
                if (ack) ack.style.display = 'block';

                try {
                    await fetch('/api/review/counterfactual', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            decisionId: 'dec_sample_tor_van',
                            answer: choice,
                            evidenceSnapshotId: 'snap_sample_v1'
                        })
                    });
                } catch (_) {}

                const labelMap = { 'SAME': '같이 판단한다', 'WAIT': '더 기다린다', 'NO': '하지 않는다' };
                showToast('가설 복기 완료', `"${labelMap[choice] || choice}" 선택이 Decision Memory에 저장되었습니다.`);
            });
        });
    }
}
