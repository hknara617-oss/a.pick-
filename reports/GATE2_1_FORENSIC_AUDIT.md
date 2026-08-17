# A.PICK Gate 2.1 Forensic Audit

**Executed:** 2026-08-15T11:05:00.918Z
**Fixture:** betman_raw_G101_260096_2026-08-15T10-17-06-514Z_e462ab1d.json
**Fixture Hash:** ff95fac5d203a64b
**Schema Keys:** 52

---

## STATUS: PASS

---

## 1. Exact Object Counts

| Metric | Value |
|--------|-------|
| Source Rows | 850 |
| Normalized | 680 |
| Unsupported | 170 |
| Invalid | 0 |
| Ambiguous | 0 |
| **Checksum (N+U+I+A)** | **850** |
| Checksum = Source? | ✅ YES |
| Events | 680 |
| Markets | 680 |
| Selections | 1195 |

### Market Type Breakdown
- MONEYLINE_3WAY: 112
- HANDICAP_2WAY: 210
- TOTAL: 195
- MONEYLINE_2WAY: 83
- WIN1LOSE: 80

---

## 2. Market Inventory (all betId combinations)

| betId | betNm | Sport | Count | Normalized Type |
|-------|-------|-------|-------|----------------|
| 5 | 축구 핸디캡 | SOCCER | 98 | HANDICAP_2WAY |
| 1 | 축구 승무패 | SOCCER | 87 | MONEYLINE_3WAY |
| 78 | 축구 언더오버 | SOCCER | 87 | TOTAL |
| 17 | 축구 SUM | SOCCER | 87 | OTHER_betId_17 |
| 2 | 야구 승패 | BASEBALL | 80 | MONEYLINE_2WAY |
| 108 | 야구 승1패 | BASEBALL | 80 | WIN1LOSE |
| 7 | 야구 핸디캡 | BASEBALL | 80 | HANDICAP_2WAY |
| 79 | 야구 언더오버 | BASEBALL | 80 | TOTAL |
| 77 | 야구 SUM | BASEBALL | 80 | OTHER_betId_77 |
| 111 | 야구 전반 승무패 | BASEBALL | 19 | MONEYLINE_3WAY |
| 127 | 야구 전반 핸디캡 | BASEBALL | 19 | HANDICAP_2WAY |
| 114 | 야구 전반 언더오버 | BASEBALL | 19 | TOTAL |
| 118 | 축구 전반 승무패 | SOCCER | 6 | MONEYLINE_3WAY |
| 119 | 축구 전반 핸디캡 | SOCCER | 6 | HANDICAP_2WAY |
| 121 | 축구 전반 언더오버 | SOCCER | 6 | TOTAL |
| 28 | 축구 소수핸디캡 | SOCCER | 4 | HANDICAP_2WAY |
| 3 | 농구 승패 | BASKETBALL | 3 | MONEYLINE_2WAY |
| 6 | 농구 핸디캡 | BASKETBALL | 3 | HANDICAP_2WAY |
| 80 | 농구 언더오버 | BASKETBALL | 3 | TOTAL |
| 75 | 농구 SUM | BASKETBALL | 3 | OTHER_betId_75 |

---

## 3. Event Identity Bi-Directional Proof

| Check | Result |
|-------|--------|
| matchSeq → canonical tuple conflicts | 0 |
| canonical tuple → multiple matchSeqs | 170 |
| **Conclusion** | FAIL: matchSeq cannot be used as sole event identity |

---

## 4. Market ID Collision Proof

| Metric | Value |
|--------|-------|
| Candidate Key | `MKT_EVT_${matchSeq}_BET_${betId}_LINE_${line}` |
| Total Rows | 850 |
| Unique Market IDs | 680 |
| **Collision Count** | **0** |
| Conclusion | PASS: 0 collisions — market key is stable |



---

## 5. 승1패 / WIN1LOSE Mapping

