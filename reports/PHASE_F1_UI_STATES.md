# Phase F.1 UI State Library Report (States A through J)

모든 10개 UI 상태 픽스처는 `src/fixtures/UIStateFixtures.js`에 격리 정의되어 있으며, 실데이터와 혼동되지 않도록 `_isFixture: true` 메타데이터가 명시되어 있습니다.

---

## 1. UI 상태 매트릭스

| 상태 코드 | 상태 명칭 | 탭 | 주요 UI 표시 |
|---|---|---|---|
| **STATE_A** | `VALID + ATTRACTIVE` | 오늘의 픽 | 가격 조건 충족 (배당 1.86 > 기준 1.82), 액션 `ENTER` |
| **STATE_B** | `VALID + UNATTRACTIVE` | 오늘의 픽 | 진입 기준 미달 (배당 1.62 < 기준 1.72), 액션 `DO_NOT_ENTER` |
| **STATE_C** | `WEAKENED` | 오늘의 픽/추적 | 가설 약화 (핵심 선수 훈련 불참), 액션 `REVIEW` |
| **STATE_D** | `BROKEN` | 추적 | 파기 조건 발생 (선발 투수 담 증세 교체), 액션 `DO_NOT_ENTER` |
| **STATE_E** | `WAIT` | 추적 | 라인업 발표 1시간 전 대기, 액션 `WAIT` |
| **STATE_F** | `NO_CANDIDATES` | 오늘의 픽 | *"오늘은 억지로 고를 필요가 없어요."* 빈 화면 |
| **STATE_G** | `LOSS + GOOD_DECISION` | 복기 | 결과 LOSS ❌ vs 판단 EXCELLENT ✅ |
| **STATE_H** | `WIN + POOR_DECISION` | 복기 | 결과 WIN ⭕ vs 판단 POOR ❌ (기준 미달 진입 경고) |
| **STATE_I** | `MEMORY_ESTABLISHED` | 복기 | 9회 중 7회 추격 (77.8%), `NO_ENTRY_AFTER_THRESHOLD_BREAK` 제안 |
| **STATE_J** | `MEMORY_INSUFFICIENT` | 복기 | *"아직 반복 패턴을 판단하기에 기록이 조금 더 필요합니다 (3/5건)"* |
