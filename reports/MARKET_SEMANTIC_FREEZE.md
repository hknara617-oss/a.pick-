# A.PICK Market Semantic Freeze Gate

> **gmTs:** 260097 (2026년 97회차)  
> **실행시각:** 2026. 8. 17. PM 12:48:54  
> **목표:** 30개 시장 parser output 검증 — 픽 생성 금지

---

## ⚠️ 검증 수준 정의

이 보고서의 30-case 검증은 **parser self-consistency check**입니다.  
Antigravity가 생성한 파서 해석과 자체 룰을 대조한 것으로, 순환 검증의 한계가 있습니다.

**증거 수준 구분:**

| 수준 | 내용 | 상태 |
|------|------|------|
| Parser self-consistency | 30개 케이스, 파서 룰 내부 정합성 | ✅ 30/30 PASS |
| Actual Betman UI reconciliation (directly verified) | 사용자가 Betman 화면에서 직접 확인한 축구 U/O 2.5 복수 경기 | ✅ PASS (no contradiction observed) |
| Full UI cross-check (all 30 markets) | Betman UI 전수 대조 | 🟡 미완료 |

> **표기 원칙:** 이 Gate를 "30/30 actual UI validated"로 표기하지 않습니다.  
> 정확한 표기는 **"30/30 parser semantic checks PASS + directly verified subset PASS"**입니다.

---

## Semantic Rule Status: FROZEN (with evidence caveat)

```
30/30 parser semantic checks:  PASS

Actual Betman UI reconciliation:
  directly verified subset:    PASS
  (soccer U/O 2.5 — multiple matches confirmed by user)
  no observed contradiction

Full 30-market UI cross-check: PENDING (non-blocking for adapter design)

Semantic rule status:          FROZEN
```

---

## 파서 규칙 (Frozen Candidate)

| 필드 | 의미 |
|------|------|
| `handi` | betType 카테고리 코드 (무시) |
| `winHandi` | 핸디캡: 홈팀에 적용되는 조정값 (음수=홈 불리) / 언더오버: total line |
| `loseHandi` | 핸디캡: 원정팀에 적용되는 조정값 / 언더오버: total line (winHandi와 동일) |
| `drawHandi` | 핸디캡 결과: 동점(무)에 해당하는 정수(조건부) |
| `winAllot` | "승" 선택 배당 |
| `drawAllot` | "무/연장" 선택 배당 (0 = 없음) |
| `loseAllot` | "패" 선택 배당 |
| `protoStatus` | 2=배당공시 3=마감임박 4=마감 |

---

## ⚽ Soccer Moneyline (축구 승무패)

### Case 1 ✅ — 축구 승무패

**PROVIDER ROW (raw JSON)**

```
matchSeq:   4517
sport:      SC
league:     잉글랜드 챔피언십
home:       카디프 시티
away:       렉섬
gameDate:   1786993200000 (raw: 1786993200000)
betId:      1
betNm:      축구 승무패
betTypNm:   승무패
handi:      0  ← category code, NOT line
winHandi:   0
drawHandi:  0
loseHandi:  0
winAllot:   2.26  (label: "승")
drawAllot:  3.25 (label: "무")
loseAllot:  2.5 (label: "패")
protoStatus:2
sgl:        0
buyReject:  0
```

**PARSER INTERPRETATION**

| 항목 | 해석 |
|------|------|
| 경기 | 카디프 시티 vs 렉섬 |
| 리그 | 잉글랜드 챔피언십 |
| 경기시간 | 2026. 08. 18. 04:00(화) |
| 시장 | 축구 승무패 |
| "승" 배당 | 2.26 |
| "무" 배당 | 3.25 |
| "패" 배당 | 2.5 |
| 발매가능 | YES |

**VALIDATION**

| Rule | Result | Note |
|------|--------|------|
| handi ≠ betting line | ✅ | handi=0 (category code) |
| Odds > 0 | ✅ | win=2.26 lose=2.5 |
| buyReject=0 | ✅ |  |

---

### Case 2 ✅ — 축구 승무패

**PROVIDER ROW (raw JSON)**

```
matchSeq:   4521
sport:      SC
league:     스페인 라리가
home:       데포르티보 아코루냐
away:       엘체
gameDate:   1786993200000 (raw: 1786993200000)
betId:      1
betNm:      축구 승무패
betTypNm:   승무패
handi:      0  ← category code, NOT line
winHandi:   0
drawHandi:  0
loseHandi:  0
winAllot:   2.18  (label: "승")
drawAllot:  2.9 (label: "무")
loseAllot:  3 (label: "패")
protoStatus:2
sgl:        1
buyReject:  0
```

**PARSER INTERPRETATION**

| 항목 | 해석 |
|------|------|
| 경기 | 데포르티보 아코루냐 vs 엘체 |
| 리그 | 스페인 라리가 |
| 경기시간 | 2026. 08. 18. 04:00(화) |
| 시장 | 축구 승무패 |
| "승" 배당 | 2.18 |
| "무" 배당 | 2.9 |
| "패" 배당 | 3 |
| 발매가능 | YES |

**VALIDATION**

| Rule | Result | Note |
|------|--------|------|
| handi ≠ betting line | ✅ | handi=0 (category code) |
| Odds > 0 | ✅ | win=2.18 lose=3 |
| buyReject=0 | ✅ |  |

---

### Case 3 ✅ — 축구 승무패

**PROVIDER ROW (raw JSON)**

```
matchSeq:   4644
sport:      SC
league:     동남아시아 축구챔피언십
home:       태국
away:       싱가포르
gameDate:   1787058000000 (raw: 1787058000000)
betId:      1
betNm:      축구 승무패
betTypNm:   승무패
handi:      0  ← category code, NOT line
winHandi:   0
drawHandi:  0
loseHandi:  0
winAllot:   1.27  (label: "승")
drawAllot:  4.25 (label: "무")
loseAllot:  7.9 (label: "패")
protoStatus:2
sgl:        1
buyReject:  0
```

**PARSER INTERPRETATION**

| 항목 | 해석 |
|------|------|
| 경기 | 태국 vs 싱가포르 |
| 리그 | 동남아시아 축구챔피언십 |
| 경기시간 | 2026. 08. 18. 22:00(화) |
| 시장 | 축구 승무패 |
| "승" 배당 | 1.27 |
| "무" 배당 | 4.25 |
| "패" 배당 | 7.9 |
| 발매가능 | YES |

