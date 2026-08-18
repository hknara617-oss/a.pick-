# A.PICK 퀀트 아키텍처 및 CPO 실전 실행 계획 (v2.0 Spec)

---

## 1. 냉정한 리스크 분석 및 방어책 (Risk Mitigation)

### ① 룰 불일치(Rule Inconsistency) 방어
* **리스크**: 글로벌 북메이커(연장 포함) vs 배트맨(특정 마켓 연장 제외/포함) 규정 차이로 인한 가짜 에지(False Edge) 오판.
* **해결책**: 마켓별 **Canonical Rule Validator**를 두어 연장전 처리 방식 및 득점 기준이 100% 동일한 마켓만 1:1 매핑 허용.

### ② 배트맨 배당 칼질 및 발매 차단(Adverse Selection) 방어
* **리스크**: 스마트 머니 감지 시 배트맨의 일방적 배당 삭감(1.74 → 1.55) 및 발매 중단.
* **해결책**: 직교 코호트(Alpha, Beta, Gamma) 라우팅으로 트래픽을 1/3로 분산하고, 실시간 배당 하락 감지 시 `[AUTO-CANCEL / SLIPPAGE WARNING]` 자동 알림.

### ③ CLV(Closing Line Value) 역전 방어
* **리스크**: 오전 진입 시점 대비 경기 직전 글로벌 배당 역전으로 -EV 전환.
* **해결책**: 경기 시작 60분 전 최종 $\Delta P$ 재검증을 수행하여 $\Delta P < +4.0\%p$로 붕괴 시 자동으로 파기(Invalidation) 실행.

---

## 2. 엔지니어링 & 데이터 파이프라인 아키텍처

```
[배트맨 비공식 API / 스크래퍼]  ──┐
                               ├──> [Entity Resolver (Canonical Matcher)] ──> [No-Vig Engine (Shin/Power)] ──> [Cache / Store]
[The Odds API / Pinnacle API] ──┘
```

* **Entity Resolution (팀명 매핑 사전)**: `맨체스U` ↔ `Manchester United`, `요코베이` ↔ `Yokohama DeNA BayStars` 정적 매핑 + Levenshtein Distance Fuzzy Matcher.
* **Shin No-Vig Engine**: 정보 비대칭(Insider Trading) 보정 공식 적용하여 수학적으로 완벽한 $P_{\text{fair}}$ 도출.
* **경량 스택**: Serverless Functions + Edge Ingestion + Local/Redis State Cache.

---

## 3. UX/UI 2-State 패러다임 (Cognitive Load = 0)

모든 복잡한 수학은 백엔드에 숨기고, 화면은 오직 2가지 상태만 노출합니다.

### 🟢 상태 A: 퀀트 2폴더 승인 (진입일)
* **Hero 영역**: 2개 경기 카드 (`[KBO] SSG 언더 8.5 @1.74` + `[EPL] 아스널 마핸 @1.72` = **합 2.99배**)
* **가이드 뱃지**: `권장 베팅: 시드의 5% (고정)`
* **Primary CTA**: **[배트맨에 번호 복사하고 앱 닫기]** (클립보드 복사 후 Attention Firewall 발동)

### 🛡️ 상태 B: 자본 보존 모드 (하드 패스일)
* **Hero 영역**: 방패 아이콘 + `오늘 시장 위험도: 84점 (함정 마켓)`
* **Copy**: *"배트맨 수수료(20%)를 이길 에지가 없습니다. 오늘 베팅을 쉬어 +20% 시드를 방어했습니다."*
* **Primary CTA**: **[내 잔고 지키기 완료]**

### 📊 하단 Trust Drawer (숨김형 원장)
* 평소에는 `2026 누적 ROI +21.4% (검증됨)` 1줄만 노출, 탭 시 불변 타임스탬프 원장과 몬테카를로 정상 분산 밴드 슬라이드 업.

---

## 4. 4주 MVP 개발 로드맵

| 주차 | 핵심 개발 목표 | 세부 실행 과제 (Deliverables) |
|---|---|---|
| **Week 1** | **Data Ingestion & Mapping** | • 배트맨 프로토 승부식 실시간 파서 구축<br>• The Odds API 연동 및 KBO/EPL/NBA 엔티티 매핑 사전 완성<br>• Shin No-Vig 공정 확률 및 $\Delta P$ 산출 엔진 구축 |
| **Week 2** | **Quant Filter & Cohort Router** | • $\Delta P \ge +6\%p$ 스크리너 및 MEI Hard-Pass 알고리즘 구현<br>• 4개 픽 기반 3개 코호트(Alpha, Beta, Gamma) 분산 배정 로직<br>• 경기 시작 60분 전 DB Row Lock(타임스탬프 봉인) |
| **Week 3** | **Mobile UI & Attention Flow** | • 2상태(Drop vs No-Drop) 모바일 반응형 대시보드 구현<br>• 원클릭 배트맨 경기번호 복사 기능<br>• 경기 30분 전 조건 충족 1회 알림(Web Push) 연동 |
| **Week 4** | **Ledger, Backtest & QA** | • 매일 23:59 자동 결과 정산 및 불변 트랙레코드 아카이브 뷰<br>• 몬테카를로 드로다운 신뢰 밴드 차트 연동<br>• 7일간 실전 회차 모의 검증 후 정식 배포 |
