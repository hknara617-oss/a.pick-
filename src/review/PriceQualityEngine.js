'use strict';

const CLVEngine = require('./CLVEngine');

/**
 * src/review/PriceQualityEngine.js
 * Evaluates price quality using shadow configurable thresholds (UNCALIBRATED_V1).
 */
class PriceQualityEngine {
    static evaluatePriceQuality(entryExecution, closingPrice, contract) {
        const effectiveEntryOdds = entryExecution && entryExecution.executed && entryExecution.entryOdds !== null
            ? entryExecution.entryOdds
            : contract.offeredOddsAtSeal;

        if (!closingPrice || closingPrice.status === 'UNAVAILABLE' || closingPrice.odds === null) {
            return {
                grade: 'UNKNOWN',
                entryOdds: effectiveEntryOdds,
                closingOdds: null,
                closingOddsStatus: 'UNAVAILABLE',
                clv: null,
                clvMethod: 'CLV_RETURN_RATIO',
                thresholdVersion: 'UNCALIBRATED_V1',
                explanation: '마감 가격을 확인할 수 없어 가격 품질을 평가하지 않았습니다.'
            };
        }

        const clvResult = CLVEngine.calculateCLV(effectiveEntryOdds, closingPrice.odds);
        const clv = clvResult.clv;

        // Shadow Configurable Thresholds (v1 defaults)
        let grade = 'FAIR';
        let explanation = '';

        if (clv >= 0.05) {
            grade = 'EXCELLENT';
            explanation = `마감 배당(${closingPrice.odds}) 대비 +${(clv * 100).toFixed(1)}% 높은 우수한 가격에 진입했습니다.`;
        } else if (clv >= 0.02) {
            grade = 'GOOD';
            explanation = `마감 배당(${closingPrice.odds}) 대비 +${(clv * 100).toFixed(1)}% 유리한 가격을 확보했습니다.`;
        } else if (clv > -0.02) {
            grade = 'FAIR';
            explanation = `마감 배당(${closingPrice.odds})과 거의 유사한 가격 수준입니다.`;
        } else {
            grade = 'POOR';
            explanation = `마감 배당(${closingPrice.odds}) 대비 ${(clv * 100).toFixed(1)}% 불리한 가격에 체결되었습니다.`;
        }

        return {
            grade,
            entryOdds: effectiveEntryOdds,
            closingOdds: closingPrice.odds,
            closingOddsStatus: closingPrice.status,
            clv,
            clvMethod: 'CLV_RETURN_RATIO',
            thresholdVersion: 'UNCALIBRATED_V1',
            explanation
        };
    }
}

module.exports = PriceQualityEngine;
