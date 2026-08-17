# Phase D.2 Live Betman Shadow Run Report

> **실행시각:** 2026. 8. 17. PM 2:18:34
> **감시 대상:** 배트맨 260097 회차 실전 10개 마켓 (MLB 4, Soccer 4, Basketball 1, Volleyball 1)
> **폴링 사이클:** Cycle 1 (실전 기준선) → Cycle 2 (멱등성 검증) → Cycle 3 (통제된 모의 변화 주입)

---

## 1. 실전 마켓 감시 및 모의 변화 주입 결과

| 주입 시나리오 | 대상 경기 | 종목 | Thesis State | Action State | Materiality | 알림 생성 여부 | 알림 제목 |
|---|---|---|---|---|---|---|---|
| **SIMULATED CHANGE: MLB Starter Replaced** | 신시내티 레즈 vs 세인트루이스 카디널스 | FRESH | `BROKEN` | **`REVIEW`** | `CRITICAL` | 🔔 생성 | `처음 판단을 다시 봐야 해요` |
| **SIMULATED CHANGE: Soccer Odds Dropped Below Threshold** | 카디프 시티 vs 렉섬 | FRESH | `BROKEN` | **`REVIEW`** | `CRITICAL` | 🔔 생성 | `사전 설정한 재검토 조건이 발생했어요` |
| **SIMULATED CHANGE: Basketball Line Shift (-3.5 to -5.5)** | 서울 SK vs 안양 정관장 | FRESH | `BROKEN` | **`REVIEW`** | `CRITICAL` | 🔔 생성 | `사전 설정한 재검토 조건이 발생했어요` |
| **SIMULATED CHANGE: Volleyball Price Rapid Oscillation** | 대한항공 vs 현대캐피탈 | FRESH | `VALID` | **`DO_NOT_ENTER`** | `HIGH` | 🔇 억제 | — (노이즈 억제됨) |
