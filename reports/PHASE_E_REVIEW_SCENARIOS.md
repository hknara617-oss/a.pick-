# Phase E Review Scenarios & Behavioral Invariant Report

---

## 1. 정규 검증 시나리오 (Canonical Scenarios)

| 시나리오 | 경기 결과 (Outcome) | 가격 품질 (Price) | 규칙 준수 (Rule) | 가설 검토 (Thesis) | 종합 판단 품질 (Decision Quality) | 사용자 헤드라인 |
|---|---|---|---|---|---|---|
| **Scenario A** | **LOSS** ❌ | **EXCELLENT** (+8.1%) | **FOLLOWED** ✅ | **SOUND** ✅ | **EXCELLENT** ✅ | *"결과는 좋지 않았지만, 사전에 정한 가격과 의사결정 규칙은 충실히 지켰습니다."* |
| **Scenario B** | **WIN** ⭕ | **POOR** (-8.3%) | **VIOLATED** ❌ | **UNSOUND** ❌ | **POOR** ❌ | *"결과는 좋았지만, 사전에 정한 진입 기준과 판단 조건은 지켜지지 않았습니다."* |
| **Scenario C** | **LOSS** ❌ | **UNKNOWN** | **FOLLOWED** ✅ | **SOUND** ✅ | **GOOD** ✅ | *"마감 가격을 확인할 수 없어 가격 품질을 제외하고 평가했습니다."* |
| **Scenario D** | **PUSH** ➖ | **FAIR** | **FOLLOWED** ✅ | **SOUND** ✅ | **GOOD** ✅ | *"사전 의사결정 원칙을 지켰습니다."* |
| **Scenario E** | **VOID** ⚪ | **UNKNOWN** | **FOLLOWED** ✅ | **SOUND** ✅ | **GOOD** ✅ | *"사전 의사결정 원칙을 지켰습니다."* |

---

## 2. Core Invariant 실측 증명

* **WIN/LOSS 스왑 불변성:** 동일한 판단 조건 하에서 결과만 `WIN <-> LOSS`로 교체했을 때, `DecisionQuality` 등급 및 세부 산출 점수(Score)는 **100% 동일(오차 0)**하게 유지됨을 증명함.
