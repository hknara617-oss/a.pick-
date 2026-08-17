# A.PICK Phase 3 Change Detector Report

**Status:** REWORK

## Change Types Verified

- ODDS_CHANGE: ✅ (winAllot delta -0.15)
- LINE_CHANGE: ✅ (handi delta -1)
- MARKET_ADDED: ✅ (synthetic matchSeq 999001)
- MARKET_REMOVED: ✅ (last row removed from fixture)

## Decimal Precision

All comparisons use canonical string representation e.g. "3.35", "4.80".
No floating-point equality used.

## Provider Health States

HEALTHY → DEGRADED → STALE (after 3 consecutive failures) ✅

## Test Results: 49/53
