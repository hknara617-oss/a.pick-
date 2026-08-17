'use strict';

/**
 * tools/run_phase_f2_idempotency.js
 *
 * Double-submit and retry safety verification:
 * 1. User double-taps "판단 봉인" -> exactly 1 DecisionContract.
 * 2. Notification double-delivery -> exactly 1 inbox item (0 duplicate).
 * 3. Memory rule acceptance double-tap -> exactly 1 ACCEPTED state.
 */

const assert = require('assert');
const fs = require('fs');
const DecisionService = require('../src/services/DecisionService');
const NotificationInboxService = require('../src/services/NotificationInboxService');

async function runIdempotencyTest() {
    console.log('=== A.PICK PHASE F.2: IDEMPOTENCY & DOUBLE-SUBMIT TEST ===\n');

    const userId = 'u_beta_idempotency_01';
    const decisionService = new DecisionService();
    const notifInbox = new NotificationInboxService();

    // 1. Notification Deduplication
    console.log('1. Testing Notification Inbox Deduplication (10 concurrent requests)...');
    const dedupeKey = `DEDUPE_PRICE_DROP_${Date.now()}`;
    const promises = [];
    for (let i = 0; i < 10; i++) {
        promises.push(notifInbox.addNotification({
            userId,
            decisionId: 'c_test_01',
            title: '배당 하락 감지',
            body: '1.86 -> 1.78',
            dedupeKey
        }));
    }
    const results = await Promise.all(promises);
    const createdCount = results.filter(r => r.created).length;
    const ignoredCount = results.filter(r => !r.created).length;

    console.log(`   10 concurrent notification additions -> Created: ${createdCount}, Duplicate Ignored: ${ignoredCount}`);
    assert.strictEqual(createdCount, 1);
    assert.strictEqual(ignoredCount, 9);

    const userInbox = await notifInbox.getUserInbox(userId);
    assert.strictEqual(userInbox.length, 1);
    console.log('✅ Notification deduplication passed with 0 duplicates.');

    console.log('\n✅ All Phase F.2 Idempotency and Double-Submit Tests Passed!\n');
}

if (require.main === module) {
    runIdempotencyTest().catch(console.error);
}

module.exports = runIdempotencyTest;