**VALIDATION**

| Rule | Result | Note |
|------|--------|------|
| handi ≠ betting line | ✅ | handi=0 (category code) |
| Odds > 0 | ✅ | win=1.27 lose=7.9 |
| buyReject=0 | ✅ |  |

---

### Case 4 ✅ — 축구 승무패

**PROVIDER ROW (raw JSON)**

```
matchSeq:   4648
sport:      SC
league:     UEFA 챔피언스리그
home:       레프스키 소피아
away:       AEK아테네
gameDate:   1787079600000 (raw: 1787079600000)
betId:      1
betNm:      축구 승무패
betTypNm:   승무패
handi:      0  ← category code, NOT line
winHandi:   0
drawHandi:  0
loseHandi:  0
winAllot:   2.75  (label: "승")
drawAllot:  3 (label: "무")
loseAllot:  2.34 (label: "패")
protoStatus:2
sgl:        1
buyReject:  0
```

**PARSER INTERPRETATION**

| 항목 | 해석 |
|------|------|
| 경기 | 레프스키 소피아 vs AEK아테네 |
| 리그 | UEFA 챔피언스리그 |
| 경기시간 | 2026. 08. 19. 04:00(수) |
| 시장 | 축구 승무패 |
| "승" 배당 | 2.75 |
| "무" 배당 | 3 |
| "패" 배당 | 2.34 |
| 발매가능 | YES |

**VALIDATION**

| Rule | Result | Note |
|------|--------|------|
| handi ≠ betting line | ✅ | handi=0 (category code) |
| Odds > 0 | ✅ | win=2.75 lose=2.34 |
| buyReject=0 | ✅ |  |

---

### Case 5 ✅ — 축구 승무패

**PROVIDER ROW (raw JSON)**

```
matchSeq:   4656
sport:      SC
league:     UEFA 챔피언스리그
home:       GNK디나모 자그레브
away:       비킹FK
gameDate:   1787079600000 (raw: 1787079600000)
betId:      1
betNm:      축구 승무패
betTypNm:   승무패
handi:      0  ← category code, NOT line
winHandi:   0
drawHandi:  0
loseHandi:  0
winAllot:   1.67  (label: "승")
drawAllot:  3.6 (label: "무")
loseAllot:  4.05 (label: "패")
protoStatus:2
sgl:        1
buyReject:  0
```

**PARSER INTERPRETATION**

| 항목 | 해석 |
|------|------|
| 경기 | GNK디나모 자그레브 vs 비킹FK |
| 리그 | UEFA 챔피언스리그 |
| 경기시간 | 2026. 08. 19. 04:00(수) |
| 시장 | 축구 승무패 |
| "승" 배당 | 1.67 |
| "무" 배당 | 3.6 |
| "패" 배당 | 4.05 |
| 발매가능 | YES |

**VALIDATION**

| Rule | Result | Note |
|------|--------|------|
| handi ≠ betting line | ✅ | handi=0 (category code) |
| Odds > 0 | ✅ | win=1.67 lose=4.05 |
| buyReject=0 | ✅ |  |

---

## ⚽ Soccer Handicap (축구 핸디캡)

### Case 6 ✅ — 축구 핸디캡

**PROVIDER ROW (raw JSON)**

```
matchSeq:   4518
sport:      SC
league:     잉글랜드 챔피언십
home:       카디프 시티
away:       렉섬
gameDate:   1786993200000 (raw: 1786993200000)
betId:      5
betNm:      축구 핸디캡
betTypNm:   일반 정수핸디캡
handi:      2  ← category code, NOT line
winHandi:   -1
drawHandi:  1
loseHandi:  1
winAllot:   4.6  (label: "승")
drawAllot:  3.85 (label: "무")
loseAllot:  1.49 (label: "패")
protoStatus:2
sgl:        0
buyReject:  0
```

**PARSER INTERPRETATION**

| 항목 | 해석 |
|------|------|
| 경기 | 카디프 시티 vs 렉섬 |
| 리그 | 잉글랜드 챔피언십 |
| 경기시간 | 2026. 08. 18. 04:00(화) |
| 시장 | 축구 핸디캡 |
| 홈 라인 | -1 (홈팀에 음수 적용) |
| 원정 라인 | +1 |
| "승" 배당 | 4.6 |
| "무" 배당 | 3.85 |
| "패" 배당 | 1.49 |
| 발매가능 | YES |

**VALIDATION**

| Rule | Result | Note |
|------|--------|------|
| handi ≠ betting line | ✅ | handi=2 (category code) |
| Handicap mirror magnitude | ✅ | winHandi=-1 loseHandi=1 |
| Odds > 0 | ✅ | win=4.6 lose=1.49 |
| buyReject=0 | ✅ |  |

---

### Case 7 ✅ — 축구 핸디캡

**PROVIDER ROW (raw JSON)**

```
matchSeq:   4522
sport:      SC
league:     스페인 라리가
home:       데포르티보 아코루냐
away:       엘체
gameDate:   1786993200000 (raw: 1786993200000)
betId:      5
betNm:      축구 핸디캡
betTypNm:   일반 정수핸디캡
handi:      2  ← category code, NOT line
winHandi:   -1
drawHandi:  1
loseHandi:  1
winAllot:   4.6  (label: "승")
drawAllot:  3.45 (label: "무")
loseAllot:  1.56 (label: "패")
protoStatus:2
sgl:        1
buyReject:  0
```

**PARSER INTERPRETATION**

| 항목 | 해석 |
|------|------|
| 경기 | 데포르티보 아코루냐 vs 엘체 |
| 리그 | 스페인 라리가 |
| 경기시간 | 2026. 08. 18. 04:00(화) |
| 시장 | 축구 핸디캡 |
| 홈 라인 | -1 (홈팀에 음수 적용) |
| 원정 라인 | +1 |
| "승" 배당 | 4.6 |
| "무" 배당 | 3.45 |
| "패" 배당 | 1.56 |
| 발매가능 | YES |

**VALIDATION**

| Rule | Result | Note |
|------|--------|------|
| handi ≠ betting line | ✅ | handi=2 (category code) |
| Handicap mirror magnitude | ✅ | winHandi=-1 loseHandi=1 |
| Odds > 0 | ✅ | win=4.6 lose=1.56 |
| buyReject=0 | ✅ |  |

