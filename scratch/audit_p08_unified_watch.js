'use strict';

const TicketImportService = require('../src/services/TicketImportService');
const WatchService = require('../src/services/WatchService');
const TrackedDecision = require('../src/domain/TrackedDecision');

console.log('================================================================');
console.log('A.PICK P0.8 — UNIFIED WATCH & SCREENSHOT IMPORT GATE AUDIT');
console.log('================================================================\n');

let passed = 0;
let failed = 0;

function assert(condition, name) {
    if (condition) {
        console.log(`  ✓ PASS: ${name}`);
        passed++;
    } else {
        console.error(`  ❌ FAIL: ${name}`);
        failed++;
    }
}

async function runAudit() {
    const importStore = [];
    const ticketService = new TicketImportService({ importStore });
    const watchService = new WatchService();

    // 1. Scenario A: A.PICK-created decision
    console.log('[SCENARIO A] A.PICK-created decision:');
    const apickDecision = new TrackedDecision({
        id: 'dec_apick_001',
        origin: 'APICK_CREATED',
        eventName: '신시내티 레즈 vs 세인트루이스',
        selectionName: '신시내티 레즈 승',
        capturedOdds: 1.75,
        currentOdds: 1.75,
        entryThreshold: 1.75,
        contractStatus: 'SEALED',
        thesisStatus: 'RECORDED',
        thesisOrigin: 'ORIGINAL_AT_DECISION',
        thesisSummary: '선발 매치업 우위'
    });
    assert(apickDecision.origin === 'APICK_CREATED', 'Origin is strictly APICK_CREATED');
    assert(apickDecision.contractStatus === 'SEALED', 'Contract status is SEALED');
    assert(apickDecision.thesisOrigin === 'ORIGINAL_AT_DECISION', 'Thesis origin is ORIGINAL_AT_DECISION');

    // 2. Scenario B & D: External market screenshot + Live Odds Reconciled
    console.log('\n[SCENARIO B & D] External market screenshot & Price Reconciliation:');
    const parseRes = await ticketService.parseAndReconcile({
        rawText: '강원FC vs 성남FC 강원FC 승 1.42'
    });
    assert(parseRes.selections.length === 1, 'Single leg parsed from text');
    const leg1 = parseRes.selections[0];
    assert(leg1.parsedOdds === 1.42, 'Captured odds preserved (1.42)');
    assert(leg1.reconciliationStatus === 'MATCHED', 'Reconciled status is MATCHED');

    // 3. Scenario C: Purchased ticket confirmation & Execution
    console.log('\n[SCENARIO C] Purchased ticket & Execution confirmation:');
    const trackedExternal = ticketService.confirmAndTrack({
        importSessionId: parseRes.importSessionId,
        selectedLegs: parseRes.selections,
        userExecuted: true,
        userThesis: '상대 로테이션 가능성을 봄'
    });
    assert(trackedExternal.length === 1, '1 TrackedDecision created');
    const ext1 = trackedExternal[0];
    assert(ext1.origin === 'EXTERNAL_CAPTURE', 'Origin is strictly EXTERNAL_CAPTURE');
    assert(ext1.contractStatus === 'IMPORTED', 'Contract status is strictly IMPORTED (never SEALED)');
    assert(ext1.executed === true, 'Execution is explicitly marked true upon user confirmation');
    assert(ext1.thesisOrigin === 'RECONSTRUCTED_AFTER_IMPORT', 'Thesis origin is RECONSTRUCTED_AFTER_IMPORT (not ORIGINAL)');

    // 4. Scenario G: Duplicate Screenshot Prevention
    console.log('\n[SCENARIO G] Duplicate screenshot import prevention:');
    const dupRes = await ticketService.parseAndReconcile({
        rawText: '강원FC vs 성남FC 강원FC 승 1.42'
    });
    assert(dupRes.isDuplicate === true, 'Duplicate hash correctly detected and rejected');

    // 5. Scenario H: Multi-leg Ticket Support
    console.log('\n[SCENARIO H] Multi-leg ticket parsing:');
    const multiRes = await ticketService.parseAndReconcile({
        rawText: '토론토 vs 밴쿠버 1.85\n뉴욕 vs 보스턴 2.10'
    });
    assert(multiRes.selections.length === 2, '2 legs extracted separately from combination ticket');

    // 6. Unified WATCH View Model Integration
    console.log('\n[UNIFIED WATCH] Combined Inbox View Model:');
    const unifiedVm = await watchService.getWatchViewModel({
        userId: 'u_founder_live',
        trackedDecisions: [apickDecision, ext1],
        currentObservations: [
            { eventId: ext1.eventId, marketId: ext1.marketId, selectionId: ext1.selectionId, odds: 1.38 }
        ]
    });
    assert(unifiedVm.activeCount === 2, 'Unified inbox contains both APICK and IMPORTED items (Count = 2)');
    const cardApick = [...unifiedVm.stable, ...unifiedVm.waiting, ...unifiedVm.importantChanges].find(c => c.decisionId === 'dec_apick_001');
    const cardExt = [...unifiedVm.stable, ...unifiedVm.waiting, ...unifiedVm.importantChanges].find(c => c.decisionId === ext1.id);
    
    assert(cardApick.provenanceLabel === 'A.PICK에서 만든 판단', 'APICK card has honest provenance label');
    assert(cardExt.provenanceLabel === '캡처에서 가져옴', 'Imported card has honest provenance label');
    assert(cardApick.watchCoverage.length === 4, 'APICK card has 4 full coverage dimensions');
    assert(cardExt.watchCoverage.length === 3, 'Imported card has 3 actual coverage dimensions');

    console.log('\n================================================================');
    console.log(`AUDIT RESULTS: ${passed} PASSED / ${failed} FAILED`);
    console.log('================================================================\n');

    if (failed > 0) process.exit(1);
}

runAudit();
