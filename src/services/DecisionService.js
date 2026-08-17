'use strict';

const crypto = require('crypto');
const DecisionContract = require('../models/DecisionContract');

/**
 * src/services/DecisionService.js
 * Handles lightweight 3-step decision sealing into immutable DecisionContracts.
 * Step 1: Price & threshold
 * Step 2: Initial thesis & evidence chips
 * Step 3: Break conditions
 */
class DecisionService {
    constructor({ contractRepo = null, eventRepo = null } = {}) {
        this.contractRepo = contractRepo;
        this.eventRepo = eventRepo;
    }

    async sealDecision({
        userId,
        provider = 'BETMAN',
        roundId = '260097',
        sport = 'BASEBALL',
        league = 'MLB',
        eventId,
        marketId,
        selectionId,
        offeredOdds,
        entryThreshold,
        thesisSummary,
        evidenceChips = [],
        breakConditions = []
    }) {
        if (!userId || !eventId || !marketId || !selectionId || !offeredOdds) {
            throw new Error('DecisionService.sealDecision requires userId, eventId, marketId, selectionId, offeredOdds');
        }

        const contractId = crypto.randomUUID();
        const sealedAt = new Date().toISOString();

        const defaultBreakConditions = breakConditions.length > 0 ? breakConditions : [
            { code: 'ODDS_BELOW_MINIMUM', threshold: entryThreshold || offeredOdds, action: 'INVALIDATE' },
            { code: 'STARTER_SCRATCHED', action: 'INVALIDATE' }
        ];

        const contract = new DecisionContract({
            id: contractId,
            userId,
            provider,
            roundId,
            sport,
            league,
            eventId,
            marketId,
            selectionId,
            offeredOddsAtSeal: parseFloat(offeredOdds),
            sealedAt,
            entryRule: {
                fairBasis: 'MARKET_NO_VIG',
                minimumEntryOdds: parseFloat(entryThreshold || offeredOdds),
                version: 'v1.0.0'
            },
            initialPriceState: offeredOdds >= (entryThreshold || offeredOdds) ? 'ATTRACTIVE' : 'UNATTRACTIVE',
            thesis: {
                summary: thesisSummary || '선발 투수 및 시장 가격 조건 부합',
                supportingEvidence: evidenceChips.length > 0 ? evidenceChips : ['선발 확인', '가격 조건 충족'],
                opposingEvidence: []
            },
            breakConditions: defaultBreakConditions
        });

        // Create initial Genesis DecisionEvent
        const genesisEvent = {
            id: crypto.randomUUID(),
            decisionId: contractId,
            sequenceNumber: 1,
            eventType: 'SEALED',
            occurred_at: sealedAt,
            reasonCode: 'SEALED',
            previous_event_hash: 'GENESIS',
            event_hash: crypto.createHash('sha256').update(`genesis:${contractId}:${sealedAt}`).digest('hex')
        };

        return {
            contract,
            genesisEvent,
            confirmation: {
                headline: '판단을 저장했습니다.',
                subcopy: '이제 계속 확인할 필요 없습니다. 중요한 변화가 생기면 알려드릴게요.',
                sealedOdds: contract.offeredOddsAtSeal,
                entryThreshold: contract.entryRule.minimumEntryOdds,
                sealedAt
            }
        };
    }
}

module.exports = DecisionService;