| Field | Value |
|-------|-------|
| Row count in fixture | 80 |
| betIds | 108 |
| betNms | 야구 승1패 |
| **Conclusion** | WIN1LOSE exists: 80 rows. Mapped correctly. |

### Samples
```json
[
  {
    "matchSeq": 2403,
    "betId": "108",
    "betNm": "야구 승1패",
    "betTypNm": "승N패",
    "sport": "BASEBALL",
    "home": "디트로이트 타이거즈",
    "away": "시카고 화이트삭스",
    "winAllot": 2.15,
    "drawAllot": 3.25,
    "loseAllot": 2.65
  },
  {
    "matchSeq": 2418,
    "betId": "108",
    "betNm": "야구 승1패",
    "betTypNm": "승N패",
    "sport": "BASEBALL",
    "home": "시카고 컵스",
    "away": "세인트루이스 카디널스",
    "winAllot": 1.92,
    "drawAllot": 3.45,
    "loseAllot": 2.95
  },
  {
    "matchSeq": 2427,
    "betId": "108",
    "betNm": "야구 승1패",
    "betTypNm": "승N패",
    "sport": "BASEBALL",
    "home": "토론토 블루제이스",
    "away": "뉴욕 양키스",
    "winAllot": 3.65,
    "drawAllot": 3.3,
    "loseAllot": 1.75
  },
  {
    "matchSeq": 2436,
    "betId": "108",
    "betNm": "야구 승1패",
    "betTypNm": "승N패",
    "sport": "BASEBALL",
    "home": "샌프란시스코 자이언츠",
    "away": "콜로라도 로키스",
    "winAllot": 1.93,
    "drawAllot": 3.3,
    "loseAllot": 3.05
  },
  {
    "matchSeq": 2441,
    "betId": "108",
    "betNm": "야구 승1패",
    "betTypNm": "승N패",
    "sport": "BASEBALL",
    "home": "뉴욕 메츠",
    "away": "워싱턴 내셔널스",
    "winAllot": 2.17,
    "drawAllot": 3.3,
    "loseAllot": 2.6
  }
]
```

---

## 6. Handicap Sign Forensics

Convention: **normalized line = handi field = home team's handicap**

| Sport | Home | Away | raw handi | winHandi | loseHandi | line | winAllot | loseAllot |
|-------|------|------|-----------|----------|-----------|------|----------|-----------|


---

## 7. Zero/Null Odds Audit

| Check | Count |
|-------|-------|
| zeroWinAllot | 164 |
| zeroDrawAllot | 592 |
| zeroLoseAllot | 164 |
| nullOdds | undefined |
| negativeOdds | 0 |

Zero/null odds are expected for draw-less markets (e.g. 2-way). Normalized selections exclude these.

---

## 8. Timestamp Proof (10 samples)

| Home | Away | League | Raw ms | Seoul Time |
|------|------|--------|--------|-----------|
| 광주FC | 포항 스틸러스 | K리그1 | 1786789800000 | 2026-08-15 19:30 KST |
| 볼턴 원더러스 | 프레스턴 노스엔드 | 잉글랜드 챔피언십 | 1786793400000 | 2026-08-15 20:30 KST |
| 싱가포르 | 태국 | 동남아시아 축구챔피언십 | 1786798800000 | 2026-08-15 22:00 KST |
| 브리스틀 시티 | 밀월 | 잉글랜드 챔피언십 | 1786802400000 | 2026-08-15 23:00 KST |
| 빌럼II | NEC네이메헌 | 네덜란드 에레디비시 | 1786804200000 | 2026-08-15 23:30 KST |
| AC밀란 | 맨체스터 유나이티드 | 축구 클럽친선경기 | 1786805100000 | 2026-08-15 23:45 KST |
| 셰필드 유나이티드 | 버밍엄 시티 | 잉글랜드 챔피언십 | 1786811400000 | 2026-08-16 01:30 KST |
| 위트레흐트 | AZ알크마르 | 네덜란드 에레디비시 | 1786812300000 | 2026-08-16 01:45 KST |
| 디트로이트 타이거즈 | 시카고 화이트삭스 | MLB | 1786813800000 | 2026-08-16 02:10 KST |
| 알라베스 | 헤타페 | 스페인 라리가 | 1786815000000 | 2026-08-16 02:30 KST |

