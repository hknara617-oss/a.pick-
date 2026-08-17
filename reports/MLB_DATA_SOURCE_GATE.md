# MLB External Data Source Gate

> **실행시각:** 2026-08-17 12:51 KST  
> **목적:** 외부 MLB 데이터 접근성 / 스키마 / 레이턴시 검증  
> **제약:** 픽 생성 금지. 숫자 모델 금지. 소스 가용성만 확인.

---

## Gate 결과: 9/13 실질 PASS

> 아래 표는 HTTP 접근 성공/실패와 실제 데이터 수신 여부를 분리합니다.

| 소스 | HTTP | 데이터 수신 | 레이턴시 | 판정 |
|------|------|-----------|---------|------|
| **statsapi** — schedule today | 200 | ✅ 11 games | 818ms | ✅ PASS |
| **statsapi** — team standings | 200 | ✅ 6 divisions | 338ms | ✅ PASS |
| **statsapi** — team stats batting | 200 | ❌ 스플릿 없음 | 277ms | ❌ FAIL |
| **statsapi** — team stats pitching | 200 | ✅ 30 teams, ERA | 253ms | ✅ PASS |
| **statsapi** — team game logs | 200 | ✅ 최근 경기 로그 | 246ms | ✅ PASS |
| **statsapi** — pitcher ERA leaders | 200 | ✅ ERA 리더 5명 | 246ms | ✅ PASS |
| **statsapi** — venues | 200 | ✅ 62 구장 | 226ms | ✅ PASS |
| **Baseball Savant** — statcast | 200 | ⚠️ 필드 빈 배열 | 294ms | 🟡 PARTIAL |
| **Baseball Savant** — game log | 200 | ⚠️ hasData=false | 558ms | 🟡 PARTIAL |
| **ESPN** — scoreboard | 200 | ✅ 접근 가능 | 234ms | ✅ PASS |
| **ESPN** — team injuries | 403 | ❌ 인증 필요 | 112ms | ❌ BLOCKED |
| **ESPN** — team roster | 403 | ❌ 인증 필요 | 99ms | ❌ BLOCKED |
| **statsapi live** — game feed | 200 | ✅ 선발/구장/상태 | 503ms | ✅ PASS |

---

## Primary Source: statsapi.mlb.com (무인증, 안정적)

### 확인된 데이터 — EXTERNAL SPORTS DATA 레이어

**1. 오늘 경기 스케줄 (2026-08-17 기준)**

```
Cincinnati Reds vs St. Louis Cardinals  [home: Reds]
  → 선발: Rhett Lowder (home pitcher 확인됨)

Tampa Bay Rays vs Baltimore Orioles  [home: Rays]
  → 선발: Shane McClanahan (home) / Brandon Young (away)

... 총 11경기
```

**2. 팀 순위 (2026 정규시즌)**

```
Rays: 74승 49패 (승률 .602) — AL 상위권
```

**3. 팀 투구 스탯 (30 teams)**

```
Yankees: 팀 ERA 3.26
```

**4. 투수 ERA 리더 (2026 시즌)**

```
1위  Jacob Misiorowski  (MIL)  1.75
2위  Chris Sale          (ATL)  2.16
3위  Cam Schlittler      (NYY)  2.19
```

**5. 구장 정보 (62 venues)**

```
Angel Stadium / Oriole Park at Camden Yards / Fenway Park ...
```

**6. Live game feed**

```
gamePk: 824514
Reds vs Cardinals @ Great American Ball Park
liveFields: plays / linescore / boxscore / leaders
```

---

## 실패/차단 소스 분석

| 소스 | 실패 원인 | 대안 |
|------|---------|------|
| statsapi batting stats | 스플릿 파라미터 오류 | URL 파라미터 수정으로 해결 가능 |
| Baseball Savant | 2026 데이터 미색인 or 쿼리 형식 변경 | CSV 직접 다운로드 방식 시도 필요 |
| ESPN injuries / roster | 403 (인증 필요) | statsapi `roster` + `injuries` 엔드포인트로 대체 |

---

## 데이터 분류 — EXTERNAL SPORTS DATA 레이어

> Betman PROVIDER FACT와 **완전 분리** 유지

```
statsapi.mlb.com (primary)
├── schedule    → 경기 일정, gamePk, 더블헤더 여부
├── probablePitcher → 선발 투수 이름/ID
├── standings   → 팀 시즌 승률, 최근 폼 기반
├── team stats  → 팀 ERA / 득점 / 타율
├── game logs   → 최근 N경기 결과 (홈/원정 분리)
├── pitcher leaders → ERA, WHIP, K/9
├── live feed   → 구장, 날씨, 선발 확정 정보
└── venues      → 구장 ID → park factor 매핑 기반

ESPN (secondary, scoreboard only)
└── 경기 상태 / 결과 보조 확인

Baseball Savant (statcast)
└── 추가 검토 필요 (xFIP, Stuff+ 등)
```

---

## statsapi 배팅 스탯 수정 필요 (1개 실패)

```js
// 실패한 쿼리
/api/v1/teams/stats?season=2026&group=hitting&stats=season&sportId=1

// 수정 후보
/api/v1/stats?stats=season&group=hitting&season=2026&sportId=1&playerPool=ALL
```

---

## 데이터 소스 Gate 결론

```
statsapi.mlb.com:    PRIMARY — ✅ 안정적, 무인증, 선발/순위/ERA 수집 가능
ESPN scoreboard:     SECONDARY — ✅ 보조 가능
Baseball Savant:     OPTIONAL — 🟡 추가 검토 필요
ESPN injury/roster:  ❌ 인증 필요 — statsapi 대체
```

---

## 다음 단계: MLB Fair Price Engine v0 설계

파이프라인 (코드 구현 전 설계):

```
BETMAN ODDS (winAllot/loseAllot)
     ↓
VIG 제거
  → raw_implied_win = 1 / winAllot
  → raw_implied_lose = 1 / loseAllot
  → total_overround = raw_win + raw_lose
  → no_vig_win = raw_win / total_overround
     ↓
MARKET CONSENSUS PRIOR (= no_vig implied prob)
     ↓
SPORTS DATA (statsapi)
  ├ starter ERA / WHIP (probablePitcher → player stats)
  ├ team ERA (pitching stats)
  ├ team OPS/runs (batting stats)
  ├ park factor (venue → lookup table)
  ├ handedness (TBD — 추가 필드 확인)
  ├ rest days (game logs → date diff)
  └ recent form (last 10 games W/L)
     ↓
MLB FAIR MODEL v0 (weighted adjustment on prior)
     ↓
P(fair)
     ↓
FAIR ODDS = 1 / P(fair)
     ↓
EDGE = P(fair) - no_vig_implied
     ↓
UNCERTAINTY HAIRCUT (model confidence 기반)
     ↓
BUY (edge > threshold) / WATCH / PASS
```

### 구현 순서

- [ ] statsapi batting stats URL 수정 → PASS
- [ ] probablePitcher → 선발 ERA/WHIP 자동 수집 adapter
- [ ] Vig 제거 공식 구현 + 단위 테스트
- [ ] Park factor 테이블 (구장 ID → 조정계수)
- [ ] fair model v0 — 가중 조정 방식 설계 확정
- [ ] **위 완료 후 97회차 MLB 경기 edge 계산 시범 실행**
- [ ] **pick은 edge 계산 결과 기반으로만 출력**