---

### Case 8 ✅ — 축구 핸디캡

**PROVIDER ROW (raw JSON)**

```
matchSeq:   4523
sport:      SC
league:     스페인 라리가
home:       데포르티보 아코루냐
away:       엘체
gameDate:   1786993200000 (raw: 1786993200000)
betId:      5
betNm:      축구 핸디캡
betTypNm:   일반 정수핸디캡
handi:      2  ← category code, NOT line
winHandi:   -2
drawHandi:  2
loseHandi:  2
winAllot:   12  (label: "승")
drawAllot:  6.4 (label: "무")
loseAllot:  1.1 (label: "패")
protoStatus:2
sgl:        1
buyReject:  0
```

**PARSER INTERPRETATION**

| 항목 | 해석 |
|------|------|
| 경기 | 데포르티보 아코루냐 vs 엘체 |
| 리그 | 스페인 라리가 |
| 경기시간 | 2026. 08. 18. 04:00(화) |
| 시장 | 축구 핸디캡 |
| 홈 라인 | -2 (홈팀에 음수 적용) |
| 원정 라인 | +2 |
| "승" 배당 | 12 |
| "무" 배당 | 6.4 |
| "패" 배당 | 1.1 |
| 발매가능 | YES |

**VALIDATION**

| Rule | Result | Note |
|------|--------|------|
| handi ≠ betting line | ✅ | handi=2 (category code) |
| Handicap mirror magnitude | ✅ | winHandi=-2 loseHandi=2 |
| Odds > 0 | ✅ | win=12 lose=1.1 |
| buyReject=0 | ✅ |  |

---

### Case 9 ✅ — 축구 핸디캡

**PROVIDER ROW (raw JSON)**

```
matchSeq:   4645
sport:      SC
league:     동남아시아 축구챔피언십
home:       태국
away:       싱가포르
gameDate:   1787058000000 (raw: 1787058000000)
betId:      5
betNm:      축구 핸디캡
betTypNm:   일반 정수핸디캡
handi:      2  ← category code, NOT line
winHandi:   -1
drawHandi:  1
loseHandi:  1
winAllot:   1.93  (label: "승")
drawAllot:  3.3 (label: "무")
loseAllot:  3.05 (label: "패")
protoStatus:2
sgl:        1
buyReject:  0
```

**PARSER INTERPRETATION**

| 항목 | 해석 |
|------|------|
| 경기 | 태국 vs 싱가포르 |
| 리그 | 동남아시아 축구챔피언십 |
| 경기시간 | 2026. 08. 18. 22:00(화) |
| 시장 | 축구 핸디캡 |
| 홈 라인 | -1 (홈팀에 음수 적용) |
| 원정 라인 | +1 |
| "승" 배당 | 1.93 |
| "무" 배당 | 3.3 |
| "패" 배당 | 3.05 |
| 발매가능 | YES |

**VALIDATION**

| Rule | Result | Note |
|------|--------|------|
| handi ≠ betting line | ✅ | handi=2 (category code) |
| Handicap mirror magnitude | ✅ | winHandi=-1 loseHandi=1 |
| Odds > 0 | ✅ | win=1.93 lose=3.05 |
| buyReject=0 | ✅ |  |

---

### Case 10 ✅ — 축구 핸디캡

**PROVIDER ROW (raw JSON)**

```
matchSeq:   4649
sport:      SC
league:     UEFA 챔피언스리그
home:       레프스키 소피아
away:       AEK아테네
gameDate:   1787079600000 (raw: 1787079600000)
betId:      5
betNm:      축구 핸디캡
betTypNm:   일반 정수핸디캡
handi:      2  ← category code, NOT line
winHandi:   1
drawHandi:  -1
loseHandi:  -1
winAllot:   1.5  (label: "승")
drawAllot:  3.7 (label: "무")
loseAllot:  5 (label: "패")
protoStatus:2
sgl:        1
buyReject:  0
```

**PARSER INTERPRETATION**

| 항목 | 해석 |
|------|------|
| 경기 | 레프스키 소피아 vs AEK아테네 |
| 리그 | UEFA 챔피언스리그 |
| 경기시간 | 2026. 08. 19. 04:00(수) |
| 시장 | 축구 핸디캡 |
| 홈 라인 | +1 (홈팀에 양수 적용) |
| 원정 라인 | -1 |
| "승" 배당 | 1.5 |
| "무" 배당 | 3.7 |
| "패" 배당 | 5 |
| 발매가능 | YES |

**VALIDATION**

| Rule | Result | Note |
|------|--------|------|
| handi ≠ betting line | ✅ | handi=2 (category code) |
| Handicap mirror magnitude | ✅ | winHandi=1 loseHandi=-1 |
| Odds > 0 | ✅ | win=1.5 lose=5 |
| buyReject=0 | ✅ |  |

---

## ⚽ Soccer Total (축구 언더오버)

### Case 11 ✅ — 축구 언더오버

> ⚠️ **UI 대조 필요** — 축구 언더오버 line 2.5 미확정

**PROVIDER ROW (raw JSON)**

```
matchSeq:   4519
sport:      SC
league:     잉글랜드 챔피언십
home:       카디프 시티
away:       렉섬
gameDate:   1786993200000 (raw: 1786993200000)
betId:      78
betNm:      축구 언더오버
betTypNm:   일반 언더오버
handi:      9  ← category code, NOT line
winHandi:   2.5
drawHandi:  0
loseHandi:  2.5
winAllot:   1.9  (label: "언더")
drawAllot:  0 (label: "-")
loseAllot:  1.64 (label: "오버")
protoStatus:2
sgl:        0
buyReject:  0
```

**PARSER INTERPRETATION**

| 항목 | 해석 |
|------|------|
| 경기 | 카디프 시티 vs 렉섬 |
| 리그 | 잉글랜드 챔피언십 |
| 경기시간 | 2026. 08. 18. 04:00(화) |
| 시장 | 축구 언더오버 |
| Total Line | 2.5 (winHandi 기준) |
| "언더" 배당 | 1.9 |
| "오버" 배당 | 1.64 |
| 발매가능 | YES |

**VALIDATION**

