# Phase D.3 Security & Trust Boundary Model

> **원칙:** 신뢰 경계(Trust Boundary)의 엄격한 분리 및 개인정보 최소화(PII Minimization)

---

## 1. 신뢰 경계 및 역할 분리

```
[ UNTRUSTED USER CLIENT ]
        ↓ (HTTPS / JWT Auth)
   [ Supabase RLS ]
        ↓ (Allowed: CRUD own DecisionContracts & WatchTargets)
[ POSTGRESQL DATABASE ]
        ↑ (Bypass RLS via Service Role Key)
[ TRUSTED INGESTION WORKER / SERVER ENGINES ]
        ↑ (Polls Betman JSON / Sports APIs)
[ EXTERNAL PROVIDERS ]
```

### 1.1 사용자 클라이언트 (User Client)
- `auth.uid()` 기반으로 본인이 생성한 `decision_contracts`, `watch_targets`, `decision_events`, `notification_candidates`에만 접근 가능.
- 공유 시장 데이터(`market_observations`, `sport_events`, `context_snapshots`)는 **오직 읽기(SELECT)만 허용**.
- 제공사 관측치 직접 삽입 또는 타인의 계약 변조 불가.

### 1.2 서버 수집 및 감시 워커 (Service Role / Ingestion Worker)
- `SERVICE_ROLE_KEY`를 통해서만 업스트림 배트맨 관측치 삽입, 감시 평가(`watch_evaluations`), 의사결정 이벤트(`decision_events`), 알림 큐 생성 가능.
- 클라이언트에 워커 권한 노출 원천 차단.

---

## 2. PII 최소화 (PII Minimization)

A.PICK 시스템은 사용자의 프라이버시와 보안을 보호하기 위해 베팅 관련 민감 정보를 일체 저장하지 않습니다:
- ❌ **배트맨 계정 ID / 비밀번호 미보관**
- ❌ **구매 자동화 비밀번호 / 결제 수단 미보관**
- ❌ **금융 계좌 및 개인 금융 정보 미보관**
- ✅ **오직 익명화된 `user_id UUID`와 의사결정 기록만 보관**

---

## 3. 계약 불변성 및 감사 무결성 보증

1. **DB 레벨 트리거:** `sealed_at IS NOT NULL`인 계약은 UPDATE/DELETE 쿼리 시 `23514 check_violation` 예외를 발생시켜 DB 차원에서 차단.
2. **SHA-256 해시 체인:** 모든 `decision_events`는 `previous_event_hash -> event_hash`로 연결되어 1비트의 변조도 포렌식 검증(`WatchReplayEngine`) 시 즉각 감지.
