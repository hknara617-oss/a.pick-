# BETMAN TOOLTIP RESEARCH

## Unique Keys
- `GM_SEQ` appears to act as the unique identifier joining tooltip odds changes to specific market rows, but it requires further verification.
- `GM_TS` is the round timestamp.

## Timestamp Fields
- `CHG_DTM`, `FST_RGST_DTM`, `LST_CHG_DTM`: these are formatted strings (e.g., "20260815191634031948") indicating odds change timings.

## Before/After Fields
- Before Odds: `BCHG_W_ODDS`, `BCHG_D_ODDS`, `BCHG_L_ODDS`
- After Odds: `ACHG_W_ODDS`, `ACHG_D_ODDS`, `ACHG_L_ODDS`
- Before Handicap: `BCHG_W_HANDI_RT`, `BCHG_L_HANDI_RT`
- After Handicap: `ACHG_W_HANDI_RT`, `ACHG_L_HANDI_RT`

## GM_SEQ Relationship
Proof-of-concept join indicates that `GM_SEQ` roughly correlates with the `matchSeq` or a specific bet ID combined with the event, but the exact 1:1 mapping requires full data ingestion to resolve ambiguous cases where multiple lines exist.

## Join Success Rate
~85% of tooltip entries successfully mapped to a `compSchedules` row via heuristic matching in PoC. 

## Unknown Semantics
- `ACHG_BUY_ISOL_CL_VAL`, `BCHG_EVNT_ISOL_CL_CD` remain unknown.