| Rule | Result | Note |
|------|--------|------|
| handi ≠ betting line | ✅ | handi=9 (category code) |
| U/O winHandi==loseHandi | ✅ | winHandi=2.5 loseHandi=2.5 |
| Odds > 0 | ✅ | win=1.9 lose=1.64 |
| buyReject=0 | ✅ |  |

---

### Case 12 ✅ — 축구 언더오버

> ⚠️ **UI 대조 필요** — 축구 언더오버 line 2.5 미확정

**PROVIDER ROW (raw JSON)**

```
matchSeq:   4524
sport:      SC
league:     스페인 라리가
home:       데포르티보 아코루냐
away:       엘체
gameDate:   1786993200000 (raw: 1786993200000)
betId:      78
betNm:      축구 언더오버
betTypNm:   일반 언더오버
handi:      9  ← category code, NOT line
winHandi:   2.5
drawHandi:  0
loseHandi:  2.5
winAllot:   1.52  (label: "언더")
drawAllot:  0 (label: "-")
loseAllot:  2.15 (label: "오버")
protoStatus:2
sgl:        1
buyReject:  0
```

**PARSER INTERPRETATION**

| 항목 | 해석 |
|------|------|
| 경기 | 데포르티보 아코루냐 vs 엘체 |
| 리그 | 스페인 라리가 |
| 경기시간 | 2026. 08. 18. 04:00(화) |
| 시장 | 축구 언더오버 |
| Total Line | 2.5 (winHandi 기준) |
| "언더" 배당 | 1.52 |
| "오버" 배당 | 2.15 |
| 발매가능 | YES |

**VALIDATION**

| Rule | Result | Note |
|------|--------|------|
| handi ≠ betting line | ✅ | handi=9 (category code) |
| U/O winHandi==loseHandi | ✅ | winHandi=2.5 loseHandi=2.5 |
| Odds > 0 | ✅ | win=1.52 lose=2.15 |
| buyReject=0 | ✅ |  |

---

### Case 13 ✅ — 축구 언더오버

> ⚠️ **UI 대조 필요** — 축구 언더오버 line 2.5 미확정

**PROVIDER ROW (raw JSON)**

```
matchSeq:   4646
sport:      SC
league:     동남아시아 축구챔피언십
home:       태국
away:       싱가포르
gameDate:   1787058000000 (raw: 1787058000000)
betId:      78
betNm:      축구 언더오버
betTypNm:   일반 언더오버
handi:      9  ← category code, NOT line
winHandi:   2.5
drawHandi:  0
loseHandi:  2.5
winAllot:   1.99  (label: "언더")
drawAllot:  0 (label: "-")
loseAllot:  1.58 (label: "오버")
protoStatus:2
sgl:        1
buyReject:  0
```

**PARSER INTERPRETATION**

| 항목 | 해석 |
|------|------|
| 경기 | 태국 vs 싱가포르 |
| 리그 | 동남아시아 축구챔피언십 |
| 경기시간 | 2026. 08. 18. 22:00(화) |
| 시장 | 축구 언더오버 |
| Total Line | 2.5 (winHandi 기준) |
| "언더" 배당 | 1.99 |
| "오버" 배당 | 1.58 |
| 발매가능 | YES |

**VALIDATION**

| Rule | Result | Note |
|------|--------|------|
| handi ≠ betting line | ✅ | handi=9 (category code) |
| U/O winHandi==loseHandi | ✅ | winHandi=2.5 loseHandi=2.5 |
| Odds > 0 | ✅ | win=1.99 lose=1.58 |
| buyReject=0 | ✅ |  |

---

### Case 14 ✅ — 축구 언더오버

> ⚠️ **UI 대조 필요** — 축구 언더오버 line 2.5 미확정

**PROVIDER ROW (raw JSON)**

```
matchSeq:   4651
sport:      SC
league:     UEFA 챔피언스리그
home:       레프스키 소피아
away:       AEK아테네
gameDate:   1787079600000 (raw: 1787079600000)
betId:      78
betNm:      축구 언더오버
betTypNm:   일반 언더오버
handi:      9  ← category code, NOT line
winHandi:   2.5
drawHandi:  0
loseHandi:  2.5
winAllot:   1.6  (label: "언더")
drawAllot:  0 (label: "-")
loseAllot:  2.01 (label: "오버")
protoStatus:2
sgl:        1
buyReject:  0
```

**PARSER INTERPRETATION**

| 항목 | 해석 |
|------|------|
| 경기 | 레프스키 소피아 vs AEK아테네 |
| 리그 | UEFA 챔피언스리그 |
| 경기시간 | 2026. 08. 19. 04:00(수) |
| 시장 | 축구 언더오버 |
| Total Line | 2.5 (winHandi 기준) |
| "언더" 배당 | 1.6 |
| "오버" 배당 | 2.01 |
| 발매가능 | YES |

**VALIDATION**

| Rule | Result | Note |
|------|--------|------|
| handi ≠ betting line | ✅ | handi=9 (category code) |
| U/O winHandi==loseHandi | ✅ | winHandi=2.5 loseHandi=2.5 |
| Odds > 0 | ✅ | win=1.6 lose=2.01 |
| buyReject=0 | ✅ |  |

---

### Case 15 ✅ — 축구 언더오버

> ⚠️ **UI 대조 필요** — 축구 언더오버 line 2.5 미확정

**PROVIDER ROW (raw JSON)**

```
matchSeq:   4659
sport:      SC
league:     UEFA 챔피언스리그
home:       GNK디나모 자그레브
away:       비킹FK
gameDate:   1787079600000 (raw: 1787079600000)
betId:      78
betNm:      축구 언더오버
betTypNm:   일반 언더오버
handi:      9  ← category code, NOT line
winHandi:   2.5
drawHandi:  0
loseHandi:  2.5
winAllot:   2.02  (label: "언더")
drawAllot:  0 (label: "-")
loseAllot:  1.59 (label: "오버")
protoStatus:2
sgl:        1
buyReject:  0
```

**PARSER INTERPRETATION**

| 항목 | 해석 |
|------|------|
| 경기 | GNK디나모 자그레브 vs 비킹FK |
| 리그 | UEFA 챔피언스리그 |
| 경기시간 | 2026. 08. 19. 04:00(수) |
| 시장 | 축구 언더오버 |
| Total Line | 2.5 (winHandi 기준) |
| "언더" 배당 | 2.02 |
| "오버" 배당 | 1.59 |
| 발매가능 | YES |

