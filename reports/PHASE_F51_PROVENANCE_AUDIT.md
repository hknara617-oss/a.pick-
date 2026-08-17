# Phase F.5.1 Provenance Audit & Fixture Isolation Report

> **실행시각:** 2026-08-17  
> **감사 목적:** 허위 시뮬레이션 및 비실데이터 픽스처가 파운더 실전 도그푸드 데이터로 오염되는 것을 100% 차단.

---

## 1. 배트맨 원본 피드 실측 결과

* **실제 분석 대상 파일:** `scratch/betman_v4_G101_260097_2026-08-17T03-35-01-620Z.json`
* **실제 회차 번호:** **`260097`** (동적 감지)
* **실제 존재하는 종목:** **`BS` (야구: MLB 등) + `SC` (축구: 한국 FA컵, 코파 리베르타도레스, MLS, 동남아시아 챔피언십 등)**
* **존재하지 않는 종목:** 농구(`BK`), 배구(`VB`)는 260097 회차에 공시 마켓이 없음.

---

## 2. 결함 시정 (Corrections Made)

| 이전 부정확한 항목 | 감사 판정 | 시정 조치 |
|---|---|---|
| `run_phase_f5_dogfood_simulation.js`의 자동 설문 응답 | **SIMULATED_FIXTURE** | 전면 격리 및 파운더 실제 이력에서 0건 처리 |
| "260097 실시간 MLB, EPL, KBL, V-League" 표기 | **INVALID** | `260097` 회차는 야구(BS) + 축구(SC)만 실존함을 확정하고 KBL/V-League 제거 |
| "토론토 vs 밴쿠버 (MLB)" | **SIMULATED_FIXTURE** | 실존 매치업 `[BS] 휴스턴 애스트로스 vs 시애틀 매리너스` 및 `[SC] 한국 FA컵` 실데이터로 대체 |

---

## 3. 격리 원칙
* `SIMULATED_DOGFOOD_FIXTURE`는 QA 테스트용으로만 분류되며, 파운더 및 유저의 실제 DecisionContract, Watch, Review, Memory에 단 1건도 유입되지 않음.
* `BetmanLiveFeedResolver`를 통해 `LIVE_BETMAN` 마켓만 파운더 실전 UI에 공급됨.
