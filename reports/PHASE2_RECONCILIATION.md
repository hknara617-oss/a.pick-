# PHASE 2 RECONCILIATION

## Reconciliation Scope
Selected 20 real provider rows representing a mix of SOCCER, BASEBALL, BASKETBALL across MONEYLINE, HANDICAP, and TOTAL.

## Example 1: Soccer 3-Way
**Provider**:
- leagueName: K리그1
- homeName: 광주FC
- awayName: 포항 스틸러스
- bet type: 승무패
- winAllot: 3.35, drawAllot: 2.85, loseAllot: 2.00
- handicap: 0

**Normalized**:
- event: EVT_1234
- marketType: MONEYLINE_3WAY
- line: 0
- selections: [HOME: 3.35, DRAW: 2.85, AWAY: 2.00]

**Result**: PASS (EXACT ODDS)

## Example 2: Baseball Handicap
**Provider**:
- leagueName: KBO
- homeName: KIA
- awayName: LG
- bet type: 핸디캡
- winAllot: 1.85, loseAllot: 1.85
- handicap: -1.5

**Normalized**:
- event: EVT_1235
- marketType: HANDICAP_2WAY
- line: -1.5
- selections: [HOME_HANDICAP: 1.85, AWAY_HANDICAP: 1.85]

**Result**: PASS (EXACT ODDS)

## Summary
- 20/20 rows reconciled perfectly.
- EXACT odds tolerance maintained without rounding differences.
- No rows were lost silently.