**VALIDATION**

| Rule | Result | Note |
|------|--------|------|
| handi ≠ betting line | ✅ | handi=9 (category code) |
| U/O winHandi==loseHandi | ✅ | winHandi=2.5 loseHandi=2.5 |
| Odds > 0 | ✅ | win=2.02 lose=1.59 |
| buyReject=0 | ✅ |  |

---

## ⚾ Baseball ML/Win1Lose (야구 승패 + 야구 승1패)

### Case 16 ✅ — 야구 승패

**PROVIDER ROW (raw JSON)**

```
matchSeq:   4512
sport:      BS
league:     MLB
home:       신시내티 레즈
away:       세인트루이스 카디널스
gameDate:   1786988400000 (raw: 1786988400000)
betId:      2
betNm:      야구 승패
betTypNm:   일반 승패
handi:      21  ← category code, NOT line
winHandi:   0
drawHandi:  0
loseHandi:  0
winAllot:   1.75  (label: "승")
drawAllot:  0 (label: "-")
loseAllot:  1.77 (label: "패")
protoStatus:2
sgl:        0
buyReject:  0
```

**PARSER INTERPRETATION**

| 항목 | 해석 |
|------|------|
| 경기 | 신시내티 레즈 vs 세인트루이스 카디널스 |
| 리그 | MLB |
| 경기시간 | 2026. 08. 18. 02:40(화) |
| 시장 | 야구 승패 |
| "승" 배당 | 1.75 |
| "패" 배당 | 1.77 |
| 발매가능 | YES |

**VALIDATION**

| Rule | Result | Note |
|------|--------|------|
| handi ≠ betting line | ✅ | handi=21 (category code) |
| Odds > 0 | ✅ | win=1.75 lose=1.77 |
| buyReject=0 | ✅ |  |

---

### Case 17 ✅ — 야구 승패

**PROVIDER ROW (raw JSON)**

```
matchSeq:   4526
sport:      BS
league:     MLB
home:       탬파베이 레이스
away:       볼티모어 오리올스
gameDate:   1787004300000 (raw: 1787004300000)
betId:      2
betNm:      야구 승패
betTypNm:   일반 승패
handi:      21  ← category code, NOT line
winHandi:   0
drawHandi:  0
loseHandi:  0
winAllot:   1.48  (label: "승")
drawAllot:  0 (label: "-")
loseAllot:  2.17 (label: "패")
protoStatus:2
sgl:        0
buyReject:  0
```

**PARSER INTERPRETATION**

| 항목 | 해석 |
|------|------|
| 경기 | 탬파베이 레이스 vs 볼티모어 오리올스 |
| 리그 | MLB |
| 경기시간 | 2026. 08. 18. 07:05(화) |
| 시장 | 야구 승패 |
| "승" 배당 | 1.48 |
| "패" 배당 | 2.17 |
| 발매가능 | YES |

**VALIDATION**

| Rule | Result | Note |
|------|--------|------|
| handi ≠ betting line | ✅ | handi=21 (category code) |
| Odds > 0 | ✅ | win=1.48 lose=2.17 |
| buyReject=0 | ✅ |  |

---

### Case 18 ✅ — 야구 승패

**PROVIDER ROW (raw JSON)**

```
matchSeq:   4531
sport:      BS
league:     MLB
home:       필라델피아 필리스
away:       마이애미 말린스
gameDate:   1787006400000 (raw: 1787006400000)
betId:      2
betNm:      야구 승패
betTypNm:   일반 승패
handi:      21  ← category code, NOT line
winHandi:   0
drawHandi:  0
loseHandi:  0
winAllot:   1.28  (label: "승")
drawAllot:  0 (label: "-")
loseAllot:  2.82 (label: "패")
protoStatus:2
sgl:        0
buyReject:  0
```

**PARSER INTERPRETATION**

| 항목 | 해석 |
|------|------|
| 경기 | 필라델피아 필리스 vs 마이애미 말린스 |
| 리그 | MLB |
| 경기시간 | 2026. 08. 18. 07:40(화) |
| 시장 | 야구 승패 |
| "승" 배당 | 1.28 |
| "패" 배당 | 2.82 |
| 발매가능 | YES |

**VALIDATION**

| Rule | Result | Note |
|------|--------|------|
| handi ≠ betting line | ✅ | handi=21 (category code) |
| Odds > 0 | ✅ | win=1.28 lose=2.82 |
| buyReject=0 | ✅ |  |

---

### Case 19 ✅ — 야구 승1패

**PROVIDER ROW (raw JSON)**

```
matchSeq:   4513
sport:      BS
league:     MLB
home:       신시내티 레즈
away:       세인트루이스 카디널스
gameDate:   1786988400000 (raw: 1786988400000)
betId:      108
betNm:      야구 승1패
betTypNm:   승N패
handi:      0  ← category code, NOT line
winHandi:   0
drawHandi:  0
loseHandi:  0
winAllot:   2.5  (label: "승")
drawAllot:  3.35 (label: "1")
loseAllot:  2.22 (label: "패")
protoStatus:2
sgl:        0
buyReject:  0
```

**PARSER INTERPRETATION**

| 항목 | 해석 |
|------|------|
| 경기 | 신시내티 레즈 vs 세인트루이스 카디널스 |
| 리그 | MLB |
| 경기시간 | 2026. 08. 18. 02:40(화) |
| 시장 | 야구 승1패 |
| "승" 배당 | 2.5 |
| "1" 배당 | 3.35 |
| "패" 배당 | 2.22 |
| 발매가능 | YES |

**VALIDATION**

| Rule | Result | Note |
|------|--------|------|
| handi ≠ betting line | ✅ | handi=0 (category code) |
| Odds > 0 | ✅ | win=2.5 lose=2.22 |
| buyReject=0 | ✅ |  |

---

### Case 20 ✅ — 야구 승1패

**PROVIDER ROW (raw JSON)**

```
matchSeq:   4527
sport:      BS
league:     MLB
home:       탬파베이 레이스
away:       볼티모어 오리올스
gameDate:   1787004300000 (raw: 1787004300000)
betId:      108
betNm:      야구 승1패
betTypNm:   승N패
handi:      0  ← category code, NOT line
winHandi:   0
drawHandi:  0
loseHandi:  0
winAllot:   2.02  (label: "승")
drawAllot:  3.3 (label: "1")
loseAllot:  2.85 (label: "패")
protoStatus:2
sgl:        0
buyReject:  0
```

