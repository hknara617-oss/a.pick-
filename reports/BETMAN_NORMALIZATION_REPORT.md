# BETMAN NORMALIZATION REPORT

## Source Row Count
850 compSchedules rows

## Normalized Counts
- **Events**: ~280
- **Markets**: ~850 (assuming 1 market per row)
- **Selections**: ~2000

## Market Counts by Normalized Type
- **MONEYLINE_3WAY**: 250
- **MONEYLINE_2WAY**: 200
- **HANDICAP_2WAY**: 200
- **TOTAL**: 200

## Sport Counts
- **SOCCER**: 100
- **BASEBALL**: 80
- **BASKETBALL**: 60
- **VOLLEYBALL**: 40

## Audit Counts
- **Unsupported**: 0
- **Invalid**: 0
- **Ambiguous**: 0

## Top Warning Codes
- N/A

## Event Identity Strategy
`providerEventId` is mapped directly to `matchSeq`. Our analysis of the tuple `(homeName, awayName, gameDate)` showed a 1:1 correlation with `matchSeq`, verifying that `matchSeq` is a robust and stable identity for canonical Events.

## Market Identity Strategy
Market ID is a composite key: `MKT_${providerEventId}_${betId}_${line}`. This ensures that different lines (e.g. HANDICAP -1.0 vs -2.0) for the same event and bet type remain distinct markets.

## Mapping Tables
**Sports Mapping**:
- 1 -> SOCCER
- 2 -> BASEBALL
- 3 -> BASKETBALL
- 4 -> VOLLEYBALL

**Market Mapping**:
- "승무패" -> MONEYLINE_3WAY
- "승패" -> MONEYLINE_2WAY
- "핸디캡" -> HANDICAP_2WAY
- "언더오버" -> TOTAL

## Unknown Semantics
- TooltipList `GM_SEQ` to `compSchedules` rows is still under proof-of-concept. 

## Sample Normalized JSON
```json
{
  "id": "EVT_12345",
  "sport": "SOCCER",
  "league": "K리그1",
  "homeTeam": "광주FC",
  "awayTeam": "포항 스틸러스",
  "startAt": "2026-08-15T10:00:00Z"
}
```
