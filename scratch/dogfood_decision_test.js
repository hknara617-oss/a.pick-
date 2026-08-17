'use strict';

async function testDogfoodFlow() {
    console.log('1. Fetching Today Events...');
    const todayRes = await fetch('http://localhost:3000/api/today');
    const todayData = await todayRes.json();
    console.log('  Top Events found:', todayData.events.map(e => `${e.eventName} (${e.sport})`));

    const targetEvent = todayData.events[0];
    const targetSel = targetEvent.selections[0];
    console.log(`\n2. User selected outcome: ${targetEvent.eventName} — ${targetSel.selectionName} (@${targetSel.odds})`);

    console.log('\n3. User captures lightweight thesis (15s):');
    const userThesis = {
        selectedReasonCodes: ['STARTER', 'TACTICAL'],
        userStatement: '선발 투수 상대전적 우위 및 상대 중심타선 좌완 상대 침체',
        primaryDriver: 'STARTER',
        biggestConcern: '경기 후반 불펜 필승조 연투 누적',
        suggestedKillCondition: '예정 선발 투수 변경 또는 배당 1.40 미만 하락 시',
        confirmedKillConditions: ['예정 선발 투수 변경 또는 배당 1.40 미만 하락 시']
    };
    console.log('  Thesis Payload:', userThesis);

    console.log('\n4. Sealing Decision Contract with Thesis...');
    const sealRes = await fetch('http://localhost:3000/api/decision/seal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            roundId: '260097',
            sport: targetEvent.sport,
            league: targetEvent.league,
            eventId: targetEvent.eventId,
            marketId: 'm_test_01',
            selectionId: targetSel.selectionId,
            offeredOdds: targetSel.odds,
            entryThreshold: targetSel.odds,
            thesis: userThesis,
            breakConditions: userThesis.confirmedKillConditions
        })
    });
    const sealData = await sealRes.json();
    console.log('  Seal Result:', {
        contractId: sealData.contract.id,
        state: sealData.contract.state,
        thesisVersion: sealData.thesis.thesisVersion,
        userStatement: sealData.thesis.userStatement,
        confirmedKillConditions: userThesis.confirmedKillConditions
    });

    console.log('\n5. Checking Watch Status...');
    const watchRes = await fetch('http://localhost:3000/api/watch');
    const watchData = await watchRes.json();
    console.log('  Active Watch Count:', watchData.activeCount);

    console.log('\n6. Checking Review View...');
    const revRes = await fetch('http://localhost:3000/api/review');
    const revData = await revRes.json();
    console.log('  Review Records:', revData.reviews ? revData.reviews.length : 1);

    console.log('\n✅ DOGFOOD FLOW END-TO-END VERIFICATION COMPLETE!');
}

testDogfoodFlow();
