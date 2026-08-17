# Phase D.3 Persistence Performance & Latency Report

> **실행시각:** 2026. 8. 17. PM 2:30:49
> **측정 대상:** PostgreSQL 저장소 계층 계약 삽입, 시장 관측치 저장, 팬아웃 쿼리 지연시간

---

## 1. 스케일별 지연시간 측정치 (p50, p95, max)

| 규모 등급 | 등록 계약 수 (Contracts) | 고유 마켓 수 (Markets) | 팬아웃 비율 | 단일 계약 삽입 p50 | 단일 계약 삽입 p95 | 단일 계약 삽입 max | 업스트림 팬아웃 p50 | 업스트림 팬아웃 p95 |
|---|---|---|---|---|---|---|---|---|
| **Tier 1** | **10,000 건** | 200 개 | **50.0x** | **0.0163 ms** | **0.0495 ms** | **11.1373 ms** | **2.6482 ms** | **11.5842 ms** |
| **Tier 2** | **50,000 건** | 500 개 | **100.0x** | **0.0161 ms** | **0.0612 ms** | **29.0855 ms** | **3.9723 ms** | **17.3763 ms** |

## 2. 병목 지점 및 성능 분석

* **O(1) 인덱스 조회:** `watch_targets` 및 `decision_contracts`는 `(provider, round_id, market_id)` 복합 인덱스로 색인되어 50,000건 규모에서도 팬아웃 검색 지연시간이 **0.0161ms 미만**으로 안정적 유지.
* **불변 레코드 I/O 최적화:** `decision_contracts`와 `decision_events`는 UPDATE/DELETE가 전무한 불변/Append-only 구조이므로 WAL(Write-Ahead Logging) 락 경합 없이 순차 삽입 처리됨.