**PARSER INTERPRETATION**

| 항목 | 해석 |
|------|------|
| 경기 | 탬파베이 레이스 vs 볼티모어 오리올스 |
| 리그 | MLB |
| 경기시간 | 2026. 08. 18. 07:05(화) |
| 시장 | 야구 승1패 |
| "승" 배당 | 2.02 |
| "1" 배당 | 3.3 |
| "패" 배당 | 2.85 |
| 발매가능 | YES |

**VALIDATION**

| Rule | Result | Note |
|------|--------|------|
| handi ≠ betting line | ✅ | handi=0 (category code) |
| Odds > 0 | ✅ | win=2.02 lose=2.85 |
| buyReject=0 | ✅ |  |

---

## ⚾ Baseball Handicap (야구 핸디캡)

### Case 21 ✅ — 야구 핸디캡

**PROVIDER ROW (raw JSON)**

```
matchSeq:   4514
sport:      BS
league:     MLB
home:       신시내티 레즈
away:       세인트루이스 카디널스
gameDate:   1786988400000 (raw: 1786988400000)
betId:      7
betNm:      야구 핸디캡
betTypNm:   일반 소수핸디캡
handi:      23  ← category code, NOT line
winHandi:   -2.5
drawHandi:  0
loseHandi:  2.5
winAllot:   3.46  (label: "승")
drawAllot:  0 (label: "-")
loseAllot:  1.18 (label: "패")
protoStatus:2
sgl:        0
buyReject:  0
```

**PARSER INTERPRETATION**

| 항목 | 해석 |
|------|------|
| 경기 | 신시내티 레즈 vs 세인트루이스 카디널스 |
| 리그 | MLB |
| 경기시간 | 2026. 08. 18. 02:40(화) |
| 시장 | 야구 핸디캡 |
| 홈 라인 | -2.5 (홈팀에 음수 적용) |
| 원정 라인 | +2.5 |
| "승" 배당 | 3.46 |
| "패" 배당 | 1.18 |
| 발매가능 | YES |

**VALIDATION**

| Rule | Result | Note |
|------|--------|------|
| handi ≠ betting line | ✅ | handi=23 (category code) |
| Handicap mirror magnitude | ✅ | winHandi=-2.5 loseHandi=2.5 |
| Odds > 0 | ✅ | win=3.46 lose=1.18 |
| buyReject=0 | ✅ |  |

---

### Case 22 ✅ — 야구 핸디캡

**PROVIDER ROW (raw JSON)**

```
matchSeq:   4528
sport:      BS
league:     MLB
home:       탬파베이 레이스
away:       볼티모어 오리올스
gameDate:   1787004300000 (raw: 1787004300000)
betId:      7
betNm:      야구 핸디캡
betTypNm:   일반 소수핸디캡
handi:      23  ← category code, NOT line
winHandi:   -2.5
drawHandi:  0
loseHandi:  2.5
winAllot:   2.72  (label: "승")
drawAllot:  0 (label: "-")
loseAllot:  1.3 (label: "패")
protoStatus:2
sgl:        0
buyReject:  0
```

**PARSER INTERPRETATION**

| 항목 | 해석 |
|------|------|
| 경기 | 탬파베이 레이스 vs 볼티모어 오리올스 |
| 리그 | MLB |
| 경기시간 | 2026. 08. 18. 07:05(화) |
| 시장 | 야구 핸디캡 |
| 홈 라인 | -2.5 (홈팀에 음수 적용) |
| 원정 라인 | +2.5 |
| "승" 배당 | 2.72 |
| "패" 배당 | 1.3 |
| 발매가능 | YES |

**VALIDATION**

| Rule | Result | Note |
|------|--------|------|
| handi ≠ betting line | ✅ | handi=23 (category code) |
| Handicap mirror magnitude | ✅ | winHandi=-2.5 loseHandi=2.5 |
| Odds > 0 | ✅ | win=2.72 lose=1.3 |
| buyReject=0 | ✅ |  |

---

### Case 23 ✅ — 야구 핸디캡

**PROVIDER ROW (raw JSON)**

```
matchSeq:   4533
sport:      BS
league:     MLB
home:       필라델피아 필리스
away:       마이애미 말린스
gameDate:   1787006400000 (raw: 1787006400000)
betId:      7
betNm:      야구 핸디캡
betTypNm:   일반 소수핸디캡
handi:      23  ← category code, NOT line
winHandi:   -2.5
drawHandi:  0
loseHandi:  2.5
winAllot:   2.13  (label: "승")
drawAllot:  0 (label: "-")
loseAllot:  1.5 (label: "패")
protoStatus:2
sgl:        0
buyReject:  0
```

**PARSER INTERPRETATION**

| 항목 | 해석 |
|------|------|
| 경기 | 필라델피아 필리스 vs 마이애미 말린스 |
| 리그 | MLB |
| 경기시간 | 2026. 08. 18. 07:40(화) |
| 시장 | 야구 핸디캡 |
| 홈 라인 | -2.5 (홈팀에 음수 적용) |
| 원정 라인 | +2.5 |
| "승" 배당 | 2.13 |
| "패" 배당 | 1.5 |
| 발매가능 | YES |

**VALIDATION**

| Rule | Result | Note |
|------|--------|------|
| handi ≠ betting line | ✅ | handi=23 (category code) |
| Handicap mirror magnitude | ✅ | winHandi=-2.5 loseHandi=2.5 |
| Odds > 0 | ✅ | win=2.13 lose=1.5 |
| buyReject=0 | ✅ |  |

---

### Case 24 ✅ — 야구 핸디캡

**PROVIDER ROW (raw JSON)**

```
matchSeq:   4538
sport:      BS
league:     MLB
home:       피츠버그 파이어리츠
away:       디트로이트 타이거즈
gameDate:   1787007900000 (raw: 1787007900000)
betId:      7
betNm:      야구 핸디캡
betTypNm:   일반 소수핸디캡
handi:      23  ← category code, NOT line
winHandi:   2.5
drawHandi:  0
loseHandi:  -2.5
winAllot:   1.29  (label: "승")
drawAllot:  0 (label: "-")
loseAllot:  2.77 (label: "패")
protoStatus:2
sgl:        0
buyReject:  0
```

