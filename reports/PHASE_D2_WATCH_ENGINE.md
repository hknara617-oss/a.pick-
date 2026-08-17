# Phase D.2 Multi-Sport WATCH Engine Architecture & Specification

> **상태:** FROZEN ✅  
> **핵심 원칙:** "판단을 저장하면 계속 볼 필요가 없다. 바뀌는 것이 있을 때만 알려준다."

---

## 1. WATCH 파이프라인 아키텍처

```
Provider Fetch (Betman JSON)
      ↓
Provider Health Gating (Healthy / Degraded / Stale)
      ↓
LastKnownGoodStore (Shielding against partial/corrupt fetches)
      ↓
MarketWatchRegistry (1 Upstream Fetch → N Decision Fan-out)
      ↓
SportsContextAdapter (Signals only, NO prob deltas)
      ↓
ChangeMaterialityEngine (Detect changes + Categorize Materiality)
      ↓
DecisionContextEngine (Evaluate ThesisState & ActionState)
      ↓
NotificationSuppressionEngine (Debounce, Hysteresis, Compression)
      ↓
DecisionEvents (Append-only SHA-256 Hash Chain)
      ↓
NotificationCandidate (Clean, minimal Korean templates)
```

## 2. 데이터베이스 마이그레이션 예고 (Phase D.3 Schema)

* `watch_targets` (id, decision_id, provider, round_id, event_id, market_id, selection_id, status)
* `market_observations` (id, market_key, odds, line, status, observed_at)
* `context_snapshots` (id, event_key, sport, freshness, signals_json)
* `decision_contracts` (id, user_id, provider, offered_odds, entry_rule, break_conditions)
* `decision_events` (id, contract_id, event_type, payload, prev_hash, hash, created_at)
* `watch_evaluations` (id, target_id, materiality, thesis_state, action_state, evaluated_at)
* `notification_candidates` (id, decision_id, severity, dedupe_key, title, body, created_at)
