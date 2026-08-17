# MLB Historical Dataset Report (Phase C)

> **생성시각:** 2026. 8. 17. PM 1:29:12  
> **총 경기 수:** 379 경기  
> **시간적 무결성 (Temporal Integrity):** STRICT — Pre-game asOf 기준만 수집, 미래 정보 유출(Lookahead) 원천 차단

---

## 1. 데이터셋 개요

| 항목 | 수치 | 비고 |
|------|------|------|
| 총 경기 수 | **379** | 최소 목표(200경기) 달성 ✅ |
| 기간 | 2026-07-20 ~ 2026-08-16 | 2026 정규시즌 |
| 분할 방식 | Chronological (시간순) | Train 70% (265) / Val 30% (114) |
| 시장 기준 | Consensus Market Line | Betman 13.6% vig normalization |
| 선발 투수 확정율 | 100.0% | pre-game 공시 기준 |

---

## 2. 시간적 무결성 규칙 (Temporal Defense)

1. **asOf 기준점:** 경기 시작 전 12:00 UTC 기준으로 확정된 선발 및 전일자 누적 성적만 반영.
2. **사후 데이터 배제:** 당일 박스스코어, 경기 중 부상, 최종 스코어는 모델 입력에서 완전 제외.
3. **No Random Shuffle:** 미래의 시장 레짐이 과거로 유출되지 않도록 엄격한 시계열 분할 유지.

---

## 3. 데이터 샘플 (최근 10경기)

| Game ID | Date | Away @ Home | Home Won? | Market No-Vig | Model 3 Fair | Conf | Starter Δ | Offense Δ |
|---------|------|-------------|-----------|---------------|--------------|------|-----------|-----------|
| 823670 | 2026-08-16 | Philadelphia Phillies @ Minnesota Twins | ❌ L | 51.2% | 48.5% | 58% | -0.253 | +0.062 |
| 823912 | 2026-08-16 | Milwaukee Brewers @ Los Angeles Dodgers | ❌ L | 52.7% | 51.6% | 59% | -0.178 | +0.101 |
| 823991 | 2026-08-16 | Kansas City Royals @ Los Angeles Angels | ❌ L | 55.2% | 54.6% | 62% | +0.057 | -0.093 |
| 824156 | 2026-08-16 | Seattle Mariners @ Houston Astros | ❌ L | 50.2% | 51.1% | 60% | -0.100 | +0.157 |
| 824236 | 2026-08-16 | Chicago White Sox @ Detroit Tigers | ❌ L | 56.0% | 54.9% | 58% | -0.087 | +0.009 |
| 824397 | 2026-08-16 | San Diego Padres @ Cleveland Guardians | ❌ L | 54.5% | 59.3% | 58% | +0.400 | -0.060 |
| 824477 | 2026-08-16 | Miami Marlins @ Cincinnati Reds | ❌ L | 50.9% | 47.8% | 59% | -0.094 | -0.117 |
| 824642 | 2026-08-16 | St. Louis Cardinals @ Chicago Cubs | ❌ L | 53.0% | 60.5% | 64% | +0.291 | +0.200 |
| 824880 | 2026-08-16 | Arizona Diamondbacks @ Atlanta Braves | ✅ W | 55.5% | 56.4% | 62% | +0.053 | +0.008 |
| 824965 | 2026-08-16 | Texas Rangers @ Athletics | ✅ W | 48.4% | 47.9% | 58% | -0.070 | +0.039 |
