# Phase D.1 State Transitions Specification

> **목적:** ThesisState 및 ActionState 상태 전이 규칙과 우선순위 확정

---

## 1. Thesis State Precedence (결정론적 우선순위)

```
BROKEN (최우선) > WAIT > WEAKENED > VALID (기본)
```

| 순위 | 상태 | 전이 조건 | 예시 |
|---|---|---|---|
| **1** | **BROKEN** | 등록된 BreakCondition 중 1개 이상 충족 | 가격 급락 (`PRICE_LT`), 라인 변동 (`LINE_CHANGED`), 선발 교체 (`STARTER_CHANGED`) |
| **2** | **WAIT** | 필수 핵심 데이터 누락 또는 소스 데이터 Stale | 공식 라인업 미발표, 제공사 피드 지연 |
| **3** | **WEAKENED** | 명시적 파기는 아니나 검증된 불리한 컨텍스트 감지 | 핵심 선수 결장 루머 확인 (`KEY_PLAYER_OUT`) |
| **4** | **VALID** | 파기 및 대기 조건 없이 모든 판단 전제 성립 | 정상 마켓, 정상 컨텍스트 |

---

## 2. Action State 매트릭스

| Thesis State | Price State | Freshness | Action State | 설명 |
|---|---|---|---|---|
| **BROKEN** | * (Any) | * (Any) | **`REVIEW`** | 사전에 정한 전제 파기 → 즉시 재검토 |
| **WAIT** | * (Any) | * (Any) | **`WAIT`** | 정보 불충분 → 대기 |
| **VALID** | **ATTRACTIVE** | **FRESH** | **`ENTER`** | 전제 유지 + 목표 배당 충족 + 신선 마켓 |
| **VALID** | **FAIR** | **FRESH** | **`WAIT`** | 전제 유지 + 마진 버퍼 미달 |
| **VALID** | **UNATTRACTIVE** | * | **`DO_NOT_ENTER`** | 가격 매력 없음 |
| **WEAKENED**| **ATTRACTIVE** | **FRESH** | **`WAIT`** | 가격은 좋으나 전제 약화 → 대기 |
| **WEAKENED**| **UNATTRACTIVE** | * | **`DO_NOT_ENTER`** | 전제 약화 + 가격 불량 |
| * (Any) | **STALE / UNPRICED** | * | **`WAIT` / `DO_NOT_ENTER`** | **절대 ENTER 진입 불가** |
