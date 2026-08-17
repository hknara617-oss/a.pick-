# BETMAN_CONNECTOR_REPORT
**A.PICK v6 — Phase 1 / Gate 1**
Generated: 2026-08-15T10:17:05Z (Asia/Seoul: 2026-08-15 19:17 KST)

---

## 1. Request Method & Authentication

| Item | Result |
|------|--------|
| Method | POST |
| Endpoint | `https://www.betman.co.kr/buyPsblGame/gameInfoInq.do` |
| Content-Type | `application/json; charset=UTF-8` |
| **Minimum Required Level** | **A — POST + JSON only** |
| Session Cookie Required | **NO** |
| Auth / Login Redirect | **NOT detected** |
| Personal credentials used | **NONE** |

All three request levels passed with HTTP 200 and identical response content.
No CAPTCHA, no login wall, no redirect detected.

```
TEST A  POST + JSON only                    → PASS  372ms
TEST B  POST + JSON + X-Requested-With      → PASS  225ms
TEST C  POST + JSON + Origin + Referer      → PASS  241ms
```

**Minimum request level: A.**
Only `Content-Type: application/json; charset=UTF-8` is strictly required.

---

## 2. Response Structure

Top-level keys confirmed present:

| Key | Present | Description |
|-----|---------|-------------|
| `currentLottery` | ✅ | Round metadata |
| `compSchedules` | ✅ | Market schedule data (keys + rows) |
| `tooltipList` | ✅ | Historical odds change entries |

Additional top-level keys discovered (not in harness spec):

```
noticeListCount, gmTs, availableBuyAmount, voteStatus,
rsMsg, gameNoticeList, caution, sportsItemList
```

These must be preserved in `rawMetadata` and monitored for schema drift.

---

## 3. currentLottery

```json
{
  "gmId": "G101",
  "gmTs": 260096,
  "saleStartDate": 1786662000000,
  "saleEndDate":   1786888800000
}
```

**Critical findings:**
- `lotteryName` and `lotteryStatus` fields were **absent** from the response.
  The harness spec assumed these exist. Phase 2 normalizer must handle missing fields defensively.
- `saleStartDate` / `saleEndDate` are **Unix timestamps in milliseconds** (not ISO strings).
  Requires `new Date(ms)` conversion and Asia/Seoul timezone handling.
- `gmTs = 260096` maps to year=2026, round=96 (observed pattern: `26` + `0096`). Exact encoding TBD in Phase 2.

---

## 4. compSchedules Schema

**Row count: 850**
**Schema hash: `b9b62238d8247458`** (SHA-256 of sorted keys, first 16 chars)

### Full Discovered Keys (53 fields)

```
itemCode        itemName        gameName        gameDate
endDate         unsetEndDate    leagueCode      leagueName
leagueShortName domastic        managedLeague   meetStadiumFullName
matchSeq        homeId          awayId          homeName
awayName        winTxt          winAllot        drawTxt
drawAllot       loseTxt         loseAllot       handi
winHandi        drawHandi       loseHandi       neutral
noticeNo        gameReject      buyReject       protoStatus
gameResult      gameSubject     live            sgl
unsetSchedule   mchScore        betId           betNm
betTypId        betTypNm        prlYn           grndsYn
grndsList       relatedGmYn     gameKey         natId
lngtrYn         wlTypClCd       matchSportId    sortSeq
```

### Required Keys Check

| Field | Status |
|-------|--------|
| `itemCode` | ✅ present |
| `gameName` | ✅ present |
| `gameDate` | ✅ present |
| `leagueName` | ✅ present |
| `homeName` | ✅ present |
| `awayName` | ✅ present |
| `matchSeq` | ✅ present |

**All 7 required fields present. 0 missing.**

### ⚠️ Critical Harness Correction: Odds Field Names

The harness spec used `winOdds / drawOdds / loseOdds`.
**Actual field names are `winAllot / drawAllot / loseAllot`.**

The Phase 1 sanitizer in probe.ts was written with the wrong field names and did not sanitize correctly. Phase 2 fix required. Raw fixture is preserved intact.

### Market Type Identification

Markets for the same fixture are **separate rows** with different `matchSeq` and `betId`:

| `betId` | `betNm` | `betTypNm` | A.PICK MarketType |
|---------|---------|------------|-------------------|
| `1` | 축구 승무패 | 승무패 | `MONEYLINE_3WAY` |
| `5` | 축구 핸디캡 | 일반 정수핸디캡 | `HANDICAP_3WAY` |
| (others TBD) | | | 언더오버, 야구 etc. |

**Each row = one market.** Multiple rows share the same fixture but differ in `betId`/`matchSeq`.

### Event Grouping Key

Events must be grouped by: `homeId + awayId + gameDate + leagueCode`
(NOT by `matchSeq` alone — matchSeq is market-level, not event-level)

