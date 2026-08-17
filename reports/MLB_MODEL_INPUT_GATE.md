# MLB Model Input Gate — Phase A

> **실행시각:** 2026. 8. 17. PM 1:07:49
> **목적:** Phase A 데이터 파운데이션 검증 — 픽 생성 금지

---

## Acceptance Gate

| 항목 | 결과 |
|------|------|
| Betman MLB games correctly identified | ✅ PASS |
| Batting endpoint works | ✅ PASS |
| Probable starter adapter works | ✅ PASS |
| Bullpen inputs exist | ✅ PASS |
| Vig math tests pass | ✅ PASS |
| All probabilities normalized | ✅ PASS |
| Feature snapshots assembled | ✅ PASS |
| Missing data explicitly represented | ✅ PASS |
| No fair probabilities calculated | ✅ PASS |
| No picks generated | ✅ PASS |

**총 10/10**

---

## Games Found

- Betman MLB 승패 (priced, status=2): **10경기**
- MLB API 매칭 성공: **10경기**

---

## Market Prior — No-Vig Probabilities

> PROVIDER FACT — Betman JSON 직접 추출 + 수학 계산

| 경기 | homeOdds | awayOdds | overround | noVigHome | noVigAway |
|------|---------|---------|----------|----------|----------|
| St. Louis Cardinals @ Cincinnati Reds | 1.75 | 1.77 | 113.64% | 50.28% | 49.72% |
| Baltimore Orioles @ Tampa Bay Rays | 1.48 | 2.17 | 113.65% | 59.45% | 40.55% |
| Miami Marlins @ Philadelphia Phillies | 1.28 | 2.82 | 113.59% | 68.78% | 31.22% |
| Detroit Tigers @ Pittsburgh Pirates | 1.87 | 1.66 | 113.72% | 47.03% | 52.97% |
| San Diego Padres @ New York Mets | 1.63 | 1.91 | 113.71% | 53.95% | 46.05% |
| Arizona Diamondbacks @ Boston Red Sox | 1.6 | 1.96 | 113.52% | 55.06% | 44.94% |
| Atlanta Braves @ Minnesota Twins | 1.89 | 1.65 | 113.52% | 46.61% | 53.39% |
| Athletics @ Kansas City Royals | 1.47 | 2.19 | 113.69% | 59.84% | 40.16% |
| Chicago White Sox @ Chicago Cubs | 1.48 | 2.17 | 113.65% | 59.45% | 40.55% |
| Los Angeles Dodgers @ Colorado Rockies | 2.92 | 1.26 | 113.61% | 30.14% | 69.86% |

---

## Starters

> EXTERNAL SPORTS DATA (statsapi.mlb.com)

| 경기 | 홈선발 | status | ERA | WHIP | IP | 원정선발 | status | ERA | WHIP | IP |
|------|-------|--------|-----|------|----|--------|--------|-----|------|----|
| St. Louis Cardinals @ Cincinnati Reds | — | UNKNOWN | null | null | null | — | UNKNOWN | null | null | null |
| Baltimore Orioles @ Tampa Bay Rays | Shane McClanahan | CONFIRMED | 3.09 | 1.12 | 99.0 | Brandon Young | CONFIRMED | 3.33 | 1.32 | 113.2 |
| Miami Marlins @ Philadelphia Phillies | Cristopher Sánchez | CONFIRMED | 2.54 | 1.19 | 155.2 | Janson Junk | CONFIRMED | 4.41 | 1.32 | 87.2 |
| Detroit Tigers @ Pittsburgh Pirates | Carmen Mlodzinski | CONFIRMED | 3.79 | 1.40 | 99.2 | Framber Valdez | CONFIRMED | 4.26 | 1.39 | 133.0 |
| San Diego Padres @ New York Mets | Nolan McLean | CONFIRMED | 3.42 | 1.13 | 136.2 | Walker Buehler | CONFIRMED | 4.88 | 1.43 | 114.1 |
| Arizona Diamondbacks @ Boston Red Sox | — | UNKNOWN | null | null | null | Mitch Bratt | CONFIRMED | 3.74 | 1.40 | 33.2 |
| Atlanta Braves @ Minnesota Twins | Bailey Ober | CONFIRMED | 4.64 | 1.23 | 99.0 | Martín Pérez | CONFIRMED | 2.96 | 1.15 | 106.1 |
| Athletics @ Kansas City Royals | Michael Wacha | CONFIRMED | 3.46 | 1.15 | 150.2 | Mason Barnett | CONFIRMED | 6.16 | 1.45 | 38.0 |
| Chicago White Sox @ Chicago Cubs | Shota Imanaga | CONFIRMED | 3.74 | 1.10 | 137.1 | Luis Castillo | CONFIRMED | 4.96 | 1.35 | 110.2 |
| Los Angeles Dodgers @ Colorado Rockies | Tomoyuki Sugano | CONFIRMED | 4.43 | 1.25 | 113.2 | Blake Snell | CONFIRMED | 5.00 | 1.33 | 9.0 |

