# A.PICK v6

Korea-first Sports Decision Companion.

**This is not a sportsbook. This is not a pick-seller. This is a decision-compression and decision-memory product.**

## Architecture

```
Provider (Betman)
   ↓
BetmanAdapter (BetmanClient → BetmanParser → BetmanNormalizer → BetmanValidator)
   ↓
A.PICK Normalized Models (Round / Event / Market / OddsHistory)
   ↓
Product (오늘의 픽 / 추적 / 복기)
```

## Build Order (Strict)

- [x] PHASE 0 — Repository + Architecture
- [/] PHASE 1 — Betman Connector Probe ← **current**
- [ ] PHASE 2 — Betman Adapter + normalized DB
- [ ] PHASE 3 — Raw snapshot + polling + schema drift
- [ ] PHASE 4 — Internal market viewer
- [ ] PHASE 5 — 오늘의 픽 shortlist
- [ ] PHASE 6 — 깊게 보기
- [ ] PHASE 7 — Decision Capture
- [ ] PHASE 8 — 추적 / WATCH
- [ ] PHASE 9 — LiveSportsAdapter + MatchResolver
- [ ] PHASE 10 — Notifications
- [ ] PHASE 11 — Result settlement
- [ ] PHASE 12 — 복기
- [ ] PHASE 13 — Decision Memory
- [ ] PHASE 14 — Implication Engine
- [ ] PHASE 15 — 다음 회차에 반영
- [ ] PHASE 16 — Desktop Decision Terminal
- [ ] PHASE 17 — Mobile Pocket Agent

## Quick Start

```bash
cd apps/api
npm install
npm run probe        # Run Betman Connector Probe (Phase 1)
npm run test         # Run unit tests
npm run dev          # Start API server
```

## Engineering Rules

- **RULE 1** Real data before UI polish.  
- **RULE 2** Never fabricate Betman data.  
- **RULE 3** Never silently fall back to demo data.  
- **RULE 8** If something fails, expose the failure. Never fake success.

See `A.PICK MASTER BUILD HARNESS` for full specification.
