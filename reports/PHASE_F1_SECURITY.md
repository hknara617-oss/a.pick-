# Phase F.1 Frontend Security & RLS Audit Report

> **실행시각:** 2026-08-17  
> **보안 스캔:** `npm run security:check` (265개 전체 파일 검사 완료)  
> **결과:** **0 Security Violations Found (PASS ✅)**

---

## 1. 프론트엔드-서버 보안 경계 준수 현황
1. **Client Bundle Secret Leakage:** `apps/web/public/` 내의 HTML, JS, CSS 파일에 `SERVICE_ROLE_KEY`, DB 패스워드, 민감 API 키 일체 없음.
2. **Row Level Security (RLS) 강제:**
   - 사용자 계약(`decision_contracts`), 복기 결과(`review_results`), 메모리 기록(`decision_memory_records`)은 `user_id = auth.uid()` 정책에 의해 사용자 간 완벽히 격리됨.
   - 공개 데이터(`market_observations`, `settlement_results`)만 익명 Public Read 허용.
3. **SecretRedactor:** 에러 로그 및 시스템 출력 시 모든 토큰과 접속 정보 자동 마스킹 (`[REDACTED]`).
