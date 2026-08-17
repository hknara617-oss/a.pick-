# A.PICK Phase 3 Tooltip Research

**Status:** REWORK

## CHG_DTM Format Investigation

Sample values (first 3): 20260815191634031948, 20260815191511966336, 20260815191438186240
All lengths = 20: true
Date prefix = 2026: true
Monotonic ordering: false

**Hypothesis:** `YYYYMMDDHHmmss` (14 digits) + 6 fractional nanoseconds
**Status: PLAUSIBLE but UNVERIFIED** — requires 3+ round comparison to confirm.

Current handling: `parsedAt = null`, `status = "UNVERIFIED_TIMESTAMP_FORMAT"`

## Odds Scale

Provider integers (e.g. 480) → decimal via /100 → "4.80"
compSchedules odds (e.g. 3.35) → already decimal → "3.35"
These two sources MUST NOT be mixed.

## GM_SEQ Join Rate

139/139 = 100% joined to normalized markets.
GM_SEQ matches market-level matchSeq exactly.