The `gameKey` field (e.g. `"광주FC:포항스틸"`) is a Betman convenience key — usable as a secondary hint only.

---

## 5. Sample Normalized Rows

### Row 1 — 축구 승무패 (3-way moneyline)
```json
{
  "leagueName": "K리그1",
  "homeName": "광주FC",
  "awayName": "포항 스틸러스",
  "gameDate": 1786789800000,
  "betNm": "축구 승무패",
  "matchSeq": 2308,
  "winAllot": 3.35,
  "drawAllot": 2.85,
  "loseAllot": 2.00,
  "handi": 0,
  "matchSportId": 1,
  "domastic": true
}
```

### Row 2 — 축구 핸디캡 (handicap, same fixture)
```json
{
  "leagueName": "K리그1",
  "homeName": "광주FC",
  "awayName": "포항 스틸러스",
  "gameDate": 1786789800000,
  "betNm": "축구 핸디캡",
  "matchSeq": 2309,
  "winAllot": 1.63,
  "drawAllot": 3.15,
  "loseAllot": 4.60,
  "handi": 2,
  "winHandi": 1,
  "drawHandi": -1,
  "loseHandi": -1,
  "matchSportId": 1,
  "domastic": true
}
```

---

## 6. tooltipList

- 139 entries present
- Structure: array of objects (already key-value, NOT keys+rows format)
- Contents: odds change history per match/market
- **Not yet fully decoded** — Phase 3 will parse and map to `OddsHistory` with `source: PROVIDER_HISTORY`

---

## 7. Fixtures Saved

```
fixtures/betman_raw_G101_260096_2026-08-15T10-17-06-514Z_e462ab1d.json
fixtures/betman_sanitized_G101_260096_2026-08-15T10-17-06-514Z_e462ab1d.json
```

No PII detected in response. Raw fixture preserved as-is.

> ⚠️ Sanitized fixture has incorrect odds field substitution (probe.ts used `winOdds` pattern; actual is `winAllot`). Odds values remain unsanitized in the sanitized file. Phase 2 fix required. Raw fixture is authoritative.

---

## 8. Phase 2 Pre-Conditions & Action Items

| # | Item | Priority |
|---|------|----------|
| 1 | Odds fields: `winAllot/drawAllot/loseAllot` (not `winOdds`) | **CRITICAL** |
| 2 | `saleStartDate/saleEndDate` are Unix ms timestamps | **CRITICAL** |
| 3 | `lotteryName` and `lotteryStatus` absent — map Round.saleStatus from `protoStatus` or other field | HIGH |
| 4 | Event grouping: group by `homeId+awayId+gameDate+leagueCode` | HIGH |
| 5 | `gmTs` decode: `260096` → year=2026, round=96 — verify algorithm | HIGH |
| 6 | `matchSportId` → A.PICK `Sport` enum (1=FOOTBALL, others TBD) | MEDIUM |
| 7 | `betId` → `MarketType` mapping table | MEDIUM |
| 8 | `sportsItemList` and other top-level keys — inspect structure | MEDIUM |
| 9 | Fix probe.ts sanitizer: use `winAllot/drawAllot/loseAllot` patterns | LOW |
| 10 | `tooltipList` decode for OddsHistory | LOW (Phase 3) |

---

## 9. Unit Tests

| Test | Result |
|------|--------|
| BetmanParser: parses valid response | ✅ PASS |
| BetmanParser: extracts compSchedules keys | ✅ PASS |
| BetmanParser: parses rows via keys[]+values[] | ✅ PASS |
| BetmanParser: preserves Korean team names | ✅ PASS |
| BetmanParser: parses tooltipList | ✅ PASS |
| BetmanParser: fails gracefully on invalid JSON | ✅ PASS |
| BetmanParser: fails gracefully on empty string | ✅ PASS |
| BetmanParser: fails on array top-level | ✅ PASS |
| BetmanParser: detects unknown top-level keys | ✅ PASS |
| BetmanValidator: validates a valid response | ✅ PASS |
| BetmanValidator: schema hash stable for same keys | ✅ PASS |
| BetmanValidator: schema hash changes when keys change | ✅ PASS |
| BetmanValidator: rejects non-array keys | ✅ PASS |
| BetmanValidator: required keys present | ✅ PASS |
| BetmanValidator: required keys missing detection | ✅ PASS |

**15 / 15 PASS**

---

## 10. Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Betman endpoint is not a published public API — terms of use apply | HIGH | Legal review before production. Phase 1 is engineering validation only. |
| Schema can change without notice | HIGH | Schema drift detector (hash check) — implement in Phase 3 |
| `gmTs` encoding algorithm not confirmed | MEDIUM | Decode by inspecting across multiple rounds |
| 850 rows per call — grouping logic critical | MEDIUM | Implement and test event grouping in Phase 2 |
| `tooltipList` structure not fully decoded | LOW | Phase 3 |
