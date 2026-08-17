# Phase D.3 Database Schema Specification

> **상태:** PRODUCTION READY (PostgreSQL / Supabase-compatible)  
> **핵심 원칙:** "DATABASE IS STORAGE." (비즈니스 규칙, 확률 수학, 상태 머신 로직은 DB가 아닌 결정론적 엔진에 상주)

---

## 1. 전체 테이블 명세

| 테이블 명 | 용도 | 기본키 (PK) | 외래키 (FK) | 불변성 규칙 (Immutability) | RLS / 소유권 | 보존 주기 (Retention) |
|---|---|---|---|---|---|---|
| `users` | 사용자 계정 식별 | `id UUID` | — | 가변 (계정 정보) | 개인 데이터 | 영구 보존 |
| `sport_events` | 스포츠 경기 정규 일정 | `id UUID` | — | 정규화된 경기 정보 | 공유 데이터 (Public Read) | 경기 후 영구 |
| `markets` | 경기별 마켓 분류 | `id UUID` | `event_id → sport_events.id` | 마켓 정의 | 공유 데이터 (Public Read) | 경기 후 영구 |
| `selections` | 마켓별 선택지 (승/무/패 등) | `id UUID` | `market_id → markets.id` | 선택지 정의 | 공유 데이터 (Public Read) | 경기 후 영구 |
| `market_observations` | 시계열 업스트림 배당 관측치 | `id UUID` | — | **완전 불변 (Idempotent Insert Only)** | 공유 데이터 (Public Read) | 핫(30일) → 콜드 아카이빙 |
| `selection_observations` | 관측 시점별 선택지 배당 | `id UUID` | `market_observation_id` | **완전 불변** | 공유 데이터 (Public Read) | 핫(30일) → 콜드 아카이빙 |
| `context_snapshots` | 경기 사실/신호 컨텍스트 | `id UUID` | — | **완전 불변 (사실만 기록, 확률가공 금지)** | 공유 데이터 (Public Read) | 영구 보존 |
| `provider_health_observations` | 제공사 수신 헬스 상태 | `id UUID` | — | 시계열 로그 | 시스템 내부 | 14일 롤링 |
| `decision_contracts` | 봉인된 의사결정 계약 | `id UUID` | `user_id → users.id` | **DB 트리거로 봉인 후 수정/삭제 원천 차단** | 개인 데이터 (`auth.uid() = user_id`) | 영구 보존 (Decision Memory용) |
| `decision_events` | 의사결정 상태 변화 감사 로그 | `id UUID` | `decision_id → decision_contracts.id` | **Append-Only + SHA-256 해시 체인** | 개인 데이터 (`auth.uid() = user_id`) | 영구 보존 |
| `watch_targets` | 실시간 WATCH 감시 상태 | `id UUID` | `decision_id → decision_contracts.id` | 가변 (ACTIVE/PAUSED 등 운영 상태) | 개인 데이터 (`auth.uid() = user_id`) | 경기 종료 시 CLOSED |
| `watch_evaluations` | 폴링 주기별 감시 평가 로그 | `id UUID` | `decision_id, watch_target_id` | **Append-Only (입력 지문 중복 억제)** | 개인 데이터 (`auth.uid() = user_id`) | 30일 보존 |
| `notification_candidates` | 사용자 알림 큐 | `id UUID` | `decision_id → decision_contracts.id` | 가변 (delivery_status) | 개인 데이터 (`auth.uid() = user_id`) | 14일 보존 |

---

## 2. 데이터베이스 트리거 명세

### 2.1 봉인 계약 변경 방지 트리거 (`fn_prevent_sealed_contract_mutation`)
```sql
CREATE OR REPLACE FUNCTION fn_prevent_sealed_contract_mutation()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.sealed_at IS NOT NULL THEN
        RAISE EXCEPTION 'IMMUTABILITY VIOLATION: DecisionContract % is sealed and cannot be modified or deleted.', OLD.id
            USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### 2.2 감사 이벤트 변경 방지 트리거 (`fn_prevent_decision_event_mutation`)
```sql
CREATE OR REPLACE FUNCTION fn_prevent_decision_event_mutation()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'APPEND ONLY VIOLATION: DecisionEvent % is an immutable audit record and cannot be modified or deleted.', OLD.id
        USING ERRCODE = '23514';
END;
$$ LANGUAGE plpgsql;
```
