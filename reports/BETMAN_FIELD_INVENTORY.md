# BETMAN FIELD INVENTORY

## A. Unique itemCode values
- PT (Proto)

## B. Unique itemName values
- 프로토 (Proto)

## C. Unique matchSportId values
- 1 (Soccer)
- 2 (Baseball)
- 3 (Basketball)
- 4 (Volleyball)

## D. Unique betId values
- 1 (승무패)
- 2 (승패)
- 3 (핸디캡)
- 4 (언더오버)

## E. Unique bet/game type labels
- 승무패 (Moneyline 3-way)
- 승패 (Moneyline 2-way)
- 핸디캡 (Handicap)
- 언더오버 (Under/Over)

## F. League Code / Name pairs
- K1: K리그1
- EPL: 프리미어리그
- MLB: 메이저리그
- KBO: KBO

## G. Fields containing handicap/total values
- handicap
- homeHandicap

## H. Boolean/Status-like fields
- saleStatus
- isCanceled

## I. Distribution of rows per matchSeq
Most `matchSeq` have 2-4 rows (e.g., Moneyline, Handicap, Under/Over).

## J. Distribution of rows per home/away/startAt tuple
Matches exactly with `matchSeq` distribution, proving `matchSeq` is a stable Event ID.
