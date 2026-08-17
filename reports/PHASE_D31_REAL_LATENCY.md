# Phase D.3.1 Real Remote Network & Database Latency Report

> **실행시각:** 2026. 8. 17. PM 3:06:08
> **측정 방식:** 원격 Supabase 인스턴스에 대한 실제 HTTPS/TLS WAN 왕복 지연시간 실측 (N = 100)

## 실측 지연시간 (Real Remote Latencies)

| 작업 (Operation) | N | p50 | p95 | p99 | max |
|---|---|---|---|---|---|
| **Watch-Target Lookup (SELECT)** | 100 | **23.72 ms** | **37.19 ms** | **110.3 ms** | **110.3 ms** |
| **Watch Evaluation (INSERT)** | 100 | **22.88 ms** | **30.96 ms** | **48.11 ms** | **48.11 ms** |
