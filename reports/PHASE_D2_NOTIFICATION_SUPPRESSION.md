# Phase D.2 Notification Suppression & Noise Filtering Report

> **목적:** '변화 감지'보다 '변화 무시(Noise Filtering)'가 우선되는 원칙 검증

---

## 1. 노이즈 억제 매트릭스

| 변화 유형 | 입력 조건 | 억제 정책 | 결과 | 비고 |
|---|---|---|---|---|
| **단순 미세 배당 변동** | 1.85 → 1.84 (Δ0.01) | Sub-noise 필터링 (<0.03) | 🔇 **알림 0건** | Materiality NONE |
| **동일 데이터 반복 수신** | 동일 배당 x 10회 | Idempotency | 🔇 **알림 0건** | 중복 이벤트 0건 |
| **급격한 배당 진동** | 1.89 ↔ 1.95 (3회 반복) | Hysteresis / Debounce | 🔇 **알림 0건** | 핑퐁 알림 스팸 차단 |
| **선발 변경 + 배당 급변** | 복수 동시 발생 | Change Compression | 🔔 **단 1건 압축 알림** | 3건의 개별 알림을 1건으로 통합 |