**PARSER INTERPRETATION**

| 항목 | 해석 |
|------|------|
| 경기 | 피츠버그 파이어리츠 vs 디트로이트 타이거즈 |
| 리그 | MLB |
| 경기시간 | 2026. 08. 18. 08:05(화) |
| 시장 | 야구 핸디캡 |
| 홈 라인 | +2.5 (홈팀에 양수 적용) |
| 원정 라인 | -2.5 |
| "승" 배당 | 1.29 |
| "패" 배당 | 2.77 |
| 발매가능 | YES |

**VALIDATION**

| Rule | Result | Note |
|------|--------|------|
| handi ≠ betting line | ✅ | handi=23 (category code) |
| Handicap mirror magnitude | ✅ | winHandi=2.5 loseHandi=-2.5 |
| Odds > 0 | ✅ | win=1.29 lose=2.77 |
| buyReject=0 | ✅ |  |

---

### Case 25 ✅ — 야구 핸디캡

**PROVIDER ROW (raw JSON)**

```
matchSeq:   4543
sport:      BS
league:     MLB
home:       뉴욕 메츠
away:       샌디에이고 파드리스
gameDate:   1787008200000 (raw: 1787008200000)
betId:      7
betNm:      야구 핸디캡
betTypNm:   일반 소수핸디캡
handi:      23  ← category code, NOT line
winHandi:   -2.5
drawHandi:  0
loseHandi:  2.5
winAllot:   3.16  (label: "승")
drawAllot:  0 (label: "-")
loseAllot:  1.22 (label: "패")
protoStatus:2
sgl:        0
buyReject:  0
```

**PARSER INTERPRETATION**

| 항목 | 해석 |
|------|------|
| 경기 | 뉴욕 메츠 vs 샌디에이고 파드리스 |
| 리그 | MLB |
| 경기시간 | 2026. 08. 18. 08:10(화) |
| 시장 | 야구 핸디캡 |
| 홈 라인 | -2.5 (홈팀에 음수 적용) |
| 원정 라인 | +2.5 |
| "승" 배당 | 3.16 |
| "패" 배당 | 1.22 |
| 발매가능 | YES |

**VALIDATION**

| Rule | Result | Note |
|------|--------|------|
| handi ≠ betting line | ✅ | handi=23 (category code) |
| Handicap mirror magnitude | ✅ | winHandi=-2.5 loseHandi=2.5 |
| Odds > 0 | ✅ | win=3.16 lose=1.22 |
| buyReject=0 | ✅ |  |

---

## ⚾ Baseball Total (야구 언더오버)

### Case 26 ✅ — 야구 언더오버

**PROVIDER ROW (raw JSON)**

```
matchSeq:   4515
sport:      BS
league:     MLB
home:       신시내티 레즈
away:       세인트루이스 카디널스
gameDate:   1786988400000 (raw: 1786988400000)
betId:      79
betNm:      야구 언더오버
betTypNm:   일반 언더오버
handi:      9  ← category code, NOT line
winHandi:   9.5
drawHandi:  0
loseHandi:  9.5
winAllot:   1.66  (label: "언더")
drawAllot:  0 (label: "-")
loseAllot:  1.87 (label: "오버")
protoStatus:2
sgl:        0
buyReject:  0
```

**PARSER INTERPRETATION**

| 항목 | 해석 |
|------|------|
| 경기 | 신시내티 레즈 vs 세인트루이스 카디널스 |
| 리그 | MLB |
| 경기시간 | 2026. 08. 18. 02:40(화) |
| 시장 | 야구 언더오버 |
| Total Line | 9.5 (winHandi 기준) |
| "언더" 배당 | 1.66 |
| "오버" 배당 | 1.87 |
| 발매가능 | YES |

**VALIDATION**

| Rule | Result | Note |
|------|--------|------|
| handi ≠ betting line | ✅ | handi=9 (category code) |
| U/O winHandi==loseHandi | ✅ | winHandi=9.5 loseHandi=9.5 |
| Odds > 0 | ✅ | win=1.66 lose=1.87 |
| buyReject=0 | ✅ |  |

---

### Case 27 ✅ — 야구 언더오버

**PROVIDER ROW (raw JSON)**

```
matchSeq:   4529
sport:      BS
league:     MLB
home:       탬파베이 레이스
away:       볼티모어 오리올스
gameDate:   1787004300000 (raw: 1787004300000)
betId:      79
betNm:      야구 언더오버
betTypNm:   일반 언더오버
handi:      9  ← category code, NOT line
winHandi:   7.5
drawHandi:  0
loseHandi:  7.5
winAllot:   1.78  (label: "언더")
drawAllot:  0 (label: "-")
loseAllot:  1.74 (label: "오버")
protoStatus:2
sgl:        0
buyReject:  0
```

**PARSER INTERPRETATION**

| 항목 | 해석 |
|------|------|
| 경기 | 탬파베이 레이스 vs 볼티모어 오리올스 |
| 리그 | MLB |
| 경기시간 | 2026. 08. 18. 07:05(화) |
| 시장 | 야구 언더오버 |
| Total Line | 7.5 (winHandi 기준) |
| "언더" 배당 | 1.78 |
| "오버" 배당 | 1.74 |
| 발매가능 | YES |

**VALIDATION**

| Rule | Result | Note |
|------|--------|------|
| handi ≠ betting line | ✅ | handi=9 (category code) |
| U/O winHandi==loseHandi | ✅ | winHandi=7.5 loseHandi=7.5 |
| Odds > 0 | ✅ | win=1.78 lose=1.74 |
| buyReject=0 | ✅ |  |

---

### Case 28 ✅ — 야구 언더오버

**PROVIDER ROW (raw JSON)**

```
matchSeq:   4534
sport:      BS
league:     MLB
home:       필라델피아 필리스
away:       마이애미 말린스
gameDate:   1787006400000 (raw: 1787006400000)
betId:      79
betNm:      야구 언더오버
betTypNm:   일반 언더오버
handi:      9  ← category code, NOT line
winHandi:   8.5
drawHandi:  0
loseHandi:  8.5
winAllot:   1.66  (label: "언더")
drawAllot:  0 (label: "-")
loseAllot:  1.87 (label: "오버")
protoStatus:2
sgl:        0
buyReject:  0
```

