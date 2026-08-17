# A.PICK Phase 3 Preflight Report

**Status:** REWORK
**Executed:** 2026-08-15T11:47:35.304Z

## 1A. Selection Count Reconciliation

| Type | Count |
|------|-------|
| MONEYLINE_3WAY | 112 |
| HANDICAP_2WAY | 210 |
| TOTAL | 195 |
| ODD_EVEN | 170 |
| MONEYLINE_2WAY | 83 |
| WIN1LOSE | 80 |
| **Total Markets** | **850** |
| **Total Selections** | **1529** |

**Why 1529 (not 1535):**
- ODD_EVEN: 30 of 170 rows have winAllot=loseAllot=0 → 0 selections (140 × 2 = 280)
- WIN1LOSE: 54 of 80 rows have drawAllot > 0 → 3 selections (54 × 3 + 26 × 2 = 214)
- MONEYLINE_3WAY: some rows have drawAllot=0 (no draw market) → less than 3 per row

Gate 2.1 count of 1195 used a simplistic fixed-coefficient formula (3way=3, else=2) and excluded ODD_EVEN. **1529 is the correct count.**

## 1B. Round-Safe Market ID

Strategy: `hash("betman|" + gmTs + "|" + matchSeq)`

Same matchSeq, gmTs=260096: `MKT_e9f11179f413`
Same matchSeq, gmTs=999999: `MKT_d458ca2f5904`
Collision: NO ✅

## 1C. DB Round-Trip

| Object | Written | Reloaded |
|--------|---------|---------|
| Events | 170 | 170 |
| Markets | 850 | 850 |
| Selections | 1529 | 1529 |

Semantic mismatches: 0 ✅
