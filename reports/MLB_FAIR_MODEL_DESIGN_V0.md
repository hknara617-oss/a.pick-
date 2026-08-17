# MLB Fair Model Design Gate v0

> **SHADOW / NOT CALIBRATED / DO NOT USE AS PICK**  
> **실행시각:** 2026. 8. 17. PM 1:18:46

---

## A.PICK MLB FAIR MODEL DESIGN GATE

```
STATUS: SHADOW RUN COMPLETE — NO HISTORICAL CALIBRATION YET
```

### MODEL FORM

Log-odds: `L_raw = logit(P_market) + D_starter + D_offense + D_bullpen(=0) + D_rest(=0) + D_park(=0)`  
`P_raw = sigmoid(L_raw)` → global cap ±0.5 logits  
`P_final = P_market + confidence × (P_raw - P_market)`

### STARTER

- Z-score: 0.60×ERA_z + 0.40×WHIP_z, each normalized vs MLB avg (ERA=4.17, WHIP=1.303)
- Sample shrinkage: reliability = min(1, IP/150). ERA at 10IP ≠ ERA at 120IP
- Season 75% + recent 25% (with additional IP-based shrinkage on recent)
- UNKNOWN → delta=0, uncertainty ×0.30~0.60 depending on which side
- Coefficient: 0.25 logits/Z-unit | Cap: ±0.40 logits ≈ ±9.4%p at 50%

### OFFENSE

- Primary: OPS (70%) | Supplemental: BB rate (15%), K rate (15%)
- Non-duplicative: OBP/SLG not added separately (captured in OPS)
- Normalized vs league OPS=0.719 (std=0.022)
- Coefficient: 0.10 logits/Z-unit | Cap: ±0.20 logits ≈ ±4.8%p at 50%
- **Limitation: NO_HAND_SPLIT — v0 season aggregate only**

### BULLPEN

- **D_bullpen = 0** — team ERA proxy excluded. Not a verified reliever-only metric.
- Missing bullpen data contributes to uncertainty score only, not fair probability.
- Next step: build playerPool=BULLPEN endpoint or Savant reliever split.

### UNCERTAINTY

- Base confidence = 0.70 (v0 unvalidated ceiling)
- Multipliers: starter status (0.30/0.60/1.00), IP sample (0.50→1.00 linear), offense (0.85/1.00)
- UNKNOWN starter → shrinkage, NOT a penalty to P_raw
- Missing injury/park: explicit null, no false assumption

### CAPS

| Module | Logit cap | ≈ %p at p=0.50 |
|--------|-----------|----------------|
| Starter | ±0.40 | ±9.4%p |
| Offense | ±0.20 | ±4.8%p |
| Bullpen | 0 (blocked) | 0 |
| Rest | 0 (not implemented) | 0 |
| Park | 0 (not implemented) | 0 |
| **Global** | **±0.50** | **±11.8%p** |

### BACKTEST PLAN

1. Probe gmTs 260096→260001 for available historical Betman rounds
2. For each round: re-fetch statsapi data AS OF that date (time-leakage defense: use gameDate)
3. Match results from MLB API (linescore/boxscore after game)
4. Minimum target: 200 MLB games (prefer 500+)
5. Time-based split: earlier = calibration, later = validation. No shuffle.
6. Metrics: Brier score, log loss, calibration buckets, ROI at threshold ranges
7. Baseline: Model 0 = market only → Model 1 = +starter → Model 2 = +offense → ...

### CURRENT SHADOW RUN (260097)

- Games: 10
- Market no-vig range: 30.14% – 68.78%
- Final fair prob range: 1.00% – 71.51%
- Max |info edge| vs market: 5.31%p

### SHADOW TABLE

> All values SHADOW. Information edge ≠ betting edge (see column definitions).

| 경기 | mktH% | starterΔ(logit) | offenseΔ(logit) | rawFair% | conf% | finalFair% | infoEdge | betEdgeH | EV_H | ⚠ |
|------|------|---------------|----------------|---------|------|-----------|---------|---------|------|----|
| St. Louis Cardinals @ Cincinnati Reds | 50.28% | +0 | -0.0254 | 49.65% | 21% | 50.15% | -0.13% | -6.99% | -12.2% |  |
| Baltimore Orioles @ Tampa Bay Rays | 59.45% | +0.0727 | +0.0873 | 63.24% | 57% | 61.61% | +2.16% | -5.96% | -8.8% | ⚠ |
| Miami Marlins @ Philadelphia Phillies | 68.78% | +0.3226 | -0.0758 | 73.82% | 54% | 71.51% | +2.73% | -6.61% | -8.5% | ⚠ |
| Detroit Tigers @ Pittsburgh Pirates | 47.03% | +0.0494 | +0.0396 | 49.25% | 57% | 48.29% | +1.27% | -5.18% | -9.7% | ⚠ |
| San Diego Padres @ New York Mets | 53.95% | +0.3087 | -0.0407 | 60.5% | 60% | 57.91% | +3.95% | -3.44% | -5.6% | ⚠ |
| Arizona Diamondbacks @ Boston Red Sox | 55.06% | +0 | -0.0163 | 54.65% | 25% | 54.95% | -0.1% | -7.55% | -12.1% |  |
| Atlanta Braves @ Minnesota Twins | 46.61% | -0.2018 | +0.003 | 41.71% | 57% | 43.82% | -2.79% | -9.09% | -17.2% |  |
| Athletics @ Kansas City Royals | 59.84% | +0.2647 | -0.0498 | 64.87% | 43% | 62% | +2.17% | -6.03% | -8.9% | ⚠ |
| Chicago White Sox @ Chicago Cubs | 59.45% | +0.2605 | +0.1283 | 68.38% | 60% | 64.77% | +5.31% | -2.8% | -4.2% | ⚠ |
| Los Angeles Dodgers @ Colorado Rockies | 30.14% | +0.0043 | -0.1049 | 28.07% | 36% | 29.39% | -0.76% | -4.86% | -14.2% |  |

---

### ACCEPTANCE GATE

| 항목 | 결과 |
|------|------|
| mathTests | ✅ PASS |
| marketPriorExplicit | ✅ PASS |
| logitImplemented | ✅ PASS |
| starterShrunk | ✅ PASS |
| offenseNonDuplicate | ✅ PASS |
| bullpenExcluded | ✅ PASS |
| missingIncreasesUncertainty | ✅ PASS |
| shrinkageToMarket | ✅ PASS |
| edgesDistinct | ✅ PASS |
| evCorrect | ✅ PASS |
| noPicks | ✅ PASS |
| shadowLabeled | ✅ PASS |
| backtestSpecified | ✅ PASS |
| noTemporalLeak | ✅ PASS |

---

### REMAINING UNVERIFIED

- Bullpen reliever-only ERA/WHIP/workload (D_bullpen blocked)
- Pitcher handedness field (/people/{id} call needed)
- Park factor lookup table (Coors Field priority)
- Rest/travel data
- All coefficients (starter 0.25, offense 0.10) — not calibrated, design-only
- Historical backtest (needed before any real picks)

### DO NOT GENERATE PICKS. STOP.
