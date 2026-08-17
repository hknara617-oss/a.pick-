# Phase E Post-Game Decision Review Engine Specification

> **핵심 원칙 (Core Invariant):**  
> **"Outcome must NEVER directly determine DecisionQuality."**  
> 경기 결과(WIN/LOSS)는 판단 품질 점수에 일체 개입하지 않으며, 오직 가격 품질, 사전 규칙 준수, 사전 분석 가설의 유지 여부로만 평가합니다.

---

## 1. 4축 평가 모델 아키텍처

```
[ POST-GAME INPUTS ]
   ├─ SettlementResult (WIN/LOSS/PUSH/VOID) ────► 1. OUTCOME (격리 보관)
   ├─ ClosingPrice (Pre-Close Verified Odds) ──► 2. PRICE QUALITY (CLV 평가) ──┐
   ├─ EntryExecution + Pre-declared Rules ─────► 3. RULE DISCIPLINE ───────────┼─► DECISION QUALITY
   └─ PreGame ContextSignals + Evaluations ────► 4. THESIS REVIEW ─────────────┘
```

### 1.1 축별 평가 기준
1. **OUTCOME (결과):** `WIN` / `LOSS` / `PUSH` / `VOID` / `UNKNOWN`
2. **PRICE QUALITY (가격 품질):** `EXCELLENT` / `GOOD` / `FAIR` / `POOR` / `UNKNOWN`
   - Canonical CLV: `(entryOdds / closingOdds) - 1`
   - `EXCELLENT`: CLV >= +5.0%
   - `GOOD`: +2.0% <= CLV < +5.0%
   - `FAIR`: -2.0% < CLV < +2.0%
   - `POOR`: CLV <= -2.0%
3. **RULE DISCIPLINE (규칙 준수):** `FOLLOWED` / `PARTIAL` / `VIOLATED`
   - 사전 정의된 최소 진입 배당(`minimumEntryOdds`) 및 파기 조건(`breakConditions`) 준수 여부
4. **THESIS REVIEW (판단 가설 검토):** `SOUND` / `MIXED` / `UNSOUND` / `UNREVIEWABLE`
   - 경기 시작 전(`observedAt <= eventStartTime`) 수집된 정보 신호 및 전제의 유효성
   - **사후 결과 누출 방지(No Post-Game Leakage):** 최종 점수나 경기 후 기록은 가설 검토에 절대 입력되지 않음.

---

## 2. 종합 판단 품질 산출식 (Design v1 / UNCALIBRATED_V1)

```
Score = PriceQualityScore + RuleDisciplineScore + ThesisReviewScore

PriceQuality:   EXCELLENT (+2), GOOD (+1), FAIR (0), POOR (-2), UNKNOWN (0)
RuleDiscipline: FOLLOWED (+2), PARTIAL (0), VIOLATED (-3)
ThesisReview:   SOUND (+2), MIXED (0), UNSOUND (-3), UNREVIEWABLE (0)

Final Grade:
>= 5 : EXCELLENT
 2~4 : GOOD
 0~1 : FAIR
 < 0 : POOR
```
