# [A.PICK 전수 기술·UX·로직 역명세서 (Reverse Technical Specification v2.1)]

> **문서 버전**: `v2.1 (FOUNDER ALPHA / PRODUCTION-INTENT BUILD)`  
> **시스템 명칭**: A.PICK (Attention-Free Quant Decision Terminal for Sports Betting)  
> **실시간 배포 주소**: [https://a-pick.vercel.app](https://a-pick.vercel.app)  
> **감사 상태**: **Quant Claims Audit Completed (허위 정밀도 및 과장된 알파 주장 100% 제거)**  
> **문서 목적**: 외부 전문 검수관(GPT Red Team / CPO / Quant Architect)에게 프로덕트 전체 아키텍처, 수학적 수식, UI/UX 상태 전이, 데이터 파이프라인의 실체와 현재 구현 수준을 가감 없이 투명하게 공개하고 기술 감사를 받기 위함.

---

## 1. 프로덕트 철학 및 코어 밸류 (Value Proposition)

### 1.1 서비스 정의
A.PICK은 국내 스포츠토토(배트맨) 이용자를 위한 **'Attention-Free 의사결정 관리 터미널(Decision Terminal)'**이다. 
사기성 유료 픽스터나 수익률 판매 모델을 단호히 거부하며, **"경기는 유저가 고르고, 판단은 A.PICK이 감시한다"**는 단일 철학 하에 시장 노이즈를 압축하고 진입 후 뇌동 매매를 차단하는 **'주의력 방화벽(Attention Firewall)'**을 제공한다.

### 1.2 코어 밸류 및 DateDrop 압축 정신
* **DateDrop 미니멀리즘**: "오늘 볼 건 적게(2~3개). 고를 땐 이유를 남기고. 고른 뒤엔 A.PICK이 본다."
* **수익률 주장 전면 동결 (Alpha Claims Frozen)**:
  * 자체 예측 모델의 Out-of-Sample 초과수익이 장기 입증되기 전까지, **임의의 승률(65%)이나 ROI(+26.75%) 주장을 프로덕트에서 전면 삭제**한다.
  * 글로벌 샤프 북메이커의 No-Vig 배당은 '절대적 미래 예측치'가 아닌 **'시장 공정 기준선(Baseline Reference)'**으로만 사용한다.
* **자금 관리 원칙**: `FIXED_FRACTION_5_PERCENT` (회차당 총 자본의 5.0% 고정 분할 베팅 정책)

---

## 2. UI/UX 화면 계층 구조 및 유저 저니 (User Flow)

### 2.1 3대 메인 탭 계층 구조
```
[ A.PICK Root Application ]
 ├── Top Status Bar (프로토 승부식 실시간 회차 연동 안내)
 └── Tab Panel Switcher
      ├── [TAB 1: 시장 탐색 & 판단 봉인] (id="tab-today")
      │    ├── Focus Review Card (오늘 검토할 2개 시장)
      │    ├── Market Exploration Section (id="market-exploration-section")
      │    │    ├── Sports Filter Chips ([🔥 TOP 3], [📋 전체], [⚾ 야구], [⚽ 축구])
      │    │    ├── Live Search Input (id="market-search-input")
      │    │    └── 1-Game-1-Card Catalog (id="today-candidates-list")
      │    ├── Decision Sealed Banner (판단 봉인 및 감시 위임 안내)
      │    └── Legal & Responsible Gaming Footer
      │
      ├── [TAB 2: 추적 & 감시 위임] (id="tab-watch")
      │    ├── Active Watch Summary (배당 변동, 선발 라인업 감시 중)
      │    └── Sealed Decision Cards (봉인 당시 근거 및 파기 기준 보존)
      │
      └── [TAB 3: 복기 & 메모리] (id="tab-review")
           ├── Zero-Input Auto Review Cards (과정 중심 원칙 준수 여부 자동 판정)
           ├── Blurred Outcome Toggle (결과 편향 차단 블러)
           └── One-Tap Mental Check (😌 덤덤함 / 🤯 뇌동 충동 / 🤔 아쉬움)
```

### 2.2 Hero 카드 인터랙션 (픽스터 승인 ➔ 시장 검토 안내로 정상화)
* **상태 A: `MARKET PRICE DISCREPANCY` (가격 차이 관측)**
  * **카피**: *"오늘 검토할 2개 시장 — 데이터 기준 가격 차이가 관측되어 확인해 볼 가치가 있는 시장입니다."*
  * **CTA**: `[📋 배트맨 번호 복사 & 판단 봉인]` (클릭 시 클립보드 복사 + 봉인 전환)
* **상태 B: `PASS (진입 패스)`**
  * **카피**: *"오늘은 PASS — 현재 기준을 충족하는 시장이 없습니다."* (과장된 +20% 수익 주장 삭제)
  * **상태**: `진입 기준 미도달 (No Action Required)`

### 2.3 Attention Firewall 플로우 (감금이 아닌 건강한 마찰력)
```
[유저가 '📋 배트맨 번호 복사 & 판단 봉인' 클릭]
       │
       ▼
[1] 클립보드에 포맷팅된 번호 자동 복사
       │
       ▼
[2] 토스트 알림 송출 ("번호 복사 완료")
       │
       ▼
[3] Hero Card 상태 전환 ➔ "🛡️ DECISION SEALED & WATCH ACTIVE"
    "판단이 봉인되었습니다. 지금부터 필요한 변화는 A.PICK이 감시합니다."
    - [앱 닫기] (Primary Button)
    - [시장 다시 보기] (Secondary Link - 유저 강제 차단이 아닌 의식적 재진입)
```

---

## 3. 프론트엔드 컴포넌트 트리 및 상태 관리 (Frontend Architecture)

### 3.1 TypeScript 데이터 모델 정의 (`types/quant.ts`)
```typescript
export type DropState = 'DISCREPANCY_FOUND' | 'PASS';
export type SportType = 'FOOTBALL' | 'BASEBALL' | 'BASKETBALL';
export type ProcessVerdict = 'COMPLIANT' | 'AMBER' | 'VIOLATED';

export interface MarketCandidate {
  id: string;
  gameNo: number;        // 배트맨 투표용지 경기 번호
  sport: SportType;
  league: string;
  matchTitle: string;
  market: string;        // 예: "-1.5 마핸승", "LG 트윈스 승"
  batmanOdds: number;    // 예: 1.93
  marketDelta: number;   // 글로벌 No-Vig 대비 가격 차이 (%p)
}

export interface DailyDropPayload {
  state: DropState;
  date: string;
  candidates?: [MarketCandidate, MarketCandidate];
  combinedOdds?: number; // 예: 2.99
  bankrollPolicy: string; // "FIXED_FRACTION_5_PERCENT"
  passReason?: string;
}
```

---

## 4. 퀀트 스크리닝 & 오즈 엔진 로직 (Logical Pipeline)

### 4.1 글로벌 No-Vig 정규화 파이프라인 (Shin's Method Solver)
1. **Raw Odds 수집**: Point-in-time 샤프 오즈 및 배트맨 공시 오즈 동시 기록.
2. **Rule Matcher**: 축구(정규시간 90분), 야구/농구(연장전 처리 규정 일치 여부) 필터링.
3. **Shin's $z$ Parameter Solver**:
   각 이벤트별로 인사이더 거래 비대칭 모수 $z$를 수치 최적화(Root Finding)로 해결하여 무수수료 공정 확률 산출:
   $$P_{\text{fair}, i} = \frac{\sqrt{z^2 + 4(1-z)\frac{\pi_i^2}{\sum \pi_j}} - z}{2(1-z)}$$
   $$\text{검증}: \sum_{i=1}^{n} P_{\text{fair}, i} = 1.000000$$
4. **가격 델타 산출**:
   $$\Delta P = (P_{\text{fair}} - P_{\text{batman}}) \times 100$$
5. **독립성 가좌 경고 (Pairwise Covariance Check)**:
   2개 경기를 조합할 때 $P(A \cap B) = P(A) \times P(B)$의 단순 독립 가정을 배제하고, 동일 날씨/리그 regime/모델 바이어스에 대한 상관 스트레스 검증 수행.

### 4.2 슬리피지 및 가격 변동 방어 (Dynamic Decision Threshold)
단순 코호트 분산이 아닌 **'가격 생애주기 추적(Lifecycle Price Tracking)'**을 적용:
$$\text{Price at Discovery} \longrightarrow \text{Price at View} \longrightarrow \text{Price at Copy} \longrightarrow \text{Price at Confirmation}$$
배트맨 배당이 유저의 DecisionContract 최소 기준 이하로 하락 시:
➔ `EXPIRED: 가격 조건 종료 (더 이상 유효하지 않은 구간입니다)` 자동 표기.

### 4.3 Composite Canonical Entity Resolver
* **성공 기준**: `false match = 0` (Unresolved 발생 시 사일런트 매칭 대신 사용자 확인 요구).
* **복합 매칭 파이프라인**:
  $$\text{Source Entity} \longrightarrow \text{Normalization} \longrightarrow \text{Alias Dict} \longrightarrow [\text{Sport} + \text{League} + \text{Opponent} + \text{Date}] \longrightarrow \text{Scoring} \longrightarrow \text{MATCHED} \lor \text{NEEDS\_CONFIRMATION}$$

---

## 5. 데이터 영속성 & 시뮬레이션 원장 (Storage & Ledger)

### 5.1 불변 원장 표기 원칙 (Honest Provenance)
* 프로덕션 DB(Supabase Append-Only Ledger) 연동 전까지 모든 트랙레코드는 **`시뮬레이션 모델 (Simulation / Backtest Model)`**로 명확히 표기.
* 임의의 "검증된 ROI +21.4%" 등의 확정적 문구 전면 배제.

---

## 6. 외부 검수자를 위한 핵심 질문 리스트 (Revised Audit Questions)

1. **[신 공식 $z$ 모수 추정의 견고성]**  
   배트맨 2-Way/3-Way 마켓에 대해 샤프 북메이커 오즈로부터 Shin의 $z$ 값을 실시간으로 추정할 때, 최적화 수렴 실패(Convergence Failure)나 북메이커 간 스프레드 불일치 시 사용할 가장 안정적인 정규화 폴백(Fallback) 알고리즘은 무엇인가?

2. **[Drawdown 확률 제약 모델]**  
   고정 5% 분할 베팅 환경에서 $P(\text{MDD} \ge 30\%) \le 5\%$를 만족하기 위한 실전 상관 스트레스 계수와 자본 감축(Drawdown Contraction) 트리거 설계는 어떠해야 하는가?

3. **[Decision Contract의 슬리피지 무효화 기준]**  
   배트맨의 비대칭 배당 삭감 시 유저가 설정한 최소 요구 배당(Minimum Acceptable Odds)을 실시간으로 감지하여 봉인을 자동 파기(Invalidation)시키는 프론트엔드/백엔드 상태 머신 구조는 어떻게 구성해야 하는가?

4. **[Composite Entity Resolver의 임계값 설정]**  
   팀명 오인으로 인한 치명적 가짜 에지(False Edge)를 0건으로 유지하기 위해 [팀명 + 상대팀 + 리그 + 경기일시] 다차원 복합 매칭 시 채택할 최적의 Distance Threshold는 얼마인가?
