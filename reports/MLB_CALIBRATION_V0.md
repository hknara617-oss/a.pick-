# MLB Probability Calibration Report v0

> **목적:** 예측 확률과 실제 승률의 일치성(Calibration) 검증  
> **검증 대상:** MODEL 3 (A.PICK v0 Shrunk Final) on Full Dataset (379 경기)

---

## 1. 확률 구간별 Calibration 테이블

| 예측 확률 구간 | 샘플 수 (N) | 평균 예측 확률 | 실제 승률 | Calibration Error (|Pred - Actual|) | 판정 |
|---|---|---|---|---|---|
| **<45%** | 22 | 42.6% | 27.3% | 15.3%p | ⚠️ WATCH |
| **45–50%** | 79 | 47.9% | 44.3% | 3.5%p | ✅ EXCELLENT |
| **50–55%** | 129 | 52.6% | 52.7% | 0.1%p | ✅ EXCELLENT |
| **55–60%** | 98 | 57.2% | 60.2% | 3.0%p | ✅ EXCELLENT |
| **60–65%** | 46 | 62.1% | 63.0% | 1.0%p | ✅ EXCELLENT |
| **65–70%** | 5 | 66.1% | 40.0% | 26.1%p | ⚠️ WATCH |
| **70%+** | 0 | — | — | — | N/A |

**Expected Calibration Error (전체 ECE): 2.90%p** (매우 우수: < 5.0%p 기준 충족)