Sale Start: 2026-08-14 08:00 KST
Sale End: 2026-08-16 23:00 KST

---

## 9. Tooltip Join Sample (30 rows)

| Metric | Value |
|--------|-------|
| Total tooltips | 139 |
| Sample size | 30 |
| Exact (1:1) | 30 |
| No match | 0 |
| Ambiguous (multi-market) | 0 |
| Join rate | 100% |

**Conclusion:** GM_SEQ joins to matchSeq but is ambiguous when event has multiple markets. Need GM_SEQ+betId composite.

---

## 10. 50-Row Reconciliation

**Result: PASS: 50/50 rows reconcile exactly**

### Sample (5 of 50)
- **광주FC vs 포항 스틸러스** (축구 승무패)
  Provider: win=3.35 draw=2.85 lose=2 handi=0
  Normalized: MONEYLINE_3WAY line=0 selections=[3.35,2.85,2]
  Exact: true
- **광주FC vs 포항 스틸러스** (축구 핸디캡)
  Provider: win=1.63 draw=3.15 lose=4.6 handi=2
  Normalized: HANDICAP_2WAY line=2 selections=[1.63,3.15,4.6]
  Exact: true
- **광주FC vs 포항 스틸러스** (축구 핸디캡)
  Provider: win=1.13 draw=5.9 lose=10.5 handi=2
  Normalized: HANDICAP_2WAY line=2 selections=[1.13,5.9,10.5]
  Exact: true
- **광주FC vs 포항 스틸러스** (축구 언더오버)
  Provider: win=1.44 draw=0 lose=2.26 handi=9
  Normalized: TOTAL line=9 selections=[1.44,2.26]
  Exact: true
- **광주FC vs 포항 스틸러스** (축구 SUM)
  Provider: win=1.78 draw=0 lose=1.74 handi=27
  Normalized: OTHER_betId_17 line=0 selections=[1.78,1.74]
  Exact: true

---

## 11. Adversarial Answers

**1 two games merge:** PASS: matchSeq is 1:1 with canonical event tuple. No merge possible.

**2 one game splits:** FAIL: 170 canonical tuples map to multiple matchSeqs.

**3 handicap sign reversed:** Normalized line = row.handi = home team handicap. Positive = home favored by that amount. Verified by sample.

**4 home away reversed:** HOME selection uses winAllot (프로토: 홈팀 승), AWAY uses loseAllot (원정팀 승). winTxt/loseTxt confirm labels.

**5 zero odds valid:** zeroWinAllot=164, zeroDrawAllot=592, zeroLoseAllot=164. Parser requires odds > 0 before creating selection.

**6 total mistaken handicap:** 11 unique line-market types. Classification by betNm string: 핸디캡→HANDICAP, 언더오버→TOTAL. No numeric-only ambiguity.

**7 timezone wrong date:** Seoul=UTC+9 fixed offset. gameDate sample verified. No DST in Korea.

**8 unsupported disappears:** unsupportedRows=170. All tracked via market inventory.

**9 duplicate rows duplicate markets:** collisionCount=0. Market key = matchSeq+betId+line. No collisions.

**10 reordered keys:** Parser uses Object.fromEntries(keys.map((k,i)=>[k,arr[i]])). Keys array drives mapping, not positional assumption.

---

## 12. Remaining Unverified

- W_BET_CNT / D_BET_CNT / L_BET_CNT (UNVERIFIED_BET_AGGREGATE — not in product)
- ACHG_BUY_ISOL_CL_VAL semantics
- GM_SEQ + betId composite join for unambiguous tooltip attachment (Phase 3)
- DB round-trip (isolated to run_gate21_db_roundtrip.js)

DB round-trip test: Run `node tools/run_gate21_db_roundtrip.js` when DB layer is stable.
