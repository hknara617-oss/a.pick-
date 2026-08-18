# [A.PICK 전수 기술·UX·로직 역명세서 (Reverse Technical Specification v2.2)]

> **문서 버전**: `v2.2 (FOUNDER ALPHA / EPISTEMIC INTEGRITY BUILD)`  
> **시스템 명칭**: A.PICK (Attention-Free Decision Terminal for Sports Betting)  
> **실시간 배포 URL**: [https://a-pick.vercel.app](https://a-pick.vercel.app)  
> **감사 상태**: **Quant Claims Audit 100% 반영 (자금 관리 권고 제거, 외부 무마진 기준 정제, 데이터 커버리지 투명화)**  
> **문서 목적**: 외부 전문 검수관(GPT Red Team / CPO / 퀀트 아키텍트)에게 시스템의 실제 구현 상태와 철학을 정직하게 공개하고 제품 검수를 받기 위함.

---

## 1. 프로덕트 철학 및 코어 밸류 (Value Proposition)

### 1.1 서비스 정의
A.PICK은 국내 스포츠토토(배트맨) 이용자를 위한 **'Attention-Free 의사결정 관리 터미널(Decision Terminal)'**이다.  
사기성 유료 픽스터나 수익률 판매 모델을 단호히 거부하며, **"경기는 유저가 고르고, 판단은 A.PICK이 감시한다"**는 단일 원칙 하에 시장 노이즈를 압축하고 진입 후 뇌동 매매를 차단하는 **'주의력 방화벽(Attention Firewall)'**을 제공한다.

### 1.2 코어 밸류 및 Epistemic Integrity 원칙
* **DateDrop 미니멀리즘 (앞단은 단순하게, 뒷단은 정교하게)**:
  * **시장**: *"오늘 볼 경기 3"*
  * **봉인**: *"왜 골랐어요?"* ➔ `[이 판단 맡기기]`
  * **추적**: *"현재 확인할 것 없음"* 또는 *"1개 변화 있음"*
  * **복기**: *"이번 판단 어땠나요?"*
* **자금 관리 (Bet Sizing)**: **`NOT ENABLED`**  
  * A.PICK은 현재 특정 금액이나 베팅 비율(Kelly Criterion / 고정 5% 등)을 추천하지 않는다. 알파가 장기 검증되기 전까지 베팅 사이징 정책을 프로덕트에 포함하지 않는다.
* **기준선 용어 정제 (External No-Vig Baseline)**:
  * 글로벌 샤프 북메이커의 배당은 '절대적 공정 확률'이 아닌 **'수수료를 제거한 외부 시장 무마진 기준($p_{\text{ExternalNoVig}}$)'**으로만 명시한다.
* **감시 범위 투명화 (Provider Coverage Honesty)**:
  * 모호한 '실시간 전수 감시'라는 과장 대신, 실제 인프라의 커버리지를 투명하게 고지한다:
    * `✓ 가격 변화 (ACTIVE)`
    * `✓ 선발·라인업 (ACTIVE)`
    * `— 부상·기상 정보 (NOT_COVERED / 현재 미지원)`

---

## 2. UI/UX 화면 계층 구조 및 유저 저니 (User Flow)

### 2.1 단일 통합 의사결정 파이프라인
```
             ┌─ [경로 A] A.PICK에서 판단 봉인 ──┐
[ 1. 시장 ] ─┤                                 ├── [ 3. WATCH 감시 ] ── [ 4. 복기 ]
             └─ [경로 B] 이미 구매한 티켓 캡처 ──┘
```

### 2.2 4단계 핵심 인터랙션
1. **[1단계: 시장 탐색]**:
   - Focus Card: 외부 시장 무마진 기준과 가격 차이가 관측된 2개 경기 요약.
   - Match-Centric Catalog: 1경기 1카드 원칙으로 서브마켓(일반 승무패, 핸디캡, 언더오버) 통합 제공.
2. **[2단계: 판단 봉인 & 배트맨 핸드오프]**:
   - 근거 칩 및 파기 조건 선택 ➔ `[🔒 이 판단 맡기기]`.
   - 미니 티켓(선택 / 현재 배당 / 내 기준) 확인 후 ➔ `[배트맨 열기]` (외부 배트맨 사이트로 이동).
3. **[3단계: 캡처 기반 실제 진입 연결]**:
   - 배트맨 구매 후 티켓 캡처를 업로드/붙여넣기(`Ctrl+V`)하면, 기존 `APICK_CREATED` 판단과 1:1 매칭하여 실제 진입 증빙(`IMPORTED_CAPTURE`)으로 연결.
   - 중복 판단 생성 없이 1개의 연속된 의사결정 이력(Continuous History) 보존.
4. **[4단계: WATCH 감시 & Attention Firewall]**:
   - 감시 범위(`ACTIVE`, `PARTIAL`, `NOT_COVERED`)를 명확히 고지하고, 변화가 없을 경우 불필요한 푸시를 발송하지 않음.
   - 실제 진입 기록 즉시 `[✕ 앱 닫기]`를 안내하여 인지적 종결 제공.

---

## 3. 프론트엔드 컴포넌트 트리 및 상태 관리 (Frontend Architecture)

### 3.1 TypeScript 데이터 인터페이스 (`types/decision.ts`)
```typescript
export type DecisionOrigin = 'APICK_CREATED' | 'EXTERNAL_CAPTURE';
export type ExecutionStatus = 'EXECUTED' | 'NO_ENTRY' | 'UNKNOWN';
export type CoverageStatus = 'ACTIVE' | 'PARTIAL' | 'NOT_COVERED';

export interface DecisionContract {
  id: string;
  roundId: string;
  sport: string;
  league: string;
  eventName: string;
  selectionName: string;
  offeredOdds: number;
  entryThreshold: number;
  pExternalNoVig: number; // 외부 시장 무마진 확률
  origin: DecisionOrigin;
  executionStatus: ExecutionStatus;
  primaryThesis: string;
  killConditions: string[];
}

export interface WatchCoverage {
  priceChange: CoverageStatus;   // ACTIVE
  lineupChange: CoverageStatus;  // ACTIVE
  injuryWeather: CoverageStatus; // NOT_COVERED
}
```

---

## 4. 데이터 정규화 & 원장 시스템 (Data Pipeline)

### 4.1 외부 무마진 확률 산출 ($p_{\text{ExternalNoVig}}$)
* **Shin's Method Solver**: 외부 샤프 오즈로부터 인사이더 거래 모수 $z$를 수치 최적화하여 마진을 제거한 기준선 산출:
  $$p_{\text{ExternalNoVig}, i} = \frac{\sqrt{z^2 + 4(1-z)\frac{\pi_i^2}{\sum \pi_j}} - z}{2(1-z)}$$
* **배트맨 가격 델타 ($\Delta P$)**:
  $$\Delta P = (p_{\text{ExternalNoVig}} - P_{\text{batman}}) \times 100$$
* **룰 정합성 필터 (`isRuleStrictlyMatched`)**: 축구 90분 정규시간 및 야구/농구 연장전 처리 규정 일치 여부 엄격 검증.

### 4.2 트랙레코드 고지 원칙
* 실전 서버리스 원장 정산 연동 전까지 모든 데이터는 **`시뮬레이션 모델 (Simulation Model)`**로 정직하게 표기.

---

## 5. 외부 검수자를 위한 핵심 질문 리스트 (Revised Audit Questions v2.2)

1. **[사용자 인지 및 재방문 가치 (Core PMF Question)]**  
   처음 앱을 접한 토토 이용자가 복잡한 퀀트/수학적 설명 없이도 **30초 안에 "A.PICK에 왜 판단을 맡기고 다시 돌아와야 하는지(Attention-Free Decision OS)"**를 명확히 체감할 수 있는 UX 전달력을 갖추었는가?

2. **[Shin's Method $z$ 수치 최적화 폴백 (Solver Robustness)]**  
   2-Way/3-Way 마켓에 대해 샤프 북메이커 오즈로부터 $z$ 값을 역산할 때, 북메이커 간 스프레드 이상치로 인해 수치 최적화가 수렴하지 않을 경우 사용할 가장 안전하고 왜곡 없는 정규화 폴백은 무엇인가?

3. **[의사결정 계약의 슬리피지 무효화 (Contract Lifecycle)]**  
   유저가 배트맨으로 이동한 사이 배당이 유저의 최소 요구 배당(Minimum Acceptable Odds) 미달로 급락했을 때, 이를 감지하여 봉인을 `EXPIRED`로 안전하게 무효화시키는 상태 머신의 최적 구조는 무엇인가?

4. **[Composite Entity Resolver 오차율 제로화 (Safety Filter)]**  
   배트맨의 축약 한글 팀명(`맨체스U`, `요코베이`)과 글로벌 엔티티 간의 매칭에서 Silent False Match(오매칭)를 0건으로 유지하기 위한 [팀명 + 상대팀 + 리그 + 일시] 다차원 복합 검증의 임계값 설계는 적절한가?
