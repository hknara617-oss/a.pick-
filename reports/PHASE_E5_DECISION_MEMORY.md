# Phase E.5 Decision Memory & Behavior Pattern Engine Specification

> **핵심 철학 (Core Memory Principle):**  
> "어떤 경기를 잘 맞히는가?"를 맞히려는 것이 아니라,  
> **"나는 반복해서 어떤 판단 실수를 하는가?"**, **"나는 어떤 조건에서 규칙을 잘 지키는가?"**, **"나는 기준이 깨진 뒤에도 추격하는가?"**를 학습하여 **다음 회차 행동 규칙을 변경**합니다.

---

## 1. Decision Memory 루프 구조

```
DecisionContract (판단 봉인)
       ↓
WATCH Engine (변화 추적)
       ↓
Review Engine (사후 복기 & 결과 격리)
       ↓
DecisionMemoryRecord (원자적 행동 기록)
       ↓
PatternEngine (분모 기반 빈도 & 샘플 게이팅)
       ↓
MemoryImplication & OneChange (다음 1가지 행동 제안)
       ↓
ProposedBehaviorRule (사용자 명시적 수락)
       ↓
다음 회차 DecisionContract에 반영
```

---

## 2. 행동 패턴 카탈로그 (Behavior Pattern Catalog v1)

1. **`CHASE_AFTER_THRESHOLD`**: 배당이 사전 기준선 아래로 하락했음에도 진입 강행.
2. **`BREAK_CONDITION_OVERRIDE`**: 파기 조건(선발 제외, 기상 악화 등) 발생 후 진입 강행.
3. **`PRICE_DISCIPLINE`**: 사전 설정한 기준 배당을 철저히 고수.
4. **`POSITIVE_CLV_PATTERN`**: 마감 시장 대비 지속적으로 유리한 가격 선점.
5. **`NEGATIVE_CLV_PATTERN`**: 시장 마감선 대비 지속적으로 불리한 가격에 체결.
6. **`WEAKENED_THESIS_ENTRY`**: 경기 전 가설이 약화되었음에도 진입을 멈추지 않음.
7. **`THESIS_DISCIPLINE`**: 경기 직전까지 사전 분석 가설의 일관성 유지.

---

## 3. 핵심 안전 원칙
* **분모(Denominator) 기반 유의성 평가:** 단순 횟수가 아닌 `(발생 횟수 / 해당 상황 노출 횟수)` 비율 산출.
* **샘플 게이팅:** N < 5건일 때는 미성숙 패턴 생성을 원천 차단하고 `INSUFFICIENT_DATA`로 표시.
* **심리학적 라벨링 배제:** "충동적", "도박성" 등의 낙인을 배제하고 객관적 수치("8번 중 6번 기준 아래 진입")로만 기술.
* **불변성:** 과거 봉인된 계약은 절대 수정되지 않으며, 수락된 규칙은 오직 미래 계약에만 적용됨.
