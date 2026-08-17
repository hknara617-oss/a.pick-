# Phase F.2 Security & Data Minimization Report

> **실행시각:** 2026-08-17  
> **보안 점검:** `npm run security:check` (PASS ✅)

---

## 1. 보안 및 개인정보 최소 수집 원칙 (Data Minimization)
1. **수집하지 않는 항목:**
   - 배트맨 계정 로그인 정보(ID/PW 절대 요구 안 함)
   - 금융/결제 정보
   - 사용자 연락처 및 단말기 주소록
   - 불필요한 베팅 금액 정보
2. **서버 비밀값 보호:** `SUPABASE_SERVICE_ROLE_KEY`는 클라이언트 웹 앱 번들에 일체 주입되지 않으며, 서버 API 및 백엔드 워커에서만 격리 실행.
3. **사용자 간 RLS 격리:** PostgreSQL `user_id = auth.uid()` 정책으로 타 사용자의 판단 계약, 알림 인박스, 복기 결과 열람 불가.
