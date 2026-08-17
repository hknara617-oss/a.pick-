# MLB Historical Odds Provenance Audit

> **실행시각:** 2026. 8. 17. PM 1:31:51  
> **감사 목적:** 379개 경기 배당 데이터의 실제 출처(Provenance) 투명성 검증

---

## 1. 배당 데이터 출처 분류 (Honest Provenance Breakdown)

| 분류 | 경기 수 | 비고 |
|------|---------|------|
| **BETMAN_VERIFIED** | **0** | 과거 만료 회차 JSON 미보존 (gameInfoInq.do 302 리다이렉트) |
| **EXTERNAL_MARKET** | **0** | 외부 북메이커 직접 크롤링 아님 |
| **SYNTHETIC_CONSENSUS_BASELINE** | **379** | 사전 전력 모델 + 13.6% 정규화 Vig로 합성 생성된 베이스라인 |
| **UNKNOWN_PROVENANCE** | **0** | 출처 불명 데이터 없음 |

> ⚠️ **중요 감사 결론:**  
> 이번 379경기 백테스트의 시장 배당은 **배트맨의 실제 과거 체결 배당이 아니라, 메이저리그 시장 합의 사전확률(Consensus Prior Baseline)에 배트맨 마진(13.6% Vig)을 얹은 합성 시장선**입니다.  
> 따라서 본 백테스트 결과는 **'Generic MLB Market Calibration'**으로 분류하며, 배트맨 실전 검증으로 호칭하지 않습니다.
