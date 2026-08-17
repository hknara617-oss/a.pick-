# Phase D.1 Core Architecture Specification

> **상태:** FROZEN ✅  
> **아키텍처 원칙:** 100% Sport-Agnostic Decision Core (종목 의존성 완전 분리)

---

## 1. 아키텍처 다이어그램 & 모듈 경계

```
┌─────────────────────────────────────────────────────────────┐
│                    SPORTS CONTEXT ADAPTERS                  │
│  MLBContextAdapter │ SoccerAdapter │ Basketball │ Volleyball│
└─────────────────────────────┬───────────────────────────────┘
                              │ SportsContextSnapshot (Signals only, NO prob deltas)
┌─────────────────────────────▼───────────────────────────────┐
│               SPORT-AGNOSTIC DECISION CORE                  │
│                                                             │
│   ┌─────────────────────┐       ┌───────────────────────┐   │
│   │  MarketFairEngine   │       │  EntryThresholdEngine │   │
│   │  (No-Vig 2/3-Way)   │       │  (Configurable Margin)│   │
│   └──────────┬──────────┘       └───────────┬───────────┘   │
│              │                              │               │
│              ▼                              ▼               │
│   ┌─────────────────────────────────────────────────────┐   │
│   │                  PriceStateEngine                   │   │
│   │     ATTRACTIVE │ FAIR │ UNATTRACTIVE │ STALE        │   │
│   └─────────────────────────┬───────────────────────────┘   │
│                             │                               │
│   ┌─────────────────────┐   │   ┌───────────────────────┐   │
│   │ ThesisStateMachine  │   │   │ BreakConditionEval    │   │
│   │ BROKEN>WAIT>WEAK>VAL│   │   │ (Price/Line/Context)  │   │
│   └──────────┬──────────┘   │   └───────────┬───────────┘   │
│              │              │               │               │
│              ▼              ▼               ▼               │
│   ┌─────────────────────────────────────────────────────┐   │
│   │                 ActionStateMachine                  │   │
│   │           ENTER │ WAIT │ DO_NOT_ENTER │ REVIEW      │   │
│   └─────────────────────────┬───────────────────────────┘   │
│                             ▼                               │
│                   DecisionContextResult                     │
│               + Deterministic Korean Copy                   │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Core 모듈 스포츠 독립성 검증

* `src/core/` 내 모든 엔진은 `MLBContextAdapter`, `pitcher`, `ERA`, `OPS` 등 종목 고유 필드를 일절 import하지 않습니다.
* 모든 스포츠 어댑터가 비활성화된 상태에서도 Kill Test 100% 통과를 확인했습니다.
