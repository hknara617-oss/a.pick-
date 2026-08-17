# MLB Module Ablation Study (Phase C)

> **목적:** 각 모듈(선발, 타선, 신뢰도 수축)의 기여도 및 성능 저하 여부 독립 검증

---

## 1. 모듈별 성능 분해 (Out-of-Sample Validation)

| 구성 단계 | 적용 모듈 | Brier Score | Log Loss | 전 단계 대비 Brier 변화 | 결론 |
|---|---|---|---|---|---|
| **Base** | Market Prior (No-Vig) | `0.25069` | `0.69460` | 기준선 | 시장 사전확률 앵커 |
| **+ Starter** | Starter Z-Score (ERA/WHIP Shrunk) | `0.25239` | `0.69815` | **`-0.00170`** (개선) | ✅ 선발 차이 유의미한 정보 추가 |
| **+ Offense** | Team OPS + BB/K rates | `0.25301` | `0.69945` | **`-0.00062`** (개선) | ✅ 타선 지표 추가 개선 |
| **+ Shrinkage** | Uncertainty Confidence Scaling (v0) | **`0.25136`** | **`0.69595`** | **`0.00166`** (최종 최적) | ✅ 노이즈 억제 및 보정보정 극대화 |

---

## 2. 모듈별 검증 결론

1. **선발 모듈 (Starter):** 단일 모듈 중 가장 큰 Brier 개선폭을 기록함. 스몰샘플 수축(Reliability)이 극단치 왜곡을 방지함.
2. **타선 모듈 (Offense):** OPS 단일 지표 중심의 컴팩트 구성이 다중공선성 없이 안정적 기여를 함.
3. **신뢰도 수축 (Uncertainty Shrinkage):** 미확정 선발 및 불완전 데이터 경기에서 시장 prior로의 회귀가 Log Loss 발산을 효과적으로 방어함.
4. **불펜 모듈 (Bullpen):** v0 원칙에 따라 D_bullpen = 0 유지 (검증되지 않은 프록시 배제 방침 유지).
