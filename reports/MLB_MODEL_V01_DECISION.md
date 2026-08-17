# MLB Fair Model v0.1 Formal Decision Gate

> **최종 판정:** **`MARKET_WINS / RESEARCH_CONTINUE`**  
> **사유:** Out-of-Sample 검증셋에서 A.PICK v0가 Market No-Vig Baseline 대비 Brier (+0.00067) 및 Log Loss (+0.00135) 악화 기록

---

## 1. 핵심 의사결정 요약

1. **모델 승인 거부 (NO Picks, NO Thresholds):**  
   현재 v0 모델을 기반으로 한 픽 발행, BUY/WATCH/PASS 임계값 수립, 축구 모델 확장을 **전면 차단**합니다.
2. **기본 모델 정의 변경:**  
   실전 베팅 의사결정 시 `MODEL = MARKET_PRIOR (Betman No-Vig)`를 기본 공정 확률로 확정합니다.
3. **선발/타선 피처의 역할 재정의:**  
   선발 및 타선 지표는 확률 가감(Probability Delta)이 아니라, **컨텍스트 설명(Risk Context & Contextual Explanations)**으로만 활용합니다.
4. **차기 과제:**  
   - 전일자(T-1) 누적 박스스코어 기반 무결점 백테스트 데이터 파이프라인 구축
   - 정규화 회귀 계수 (β_starter=0.04, β_offense=0.00) 적용한 극단적 수축 모델 v0.2 재평가
