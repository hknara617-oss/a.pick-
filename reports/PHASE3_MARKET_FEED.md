# A.PICK Phase 3 Market Feed Report

**Status:** REWORK
**Executed:** 2026-08-15T11:47:35.305Z

## Fixture A Ingestion

Events: 170
Markets: 851
Observations: 2550
Initial MARKET_ADDED changes: 850

## Controlled A→B Change Detection

| Change Type | Expected | Actual |
|-------------|----------|--------|
| ODDS_CHANGE | 2 | 0 |
| LINE_CHANGE | 1 | 0 |
| MARKET_ADDED | 1 | 1 |
| MARKET_REMOVED | 1 | 1 |

## Idempotency

False ODDS/LINE changes on identical ingest: 0 ✅

## Round Transition

Same matchSeq across gmTs 260096 and 260097: distinct market IDs ✅

## Partial Payload Safety

300-row payload → MARKET_REMOVED events: 0 ✅

## Schema Drift

Drift detection: NOT WORKING ❌
Normalization blocked: YES ✅

## Audit Chain

MarketChange → Observation → Snapshot → AuditRecord: TRACEABLE ✅
