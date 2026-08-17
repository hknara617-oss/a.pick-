# Phase F.2 Invited Beta Architecture & Deployment Specification

> **초대 베타 운영 방침:**  
> 초기 베타는 **5~10명의 선별된 실수요자**만을 대상으로 진행되며, 공개 가입(Public Signup)은 철저히 제한됩니다.

---

## 1. 초대 접근 제어 및 유저 라이프사이클

```
[ 초대 메일 / 초대 코드 수신 ]
          ↓
[ BetaAccessService 검증 ] ──► (미초대자: 접근 거부 HTTP 403)
          ↓
[ Supabase Auth (Email Magic Link) ]
          ↓
[ User Bootstrap ] ──► 프로필 생성 & Cold Start 상태 초기화 (허위 기록 없음)
          ↓
[ 3-Tab Vertical Slice 루프 ]
  오늘의 픽 → 판단 봉인 → WATCH → 복기 → 메모리 규칙 수락
```

---

## 2. 5~10인 휴먼 베타 핵심 관찰 질문 (Top 2 Questions)
1. **WATCH 검증:** *"판단을 저장한 뒤, 평소보다 경기 전 시장을 덜 들여다보게 되었는가?"* (Painkiller 입증)
2. **REVIEW 검증:** *"경기에 졌을 때 복기를 보고 '그래도 이 판단 자체는 괜찮았네'라는 개념이 자연스럽게 받아들여지는가?"* (Outcome vs Process 분리 입증)