*선발 최근 3경기 로그는 JSON 파일 참조*

---

## Team Batting

> EXTERNAL SPORTS DATA (statsapi.mlb.com — team level)

| 팀 | AVG | OBP | SLG | OPS |
|---|---|---|---|---|
| 홈: Cincinnati Reds/St. Louis Cardinals | .226 | .306 | .393 | .699 |
| 원정: Cincinnati Reds/St. Louis Cardinals | .240 | .316 | .382 | .698 |
| 홈: Tampa Bay Rays/Baltimore Orioles | .261 | .331 | .407 | .738 |
| 원정: Tampa Bay Rays/Baltimore Orioles | .237 | .321 | .397 | .718 |
| 홈: Philadelphia Phillies/Miami Marlins | .239 | .310 | .401 | .711 |
| 원정: Philadelphia Phillies/Miami Marlins | .250 | .326 | .403 | .729 |
| 홈: Pittsburgh Pirates/Detroit Tigers | .257 | .333 | .412 | .745 |
| 원정: Pittsburgh Pirates/Detroit Tigers | .242 | .319 | .408 | .727 |
| 홈: New York Mets/San Diego Padres | .236 | .307 | .390 | .697 |
| 원정: New York Mets/San Diego Padres | .238 | .314 | .390 | .704 |
| 홈: Boston Red Sox/Arizona Diamondbacks | .248 | .320 | .400 | .720 |
| 원정: Boston Red Sox/Arizona Diamondbacks | .244 | .316 | .399 | .715 |
| 홈: Minnesota Twins/Atlanta Braves | .245 | .320 | .406 | .726 |
| 원정: Minnesota Twins/Atlanta Braves | .247 | .312 | .418 | .730 |
| 홈: Kansas City Royals/Athletics | .242 | .310 | .393 | .703 |
| 원정: Kansas City Royals/Athletics | .244 | .318 | .402 | .720 |
| 홈: Chicago Cubs/Chicago White Sox | .248 | .337 | .417 | .754 |
| 원정: Chicago Cubs/Chicago White Sox | .240 | .318 | .412 | .730 |
| 홈: Colorado Rockies/Los Angeles Dodgers | .254 | .323 | .420 | .743 |
| 원정: Colorado Rockies/Los Angeles Dodgers | .259 | .335 | .427 | .762 |

---

## Bullpen

> EXTERNAL SPORTS DATA — 팀 ERA 기반 근사값. 실제 불펜 split 미지원.

