# Phase F.1 Real Data Flow & Service Layer Architecture

---

## 1. 계층형 데이터 흐름 (Layered Architecture)

```
[ Frontend Client (HTML5 / Vanilla JS PWA) ]
                ↓  (REST / WebSocket API)
[ Application Service Layer ]
   ├─ TodayService.js          ──► MarketAnalysis & 0-7 Candidate Window
   ├─ DecisionService.js       ──► 3-Step Sealing & Genesis Event SHA-256
   ├─ WatchService.js          ──► Grouped Quiet State (Changed/Waiting/Stable)
   └─ ReviewMemoryService.js   ──► 4-Axis Isolation & One Change Proposal
                ↓
[ Core Engines (Frozen D.1 ~ E.5) ]
   ├─ MarketSemanticParser
   ├─ WatchEngine & WatchEvaluator
   ├─ ReviewEngine & SettlementEngine
   └─ DecisionMemoryEngine & PatternPriorityEngine
                ↓
[ Supabase PostgreSQL & PostgREST / PgBouncer ]
   ├─ decision_contracts (Immutable sealed triggers)
   ├─ decision_events (Append-only audit trail)
   ├─ watch_targets & watch_evaluations
   ├─ review_results (4-axis structured payloads)
   └─ decision_memory_records & behavior_patterns (RLS isolated)
```

UI는 데이터베이스 테이블을 직접 임의 쿼리하지 않으며, 전용 Application Service 레이어를 거쳐 엄격한 비즈니스 불변성을 준수합니다.