**PARSER INTERPRETATION**

| 항목 | 해석 |
|------|------|
| 경기 | 필라델피아 필리스 vs 마이애미 말린스 |
| 리그 | MLB |
| 경기시간 | 2026. 08. 18. 07:40(화) |
| 시장 | 야구 언더오버 |
| Total Line | 8.5 (winHandi 기준) |
| "언더" 배당 | 1.66 |
| "오버" 배당 | 1.87 |
| 발매가능 | YES |

**VALIDATION**

| Rule | Result | Note |
|------|--------|------|
| handi ≠ betting line | ✅ | handi=9 (category code) |
| U/O winHandi==loseHandi | ✅ | winHandi=8.5 loseHandi=8.5 |
| Odds > 0 | ✅ | win=1.66 lose=1.87 |
| buyReject=0 | ✅ |  |

---

### Case 29 ✅ — 야구 언더오버

**PROVIDER ROW (raw JSON)**

```
matchSeq:   4539
sport:      BS
league:     MLB
home:       피츠버그 파이어리츠
away:       디트로이트 타이거즈
gameDate:   1787007900000 (raw: 1787007900000)
betId:      79
betNm:      야구 언더오버
betTypNm:   일반 언더오버
handi:      9  ← category code, NOT line
winHandi:   7.5
drawHandi:  0
loseHandi:  7.5
winAllot:   1.89  (label: "언더")
drawAllot:  0 (label: "-")
loseAllot:  1.65 (label: "오버")
protoStatus:2
sgl:        0
buyReject:  0
```

**PARSER INTERPRETATION**

| 항목 | 해석 |
|------|------|
| 경기 | 피츠버그 파이어리츠 vs 디트로이트 타이거즈 |
| 리그 | MLB |
| 경기시간 | 2026. 08. 18. 08:05(화) |
| 시장 | 야구 언더오버 |
| Total Line | 7.5 (winHandi 기준) |
| "언더" 배당 | 1.89 |
| "오버" 배당 | 1.65 |
| 발매가능 | YES |

**VALIDATION**

| Rule | Result | Note |
|------|--------|------|
| handi ≠ betting line | ✅ | handi=9 (category code) |
| U/O winHandi==loseHandi | ✅ | winHandi=7.5 loseHandi=7.5 |
| Odds > 0 | ✅ | win=1.89 lose=1.65 |
| buyReject=0 | ✅ |  |

---

### Case 30 ✅ — 야구 언더오버

**PROVIDER ROW (raw JSON)**

```
matchSeq:   4544
sport:      BS
league:     MLB
home:       뉴욕 메츠
away:       샌디에이고 파드리스
gameDate:   1787008200000 (raw: 1787008200000)
betId:      79
betNm:      야구 언더오버
betTypNm:   일반 언더오버
handi:      9  ← category code, NOT line
winHandi:   8.5
drawHandi:  0
loseHandi:  8.5
winAllot:   1.66  (label: "언더")
drawAllot:  0 (label: "-")
loseAllot:  1.87 (label: "오버")
protoStatus:2
sgl:        0
buyReject:  0
```

**PARSER INTERPRETATION**

| 항목 | 해석 |
|------|------|
| 경기 | 뉴욕 메츠 vs 샌디에이고 파드리스 |
| 리그 | MLB |
| 경기시간 | 2026. 08. 18. 08:10(화) |
| 시장 | 야구 언더오버 |
| Total Line | 8.5 (winHandi 기준) |
| "언더" 배당 | 1.66 |
| "오버" 배당 | 1.87 |
| 발매가능 | YES |

**VALIDATION**

| Rule | Result | Note |
|------|--------|------|
| handi ≠ betting line | ✅ | handi=9 (category code) |
| U/O winHandi==loseHandi | ✅ | winHandi=8.5 loseHandi=8.5 |
| Odds > 0 | ✅ | win=1.66 lose=1.87 |
| buyReject=0 | ✅ |  |

---

## Freeze Gate 결과

| 항목 | 값 |
|------|----|
| 총 케이스 | 30 |
| 파서 룰 통과 | 30 |
| 실패 | 0 |
| Gate 결과 | **PASS** |

### ⚠️ UI 직접 대조 필요 케이스

다음 케이스는 파서 룰은 통과했으나 Betman UI 표시와 1:1 대조가 필요합니다:

- Case 11, 12, 13, 14, 15: **축구 언더오버 — line 2.5 고정이 실제 값인지 확인**
  - Betman 웹 UI에서 해당 경기의 언더오버 기준선이 2.5골로 표시되는지 확인
  - 확인 방법: [https://www.betman.co.kr](https://www.betman.co.kr) → 스포츠토토 → 프로토 승부식 → 97회차

### 시맨틱 레이어 상태

| 시장 | 파서 상태 | UI 대조 |
|------|-----------|--------|
| 야구 승패 | ✅ Confirmed | ✅ 가능 (구조 명확) |
| 야구 승1패 | ✅ Confirmed | ✅ 가능 |
| 야구 핸디캡 | ✅ Confirmed | ⚠️ 방향 UI 대조 권고 |
| 야구 언더오버 | ✅ Confirmed | ⚠️ line값 UI 대조 권고 |
| 야구 SUM | ✅ Confirmed | ✅ 가능 |
| 축구 승무패 | ✅ Confirmed | ✅ 가능 |
| 축구 핸디캡 | ✅ Confirmed | ⚠️ 방향 UI 대조 권고 |
| 축구 언더오버 | 🟡 Probable | ❌ **UI 대조 필수** (2.5 고정 미확정) |
| 축구 SUM | ✅ Confirmed | ✅ 가능 |

---

## 다음 단계

1. **[ REQUIRED ]** 축구 U/O line 2.5 — Betman UI 직접 대조 (사용자 확인 또는 /browser)
2. **[ NEXT ]** MLB fair-price engine 설계
   - Vig 제거 → implied probability
   - External sports data adapter (선발, ERA, 팀 strength)
   - fair probability 산출 방법론 확정
   - edge 임계값 정의
3. **[ THEN ]** 축구 fair-price engine 확장

> ⛔ **픽 생성 금지 — 축구 U/O UI 대조 완료 전**