| 팀 | ERA(근사) | confidence | notes |
|---|---|---|---|
| Cincinnati Reds | 4.51 | MEDIUM | Team-level ERA (starters+bullpen combined) — true bullpen split unavailable |
| St. Louis Cardinals | 4.04 | MEDIUM | Team-level ERA (starters+bullpen combined) — true bullpen split unavailable |
| Tampa Bay Rays | 3.76 | MEDIUM | Team-level ERA (starters+bullpen combined) — true bullpen split unavailable |
| Baltimore Orioles | 4.21 | MEDIUM | Team-level ERA (starters+bullpen combined) — true bullpen split unavailable |
| Philadelphia Phillies | 4.16 | MEDIUM | Team-level ERA (starters+bullpen combined) — true bullpen split unavailable |
| Miami Marlins | 3.92 | MEDIUM | Team-level ERA (starters+bullpen combined) — true bullpen split unavailable |
| Pittsburgh Pirates | 4.31 | MEDIUM | Team-level ERA (starters+bullpen combined) — true bullpen split unavailable |
| Detroit Tigers | 3.55 | MEDIUM | Team-level ERA (starters+bullpen combined) — true bullpen split unavailable |
| New York Mets | 4.09 | MEDIUM | Team-level ERA (starters+bullpen combined) — true bullpen split unavailable |
| San Diego Padres | 4.08 | MEDIUM | Team-level ERA (starters+bullpen combined) — true bullpen split unavailable |
| Boston Red Sox | 3.52 | MEDIUM | Team-level ERA (starters+bullpen combined) — true bullpen split unavailable |
| Arizona Diamondbacks | 4.09 | MEDIUM | Team-level ERA (starters+bullpen combined) — true bullpen split unavailable |
| Minnesota Twins | 4.67 | MEDIUM | Team-level ERA (starters+bullpen combined) — true bullpen split unavailable |
| Atlanta Braves | 3.64 | MEDIUM | Team-level ERA (starters+bullpen combined) — true bullpen split unavailable |
| Kansas City Royals | 4.78 | MEDIUM | Team-level ERA (starters+bullpen combined) — true bullpen split unavailable |
| Athletics | 5.45 | MEDIUM | Team-level ERA (starters+bullpen combined) — true bullpen split unavailable |
| Chicago Cubs | 4.16 | MEDIUM | Team-level ERA (starters+bullpen combined) — true bullpen split unavailable |
| Chicago White Sox | 4.11 | MEDIUM | Team-level ERA (starters+bullpen combined) — true bullpen split unavailable |
| Colorado Rockies | 5.47 | MEDIUM | Team-level ERA (starters+bullpen combined) — true bullpen split unavailable |
| Los Angeles Dodgers | 3.68 | MEDIUM | Team-level ERA (starters+bullpen combined) — true bullpen split unavailable |

---

## Data Quality Distribution

| 등급 | 경기 수 |
|------|--------|
| HIGH | 8 |
| MEDIUM | 0 |
| LOW | 2 |

## Missing Fields (경기별)

- **St. Louis Cardinals @ Cincinnati Reds**: homeStarter, awayStarter
- **Baltimore Orioles @ Tampa Bay Rays**: 없음
- **Miami Marlins @ Philadelphia Phillies**: 없음
- **Detroit Tigers @ Pittsburgh Pirates**: 없음
- **San Diego Padres @ New York Mets**: 없음
- **Arizona Diamondbacks @ Boston Red Sox**: homeStarter
- **Atlanta Braves @ Minnesota Twins**: 없음
- **Athletics @ Kansas City Royals**: 없음
- **Chicago White Sox @ Chicago Cubs**: 없음
- **Los Angeles Dodgers @ Colorado Rockies**: 없음

---

## 데이터 분류

| 항목 | 분류 |
|------|------|
| Betman odds / matchSeq / betNm | PROVIDER FACT |
| noVigProbability / overround | MODEL MATH (deterministic) |
| 선발 ERA / WHIP / 최근 경기 | EXTERNAL SPORTS DATA |
| 팀 ERA / pitching stats | EXTERNAL SPORTS DATA |
| 팀 batting AVG/OBP/SLG/OPS | EXTERNAL SPORTS DATA |
| 부상자 | null (ESPN 403) |
| 불펜 이전 3일 워크로드 | null (statsapi 미지원) |

---

## 다음 단계 (Phase B 설계 — 픽 생성 전)

- [ ] 팀 batting endpoint 확정 (PARTIAL → PASS)
- [ ] 선발 handedness 필드 추가 (/people/{id} 호출)
- [ ] 불펜 playerPool=BULLPEN 엔드포인트 탐색
- [ ] **Fair Model 가중치 설계 (별도 Gate)**
  - starter delta 범위
  - offense delta 단위
  - bullpen delta 반영 방식
  - uncertainty haircut 조건
- [ ] **위 완료 후에만 fair probability 계산 허용**
