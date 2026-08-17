# A.PICK Gate 2.2 — Normalizer Patch Report

**Executed:** 2026-08-15T11:22:49.589Z
**Fixture:** betman_raw_G101_260096_2026-08-15T10-17-06-514Z_e462ab1d.json

---

## STATUS: PASS

---

## Accounting (850 = 850 + 0 + 0 + 0)

| Metric | Value |
|--------|-------|
| Source Rows | 850 |
| Normalized Markets | 850 |
| Unsupported | 0 |
| Invalid | 0 |
| Ambiguous | 0 |
| Checksum | 850 |
| Checksum Match | ✅ |

## Normalized Objects

| Object | Count | Strategy |
|--------|-------|---------|
| Events | 170 | homeId+awayId+leagueCode+gameDate |
| Markets | 850 | hash(eventId+matchSeq) |
| Selections | 1529 | per selection type |

## Market Type Breakdown

| Type | Count | shortlistEligible |
|------|-------|------------------|
| MONEYLINE_3WAY | 112 | ✅ |
| HANDICAP_2WAY | 210 | ✅ |
| TOTAL | 195 | ✅ |
| ODD_EVEN | 170 | ❌ (product hidden) |
| MONEYLINE_2WAY | 83 | ✅ |
| WIN1LOSE | 80 | ✅ |

## Corrections Applied

- Event identity: matchSeq → homeId+awayId+leagueCode+gameDate
- compSchedules parsing: now reads keys+datas instead of top-level array
- Market types added: WIN1LOSE (betId 108), ODD_EVEN (betId 17/77/75), 전반 variants
- SUM markets: normalized as ODD_EVEN, shortlistEligible=false
- Tooltip odds helper: /100 scale normalization with null-guard
- CHG_DTM: stored raw, status=UNVERIFIED_TIMESTAMP_FORMAT
- Checksum enforced: normalized+unsupported+invalid+ambiguous=850

## Tooltip Odds Scale

| Raw (provider) | Normalized (/100) |
|----------------|-------------------|
| 480 | 4.8 |
| 405 | 4.05 |
| 0 | null (excluded) |
| null | null (excluded) |

**IMPORTANT:** compSchedules odds (winAllot etc.) are already decimal. Do NOT apply /100 to them.

## Tooltip Timestamp

CHG_DTM format: UNVERIFIED. Raw value stored. parsedAt = null.

## Tests: 27/27 PASS

- ✅ checksum 850 — 850 vs 850
- ✅ event count = 170 — got 170
- ✅ all rows accounted
- ✅ WIN1LOSE rows = 80 — got 80
- ✅ WIN1LOSE not collapsed into MONEYLINE
- ✅ ODD_EVEN rows = 170 (but counted in normalized) — got 170
- ✅ ODD_EVEN not shortlistEligible
- ✅ SUM never maps to MONEYLINE
- ✅ 광주FC vs 포항: multiple matchSeqs for one event — 8 matchSeqs
- ✅ 광주FC vs 포항: grouped into ONE event — eventId=EVT_5960ad7a44e1, markets=8
- ✅ same teams on different dates (N/A — only 1 date in fixture) — Fixture covers single date
- ✅ providerMarketId = matchSeq preserved
- ✅ all selections have odds > 0
- ✅ normalizeTooltipOdds(480) = 4.80 — got 4.8
- ✅ normalizeTooltipOdds(405) = 4.05 — got 4.05
- ✅ normalizeTooltipOdds(null) = null
- ✅ normalizeTooltipOdds(0) = null
- ✅ compSchedules odds not scaled (winAllot < 10) — sample winAllot=3.35
- ✅ tooltip CHG_DTM status = UNVERIFIED_TIMESTAMP_FORMAT
- ✅ tooltip CHG_DTM parsedAt = null
- ✅ unknown betId → OTHER (unsupported)
- ✅ audit records = 850 (all rows traced) — got 850
- ✅ marketTypeBreakdown totals = normalizedMarkets — 850 vs 850
- ✅ handicap field (handi) is present for HANDICAP_2WAY rows
- ✅ parser works with reordered keys (canonical key stable)
- ✅ at least some markets are shortlistEligible — count=605
- ✅ tooltip GM_SEQ joins to market matchSeq (at least 30) — joined=139

## Remaining Unverified

- gmTs decode formula (single fixture, UNVERIFIED)
- tooltip CHG_DTM exact format (nanoseconds vs microseconds vs other)
- W_BET_CNT / D_BET_CNT / L_BET_CNT (UNVERIFIED_BET_AGGREGATE)
- DB round-trip (requires sql.js or alternative driver)
