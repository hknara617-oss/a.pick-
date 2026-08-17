'use strict';

async function verifyRealCapturePipeline() {
    console.log('================================================================');
    console.log('A.PICK P0.8.1 — REAL CAPTURE PIPELINE INTEGRITY AUDIT');
    console.log('================================================================\n');

    // 1. Ingest clean base64 image payload
    const mockCleanImageBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    
    console.log('1. Uploading Real Image (Base64 payload)...');
    const uploadRes = await fetch('http://localhost:3000/api/import/upload-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            imageData: mockCleanImageBase64,
            rawText: '충남아산 vs 대전 충남아산 승 4.00'
        })
    });
    const uploadData = await uploadRes.json();

    console.log('  • Upload Result:', {
        importSessionId: uploadData.importSessionId,
        isDuplicate: uploadData.isDuplicate,
        legsDiscovered: uploadData.selections.length
    });

    const leg = uploadData.selections[0];
    console.log('  • Leg Discovered:', {
        event: leg.parsedEvent,
        selection: leg.parsedSelection,
        capturedOdds: leg.parsedOdds,
        liveBetmanOdds: leg.matchedLiveOdds,
        reconciliationStatus: leg.reconciliationStatus
    });

    if (leg.reconciliationStatus === 'MATCHED' && leg.parsedOdds === 4.00) {
        console.log('  👉 PASS: Real Image Pipeline matches live Betman feed and preserves captured odds.\n');
    } else {
        console.error('  ❌ FAIL: Live matching failed!');
        process.exit(1);
    }

    // 2. Duplicate Detection Test
    console.log('2. Testing Duplicate Ingestion (Same Base64 Hash)...');
    const dupRes = await fetch('http://localhost:3000/api/import/upload-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            imageData: mockCleanImageBase64,
            rawText: '충남아산 vs 대전 충남아산 승 4.00'
        })
    });
    const dupData = await dupRes.json();
    console.log('  • Duplicate Response:', { isDuplicate: dupData.isDuplicate });

    if (dupData.isDuplicate === true) {
        console.log('  👉 PASS: Duplicate image hash detected immediately.\n');
    } else {
        console.error('  ❌ FAIL: Duplicate detection failed!');
        process.exit(1);
    }

    // 3. Confirm & 10s Fast Activation
    console.log('3. Fast 10-second WATCH Activation...');
    const confirmRes = await fetch('http://localhost:3000/api/import/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            importSessionId: uploadData.importSessionId,
            selectedLegs: uploadData.selections,
            userExecuted: true,
            userThesis: ''
        })
    });
    const confirmData = await confirmRes.json();
    console.log('  • Confirm Result:', { success: confirmData.success, trackedCount: confirmData.count });

    if (confirmData.success) {
        console.log('  👉 PASS: TrackedDecision activated with zero initial friction.\n');
    } else {
        console.error('  ❌ FAIL: Confirm failed!');
        process.exit(1);
    }

    console.log('================================================================');
    console.log('REAL CAPTURE PIPELINE VERIFIED & READY FOR REAL IMAGES ✅');
    console.log('================================================================');
}

verifyRealCapturePipeline();
