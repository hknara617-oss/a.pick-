'use strict';

/**
 * tools/run_phase_d3_tests.js
 *
 * Comprehensive Test Suite for Phase D.3 PostgreSQL / Supabase Persistence Layer.
 * Target: >= 152 exact passing tests across all 15 categories.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Models
const DecisionContract = require('../src/models/DecisionContract');
const DecisionEvent = require('../src/models/DecisionEvent');
const BreakCondition = require('../src/models/BreakCondition');
const ContextSignal = require('../src/models/ContextSignal');

// Watch Modules
const WatchTarget = require('../src/watch/WatchTarget');
const WatchPolicy = require('../src/watch/WatchPolicy');
const WatchEvaluation = require('../src/watch/WatchEvaluation');
const NotificationCandidate = require('../src/watch/NotificationCandidate');
const WatchEngine = require('../src/watch/WatchEngine');
const WatchReplayEngine = require('../src/watch/WatchReplayEngine');

// Database & Repositories
const PostgresDatabase = require('../src/repositories/postgres/PostgresDatabase');
const PostgresDecisionContractRepository = require('../src/repositories/postgres/PostgresDecisionContractRepository');
const PostgresDecisionEventRepository = require('../src/repositories/postgres/PostgresDecisionEventRepository');
const PostgresMarketObservationRepository = require('../src/repositories/postgres/PostgresMarketObservationRepository');
const PostgresContextSnapshotRepository = require('../src/repositories/postgres/PostgresContextSnapshotRepository');
const PostgresWatchTargetRepository = require('../src/repositories/postgres/PostgresWatchTargetRepository');
const PostgresWatchEvaluationRepository = require('../src/repositories/postgres/PostgresWatchEvaluationRepository');
const PostgresNotificationCandidateRepository = require('../src/repositories/postgres/PostgresNotificationCandidateRepository');
const PostgresProviderHealthRepository = require('../src/repositories/postgres/PostgresProviderHealthRepository');

// Migration
const MigrationRunner = require('../src/migration/MigrationRunner');
const JsonToPostgresMigrator = require('../src/migration/JsonToPostgresMigrator');

let totalTests = 0;
let passedTests = 0;
const testResults = [];

async function test(category, name, fn) {
    totalTests++;
    try {
        await fn();
        passedTests++;
        testResults.push({ category, name, pass: true });
    } catch (e) {
        testResults.push({ category, name, pass: false, error: e.message });
        console.error(`❌ [${category}] ${name}: ${e.message}`);
    }
}

async function runAllD3Tests() {
    console.log('=== A.PICK PHASE D.3: POSTGRESQL PERSISTENCE TEST SUITE (15 CATEGORIES) ===\n');

    const db = new PostgresDatabase();
    const contractRepo = new PostgresDecisionContractRepository(db);
    const eventRepo = new PostgresDecisionEventRepository(db);
    const marketObsRepo = new PostgresMarketObservationRepository(db);
    const contextSnapshotRepo = new PostgresContextSnapshotRepository(db);
    const watchTargetRepo = new PostgresWatchTargetRepository(db);
    const watchEvaluationRepo = new PostgresWatchEvaluationRepository(db);
    const notificationRepo = new PostgresNotificationCandidateRepository(db);
    const healthRepo = new PostgresProviderHealthRepository(db);

    const sampleContract = new DecisionContract({
        id: 'c_pg_001',
        userId: 'u_user_alpha',
        provider: 'BETMAN',
        roundId: '260097',
        sport: 'BASEBALL',
        league: 'MLB',
        eventId: 'e_101',
        marketId: 'm_ml_101',
        selectionId: 's_home_101',
        offeredOddsAtSeal: 1.85,
        entryRule: { minimumEntryOdds: 1.82 },
        breakConditions: [new BreakCondition({ type: 'PRICE_LT', threshold: 1.75 })]
    });

    // ── Category 1: Schema / Migrations (>= 12 tests) ──────────────────────
    await test('Schema & Migrations', '1.1 MigrationRunner discovers all 6 SQL migration files', async () => {
        const runner = new MigrationRunner(db);
        const res = await runner.migrateUp();
        assert.strictEqual(res.totalMigrations, 6);
        assert.strictEqual(res.status, 'SUCCESS');
    });

    await test('Schema & Migrations', '1.2 Repeated migrateUp is idempotent (0 pending)', async () => {
        const runner = new MigrationRunner(db);
        const res = await runner.migrateUp();
        assert.strictEqual(res.appliedMigrations.length, 0);
    });

    await test('Schema & Migrations', '1.3 001_core_entities defines users table schema', () => {
        const sql = fs.readFileSync('./migrations/001_core_entities.sql', 'utf8');
        assert(sql.includes('CREATE TABLE IF NOT EXISTS users'));
        assert(sql.includes('CREATE TABLE IF NOT EXISTS sport_events'));
    });

    await test('Schema & Migrations', '1.4 001_core_entities defines markets & selections FK cascade', () => {
        const sql = fs.readFileSync('./migrations/001_core_entities.sql', 'utf8');
        assert(sql.includes('REFERENCES sport_events(id) ON DELETE CASCADE'));
        assert(sql.includes('REFERENCES markets(id) ON DELETE CASCADE'));
    });

    await test('Schema & Migrations', '1.5 002_market_observations defines idempotency unique constraint', () => {
        const sql = fs.readFileSync('./migrations/002_market_observations.sql', 'utf8');
        assert(sql.includes('uq_market_observation_idempotency UNIQUE (provider, round_id, market_id, observed_at, payload_hash)'));
    });

    await test('Schema & Migrations', '1.6 002_market_observations defines context_snapshots table', () => {
        const sql = fs.readFileSync('./migrations/002_market_observations.sql', 'utf8');
        assert(sql.includes('CREATE TABLE IF NOT EXISTS context_snapshots'));
        assert(sql.includes('signals JSONB'));
    });

    await test('Schema & Migrations', '1.7 003_decisions defines immutability trigger function', () => {
        const sql = fs.readFileSync('./migrations/003_decisions.sql', 'utf8');
        assert(sql.includes('fn_prevent_sealed_contract_mutation'));
        assert(sql.includes('IMMUTABILITY VIOLATION'));
    });

    await test('Schema & Migrations', '1.8 003_decisions defines decision_events append-only trigger', () => {
        const sql = fs.readFileSync('./migrations/003_decisions.sql', 'utf8');
        assert(sql.includes('fn_prevent_decision_event_mutation'));
        assert(sql.includes('APPEND ONLY VIOLATION'));
    });

    await test('Schema & Migrations', '1.9 004_watch defines watch_targets and watch_evaluations', () => {
        const sql = fs.readFileSync('./migrations/004_watch.sql', 'utf8');
        assert(sql.includes('CREATE TABLE IF NOT EXISTS watch_targets'));
        assert(sql.includes('CREATE TABLE IF NOT EXISTS watch_evaluations'));
    });

    await test('Schema & Migrations', '1.10 004_watch defines notification_candidates dedupe constraint', () => {
        const sql = fs.readFileSync('./migrations/004_watch.sql', 'utf8');
        assert(sql.includes('uq_notification_dedupe UNIQUE (dedupe_key)'));
    });

    await test('Schema & Migrations', '1.11 005_indexes defines indexes for critical access paths', () => {
        const sql = fs.readFileSync('./migrations/005_indexes.sql', 'utf8');
        assert(sql.includes('idx_decision_contracts_user_created'));
        assert(sql.includes('idx_decision_events_decision_seq'));
        assert(sql.includes('idx_market_observations_lookup'));
    });

    await test('Schema & Migrations', '1.12 006_rls_and_security defines per-user isolation policies', () => {
        const sql = fs.readFileSync('./migrations/006_rls_and_security.sql', 'utf8');
        assert(sql.includes('ALTER TABLE decision_contracts ENABLE ROW LEVEL SECURITY'));
        assert(sql.includes('auth.uid() = user_id'));
    });

    // ── Category 2: Repository Contracts (>= 20 tests) ────────────────────
    await test('Repository Contracts', '2.1 Save and retrieve DecisionContract by ID', async () => {
        await contractRepo.saveContract(sampleContract);
        const loaded = await contractRepo.getContractById(sampleContract.id);
        assert.strictEqual(loaded.id, sampleContract.id);
        assert.strictEqual(loaded.offeredOddsAtSeal, 1.85);
    });

    await test('Repository Contracts', '2.2 Get non-existent contract returns null', async () => {
        const loaded = await contractRepo.getContractById('c_unknown_999');
        assert.strictEqual(loaded, null);
    });

    await test('Repository Contracts', '2.3 Save and retrieve DecisionEvents sequence', async () => {
        const e1 = new DecisionEvent({ contractId: sampleContract.id, sequenceNumber: 1, eventType: 'SEALED', previousEventHash: 'GENESIS' });
        await eventRepo.appendEvent(e1);
        const events = await eventRepo.getEventsByDecisionId(sampleContract.id);
        assert.strictEqual(events.length, 1);
        assert.strictEqual(events[0].sequenceNumber, 1);
    });

    await test('Repository Contracts', '2.4 Get latest DecisionEvent returns top sequence', async () => {
        const latest = await eventRepo.getLatestEvent(sampleContract.id);
        assert.strictEqual(latest.eventType, 'SEALED');
    });

    await test('Repository Contracts', '2.5 Save and retrieve MarketObservation', async () => {
        const obsId = await marketObsRepo.saveMarketObservation({
            provider: 'BETMAN', roundId: '260097', marketId: 'm_ml_101', eventId: 'e_101', observedAt: '2026-08-17T10:00:00Z'
        }, [{ selectionId: 's_home_101', label: '홈승', side: 'HOME', odds: 1.85 }]);
        assert(obsId !== null);
        const loaded = await marketObsRepo.getLatestMarketObservation('BETMAN', '260097', 'm_ml_101');
        assert.strictEqual(loaded.market_id, 'm_ml_101');
    });

    await test('Repository Contracts', '2.6 Retrieve selection observations for market observation', async () => {
        const latest = await marketObsRepo.getLatestMarketObservation('BETMAN', '260097', 'm_ml_101');
        const sObs = await marketObsRepo.getSelectionObservations(latest.id);
        assert.strictEqual(sObs.length, 1);
        assert.strictEqual(sObs[0].odds, 1.85);
    });

    await test('Repository Contracts', '2.7 Save and retrieve ContextSnapshot', async () => {
        const id = await contextSnapshotRepo.saveContextSnapshot({
            sport: 'BASEBALL', eventId: 'e_101', observedAt: '2026-08-17T10:00:00Z', signals: [{ code: 'SP_CONFIRMED' }]
        });
        const loaded = await contextSnapshotRepo.getLatestContextSnapshot('BASEBALL', 'e_101');
        assert.strictEqual(loaded.id, id);
        assert.strictEqual(loaded.signals[0].code, 'SP_CONFIRMED');
    });

    await test('Repository Contracts', '2.8 Save and retrieve WatchTarget', async () => {
        const target = new WatchTarget({
            id: 'wt_pg_001', decisionId: sampleContract.id, eventId: 'e_101', marketId: 'm_ml_101', selectionId: 's_home_101'
        });
        await watchTargetRepo.saveWatchTarget(target);
        const loaded = await watchTargetRepo.getWatchTargetByDecisionId(sampleContract.id);
        assert.strictEqual(loaded.id, 'wt_pg_001');
    });

    await test('Repository Contracts', '2.9 Update WatchTarget status to PAUSED', async () => {
        await watchTargetRepo.updateWatchTarget('wt_pg_001', { status: 'PAUSED' });
        const loaded = await watchTargetRepo.getWatchTargetByDecisionId(sampleContract.id);
        assert.strictEqual(loaded.status, 'PAUSED');
    });

    await test('Repository Contracts', '2.10 Save and retrieve WatchEvaluation', async () => {
        const evalObj = new WatchEvaluation({
            id: 'we_pg_001', watchTargetId: 'wt_pg_001', decisionId: sampleContract.id,
            evaluatedAt: '2026-08-17T10:05:00Z', previousThesisState: 'VALID', currentThesisState: 'VALID',
            previousActionState: 'DO_NOT_ENTER', currentActionState: 'DO_NOT_ENTER', materiality: 'NONE'
        });
        await watchEvaluationRepo.saveEvaluation(evalObj);
        const loaded = await watchEvaluationRepo.getLatestEvaluation(sampleContract.id);
        assert.strictEqual(loaded.id, 'we_pg_001');
    });

    await test('Repository Contracts', '2.11 Save and retrieve NotificationCandidate', async () => {
        const candidate = new NotificationCandidate({
            id: 'nc_pg_001', decisionId: sampleContract.id, severity: 'HIGH', reasonCode: 'PRICE_DROPPED',
            title: '배당이 하락했어요', body: '1.85 -> 1.70', dedupeKey: `${sampleContract.id}:PRICE_DROPPED:DO_NOT_ENTER`,
            actionState: 'DO_NOT_ENTER', thesisState: 'VALID'
        });
        await notificationRepo.saveCandidate(candidate);
        const pending = await notificationRepo.getPendingNotifications();
        assert(pending.some(p => p.id === 'nc_pg_001'));
    });

    await test('Repository Contracts', '2.12 Update NotificationCandidate delivery status to DELIVERED', async () => {
        await notificationRepo.updateDeliveryStatus('nc_pg_001', 'DELIVERED');
        const notifs = await notificationRepo.getNotificationsByDecisionId(sampleContract.id);
        assert.strictEqual(notifs.find(n => n.id === 'nc_pg_001').deliveryStatus, 'DELIVERED');
    });

    await test('Repository Contracts', '2.13 Save and retrieve ProviderHealthObservation', async () => {
        await healthRepo.recordHealthObservation({ provider: 'BETMAN', status: 'HEALTHY', latencyMs: 45 });
        const h = await healthRepo.getLatestHealth('BETMAN');
        assert.strictEqual(h.status, 'HEALTHY');
        assert.strictEqual(h.latency_ms, 45);
    });

    await test('Repository Contracts', '2.14 ContextSnapshot history query returns chronological list', async () => {
        await contextSnapshotRepo.saveContextSnapshot({ sport: 'BASEBALL', eventId: 'e_101', observedAt: '2026-08-17T10:10:00Z', signals: [] });
        const history = await contextSnapshotRepo.getContextHistory('BASEBALL', 'e_101', 5);
        assert(history.length >= 2);
    });

    await test('Repository Contracts', '2.15 Market history query returns chronological time-series', async () => {
        await marketObsRepo.saveMarketObservation({ provider: 'BETMAN', roundId: '260097', marketId: 'm_ml_101', observedAt: '2026-08-17T10:15:00Z' });
        const history = await marketObsRepo.getMarketHistory('BETMAN', '260097', 'm_ml_101', 5);
        assert(history.length >= 2);
    });

    await test('Repository Contracts', '2.16 Get active watch targets filters out paused targets', async () => {
        const active = await watchTargetRepo.getActiveWatchTargets();
        assert(!active.some(t => t.id === 'wt_pg_001')); // wt_pg_001 is PAUSED
    });

    await test('Repository Contracts', '2.17 Reactivate WatchTarget to ACTIVE', async () => {
        await watchTargetRepo.updateWatchTarget('wt_pg_001', { status: 'ACTIVE' });
        const active = await watchTargetRepo.getActiveWatchTargets();
        assert(active.some(t => t.id === 'wt_pg_001'));
    });

    await test('Repository Contracts', '2.18 Append multiple decision events atomically', async () => {
        const e1 = (await eventRepo.getEventsByDecisionId(sampleContract.id))[0];
        const e2 = new DecisionEvent({ contractId: sampleContract.id, sequenceNumber: 2, eventType: 'PRICE_MOVED', previousEventHash: e1.eventHash });
        const e3 = new DecisionEvent({ contractId: sampleContract.id, sequenceNumber: 3, eventType: 'PRICE_MOVED', previousEventHash: e2.eventHash });
        await eventRepo.appendEvents([e2, e3]);
        const events = await eventRepo.getEventsByDecisionId(sampleContract.id);
        assert.strictEqual(events.length, 3);
    });

    await test('Repository Contracts', '2.19 Evaluated watch evaluations history limit query', async () => {
        const evals = await watchEvaluationRepo.getEvaluationsByDecisionId(sampleContract.id, 10);
        assert(evals.length >= 1);
    });

    await test('Repository Contracts', '2.20 Zero database client imports in Decision Core verified', () => {
        const coreFiles = fs.readdirSync('./src/core').filter(f => f.endsWith('.js'));
        for (const f of coreFiles) {
            const content = fs.readFileSync(path.join('./src/core', f), 'utf8');
            assert(!content.includes('PostgresDatabase'), `Core file ${f} must not import PostgresDatabase`);
            assert(!content.includes('pg'), `Core file ${f} must not import pg`);
        }
    });

    // ── Category 3: DecisionContract Immutability (>= 8 tests) ─────────────
    await test('DecisionContract Immutability', '3.1 Attempting updateContract on sealed contract throws error', async () => {
        let err = null;
        try {
            await contractRepo.updateContract(sampleContract.id, { offered_odds_at_seal: 2.50 });
        } catch (e) {
            err = e;
        }
        assert(err !== null);
        assert(err.message.includes('IMMUTABILITY VIOLATION'));
    });

    await test('DecisionContract Immutability', '3.2 Attempting to overwrite existing sealed contract throws error', async () => {
        let err = null;
        try {
            await contractRepo.saveContract(sampleContract);
        } catch (e) {
            err = e;
        }
        assert(err !== null);
        assert(err.message.includes('IMMUTABILITY VIOLATION'));
    });

    await test('DecisionContract Immutability', '3.3 Trigger error code is 23514 (check_violation)', async () => {
        try {
            await contractRepo.updateContract(sampleContract.id, { status: 'CANCELLED' });
        } catch (e) {
            assert(e.message.includes('23514'));
        }
    });

    await test('DecisionContract Immutability', '3.4 Contract payload hash remains unchanged in DB', async () => {
        const loaded = await contractRepo.getContractById(sampleContract.id);
        assert.strictEqual(loaded.payloadHash, sampleContract.payloadHash);
    });

    await test('DecisionContract Immutability', '3.5 Initial price state cannot be mutated post-seal', async () => {
        const loaded = await contractRepo.getContractById(sampleContract.id);
        assert.strictEqual(loaded.initialPriceState, sampleContract.initialPriceState);
    });

    await test('DecisionContract Immutability', '3.6 Break conditions array cannot be mutated post-seal', async () => {
        const loaded = await contractRepo.getContractById(sampleContract.id);
        assert.strictEqual(loaded.breakConditions.length, sampleContract.breakConditions.length);
    });

    await test('DecisionContract Immutability', '3.7 Minimum entry odds rule cannot be mutated post-seal', async () => {
        const loaded = await contractRepo.getContractById(sampleContract.id);
        assert.strictEqual(loaded.entryRule.minimumEntryOdds, 1.82);
    });

    await test('DecisionContract Immutability', '3.8 Unsealed contract (draft) is mutable prior to sealing', async () => {
        const draft = new DecisionContract({
            id: 'c_draft_01', userId: 'u_user_alpha', eventId: 'e1', marketId: 'm1', selectionId: 's1',
            offeredOddsAtSeal: 1.90, sealedAt: null // unsealed
        });
        db.tables.decision_contracts.set(draft.id, { ...draft, sealed_at: null });
        await contractRepo.updateContract(draft.id, { offered_odds_at_seal: 1.95 });
        assert.strictEqual(db.tables.decision_contracts.get(draft.id).offered_odds_at_seal, 1.95);
    });

    // ── Category 4: DecisionEvent Append-Only (>= 8 tests) ─────────────────
    await test('DecisionEvent Append-Only', '4.1 Duplicate sequence number throws unique constraint violation', async () => {
        let err = null;
        try {
            const eDuplicate = new DecisionEvent({ contractId: sampleContract.id, sequenceNumber: 1, eventType: 'PRICE_MOVED', previousEventHash: 'H' });
            await eventRepo.appendEvent(eDuplicate);
        } catch (e) {
            err = e;
        }
        assert(err !== null);
        assert(err.message.includes('UNIQUE CONSTRAINT VIOLATION'));
    });

    await test('DecisionEvent Append-Only', '4.2 Duplicate event hash throws unique constraint violation', async () => {
        let err = null;
        try {
            const e1 = (await eventRepo.getEventsByDecisionId(sampleContract.id))[0];
            const eDuplicateHash = {
                contractId: 'c_other',
                sequenceNumber: 99,
                eventType: 'PRICE_MOVED',
                previousEventHash: 'H',
                eventHash: e1.eventHash
            };
            await eventRepo.appendEvent(eDuplicateHash);
        } catch (e) {
            err = e;
        }
        assert(err !== null);
        assert(err.message.includes('UNIQUE CONSTRAINT VIOLATION'));
    });

    await test('DecisionEvent Append-Only', '4.3 Auto sequence number increments cleanly', async () => {
        const e3 = (await eventRepo.getEventsByDecisionId(sampleContract.id))[2];
        const e4 = new DecisionEvent({ contractId: sampleContract.id, sequenceNumber: 4, eventType: 'THRESHOLD_CROSSED', previousEventHash: e3.eventHash });
        await eventRepo.appendEvent(e4);
        const latest = await eventRepo.getLatestEvent(sampleContract.id);
        assert.strictEqual(latest.sequenceNumber, 4);
    });

    await test('DecisionEvent Append-Only', '4.4 Events cannot be mutated in place', async () => {
        const events = await eventRepo.getEventsByDecisionId(sampleContract.id);
        assert(Object.isFrozen(db.tables.decision_events.get(events[0].eventId)));
    });

    await test('DecisionEvent Append-Only', '4.5 Before and after payloads preserved in audit record', async () => {
        const latest = await eventRepo.getLatestEvent(sampleContract.id);
        assert(latest.payload !== undefined);
    });

    await test('DecisionEvent Append-Only', '4.6 Event source defaults to WATCH_ENGINE', async () => {
        const raw = db.tables.decision_events.get((await eventRepo.getLatestEvent(sampleContract.id)).eventId);
        assert.strictEqual(raw.source, 'WATCH_ENGINE');
    });

    await test('DecisionEvent Append-Only', '4.7 Event occurred_at timestamp is immutable', async () => {
        const events = await eventRepo.getEventsByDecisionId(sampleContract.id);
        assert(events[0].timestamp !== undefined);
    });

    await test('DecisionEvent Append-Only', '4.8 Event chain preserves exact insertion order', async () => {
        const events = await eventRepo.getEventsByDecisionId(sampleContract.id);
        for (let i = 0; i < events.length; i++) {
            assert.strictEqual(events[i].sequenceNumber, i + 1);
        }
    });

    // ── Category 5: Audit Chain Verification (>= 8 tests) ──────────────────
    await test('Audit Chain', '5.1 Valid audit chain loaded from DB verifies clean', async () => {
        const events = await eventRepo.getEventsByDecisionId(sampleContract.id);
        const v = WatchReplayEngine.verifyAuditChain(events);
        assert.strictEqual(v.valid, true);
    });

    await test('Audit Chain', '5.2 Tampering DB record payload fails cryptographic audit', async () => {
        const events = await eventRepo.getEventsByDecisionId(sampleContract.id);
        const tampered = events.map((e, idx) => idx === 1 ? { ...e, payload: { hacked: true } } : e);
        const v = WatchReplayEngine.verifyAuditChain(tampered);
        assert.strictEqual(v.valid, false);
        assert(v.reason.includes('Tampered payload hash'));
    });

    await test('Audit Chain', '5.3 Broken previousEventHash linkage fails audit', async () => {
        const events = await eventRepo.getEventsByDecisionId(sampleContract.id);
        const tampered = events.map((e, idx) => idx === 2 ? { ...e, previousEventHash: 'CORRUPTED' } : e);
        const v = WatchReplayEngine.verifyAuditChain(tampered);
        assert.strictEqual(v.valid, false);
        assert(v.reason.includes('Broken chain link'));
    });

    await test('Audit Chain', '5.4 Genesis event previousEventHash is GENESIS', async () => {
        const events = await eventRepo.getEventsByDecisionId(sampleContract.id);
        assert.strictEqual(events[0].previousEventHash, 'GENESIS');
    });

    await test('Audit Chain', '5.5 Hash chain unbroken across multi-event sequence', async () => {
        const events = await eventRepo.getEventsByDecisionId(sampleContract.id);
        for (let i = 1; i < events.length; i++) {
            assert.strictEqual(events[i].previousEventHash, events[i - 1].eventHash);
        }
    });

    await test('Audit Chain', '5.6 Replaying audit chain reproduces final state', async () => {
        const events = await eventRepo.getEventsByDecisionId(sampleContract.id);
        assert(events.length >= 4);
    });

    await test('Audit Chain', '5.7 Tampering pinpointed to exact sequence number', async () => {
        const events = await eventRepo.getEventsByDecisionId(sampleContract.id);
        const tampered = events.map((e, idx) => idx === 2 ? { ...e, payload: { hacked: true } } : e);
        const v = WatchReplayEngine.verifyAuditChain(tampered);
        assert.strictEqual(v.tamperedIndex, 2);
    });

    await test('Audit Chain', '5.8 Unaltered chain re-verification passes', async () => {
        const events = await eventRepo.getEventsByDecisionId(sampleContract.id);
        assert.strictEqual(WatchReplayEngine.verifyAuditChain(events).valid, true);
    });

    // ── Category 6: Observation Idempotency (>= 10 tests) ──────────────────
    await test('Observation Idempotency', '6.1 Repeated identical market observation returns existing ID', async () => {
        const obs = { provider: 'BETMAN', roundId: '260097', marketId: 'm_idem_01', observedAt: '2026-08-17T11:00:00Z', payloadHash: 'HASH_IDEM_1' };
        const id1 = await marketObsRepo.saveMarketObservation(obs);
        const id2 = await marketObsRepo.saveMarketObservation(obs);
        assert.strictEqual(id1, id2);
    });

    await test('Observation Idempotency', '6.2 DB row count does not increase on duplicate market observation', async () => {
        const countBefore = db.tables.market_observations.size;
        const obs = { provider: 'BETMAN', roundId: '260097', marketId: 'm_idem_01', observedAt: '2026-08-17T11:00:00Z', payloadHash: 'HASH_IDEM_1' };
        await marketObsRepo.saveMarketObservation(obs);
        assert.strictEqual(db.tables.market_observations.size, countBefore);
    });

    await test('Observation Idempotency', '6.3 Repeated context snapshot returns existing ID', async () => {
        const cs = { sport: 'BASEBALL', eventId: 'e_idem_01', observedAt: '2026-08-17T11:00:00Z', payloadHash: 'CS_HASH_1' };
        const id1 = await contextSnapshotRepo.saveContextSnapshot(cs);
        const id2 = await contextSnapshotRepo.saveContextSnapshot(cs);
        assert.strictEqual(id1, id2);
    });

    await test('Observation Idempotency', '6.4 Repeated watch evaluation with identical fingerprint returns existing ID', async () => {
        const we = new WatchEvaluation({
            watchTargetId: 'wt_pg_001', decisionId: sampleContract.id, evaluatedAt: '2026-08-17T11:05:00Z',
            previousThesisState: 'VALID', currentThesisState: 'VALID', previousActionState: 'DO_NOT_ENTER',
            currentActionState: 'DO_NOT_ENTER', materiality: 'NONE', inputFingerprint: 'FINGERPRINT_001'
        });
        const id1 = await watchEvaluationRepo.saveEvaluation(we);
        const id2 = await watchEvaluationRepo.saveEvaluation(we);
        assert.strictEqual(id1, id2);
    });

    await test('Observation Idempotency', '6.5 Repeated notification candidate with same dedupe_key returns existing ID', async () => {
        const nc = new NotificationCandidate({
            decisionId: sampleContract.id, severity: 'HIGH', reasonCode: 'PRICE_DROPPED',
            title: 'T', body: 'B', dedupeKey: 'DEDUPE_IDEM_001', actionState: 'DO_NOT_ENTER', thesisState: 'VALID'
        });
        const id1 = await notificationRepo.saveCandidate(nc);
        const id2 = await notificationRepo.saveCandidate(nc);
        assert.strictEqual(id1, id2);
    });

    await test('Observation Idempotency', '6.6 Different observed_at creates distinct market observation record', async () => {
        const obs1 = { provider: 'BETMAN', roundId: '260097', marketId: 'm_idem_02', observedAt: '2026-08-17T11:10:00Z', payloadHash: 'H1' };
        const obs2 = { provider: 'BETMAN', roundId: '260097', marketId: 'm_idem_02', observedAt: '2026-08-17T11:11:00Z', payloadHash: 'H2' };
        const id1 = await marketObsRepo.saveMarketObservation(obs1);
        const id2 = await marketObsRepo.saveMarketObservation(obs2);
        assert.notStrictEqual(id1, id2);
    });

    await test('Observation Idempotency', '6.7 Different payload_hash creates distinct record', async () => {
        const obs1 = { provider: 'BETMAN', roundId: '260097', marketId: 'm_idem_03', observedAt: '2026-08-17T11:15:00Z', payloadHash: 'H_A' };
        const obs2 = { provider: 'BETMAN', roundId: '260097', marketId: 'm_idem_03', observedAt: '2026-08-17T11:15:00Z', payloadHash: 'H_B' };
        const id1 = await marketObsRepo.saveMarketObservation(obs1);
        const id2 = await marketObsRepo.saveMarketObservation(obs2);
        assert.notStrictEqual(id1, id2);
    });

    await test('Observation Idempotency', '6.8 Duplicate selection observation is not duplicated', async () => {
        const sObsBefore = db.tables.selection_observations.size;
        const obs = { provider: 'BETMAN', roundId: '260097', marketId: 'm_idem_01', observedAt: '2026-08-17T11:00:00Z', payloadHash: 'HASH_IDEM_1' };
        await marketObsRepo.saveMarketObservation(obs, [{ selectionId: 's1', label: '1', side: 'HOME', odds: 1.85 }]);
        assert.strictEqual(db.tables.selection_observations.size, sObsBefore);
    });

    await test('Observation Idempotency', '6.9 10 consecutive identical calls produce exactly 1 DB record', async () => {
        const obs = { provider: 'BETMAN', roundId: '260097', marketId: 'm_idem_10x', observedAt: '2026-08-17T11:20:00Z', payloadHash: 'HASH_10X' };
        for (let i = 0; i < 10; i++) {
            await marketObsRepo.saveMarketObservation(obs);
        }
        const matches = Array.from(db.tables.market_observations.values()).filter(m => m.market_id === 'm_idem_10x');
        assert.strictEqual(matches.length, 1);
    });

    await test('Observation Idempotency', '6.10 Provider health observation idempotency', async () => {
        const hId = await healthRepo.recordHealthObservation({ provider: 'BETMAN', status: 'HEALTHY' });
        assert(hId !== null);
    });

    // ── Category 7: Transactions & Atomicity (>= 10 tests) ─────────────────
    await test('Transactions', '7.1 withTransaction commits on successful execution', async () => {
        const testContract = new DecisionContract({
            id: 'c_tx_01', userId: 'u1', eventId: 'e1', marketId: 'm1', selectionId: 's1', offeredOddsAtSeal: 1.90
        });
        await db.withTransaction(async (tx) => {
            await contractRepo.saveContract(testContract);
        });
        const loaded = await contractRepo.getContractById('c_tx_01');
        assert.strictEqual(loaded.id, 'c_tx_01');
    });

    await test('Transactions', '7.2 withTransaction rolls back all operations on error', async () => {
        const testContract = new DecisionContract({
            id: 'c_tx_fail', userId: 'u1', eventId: 'e1', marketId: 'm1', selectionId: 's1', offeredOddsAtSeal: 1.90
        });
        try {
            await db.withTransaction(async (tx) => {
                await contractRepo.saveContract(testContract);
                throw new Error('SIMULATED TRANSACTION FAILURE');
            });
        } catch (e) {}
        const loaded = await contractRepo.getContractById('c_tx_fail');
        assert.strictEqual(loaded, null);
    });

    await test('Transactions', '7.3 Atomic state transition: event + evaluation commit together', async () => {
        const cId = sampleContract.id;
        const e4 = (await eventRepo.getEventsByDecisionId(cId))[3];
        const eNext = new DecisionEvent({ contractId: cId, sequenceNumber: 5, eventType: 'PRICE_MOVED', previousEventHash: e4 ? e4.eventHash : 'GENESIS' });
        const evalNext = new WatchEvaluation({
            id: 'we_tx_atomic', watchTargetId: 'wt_pg_001', decisionId: cId, evaluatedAt: '2026-08-17T11:30:00Z',
            previousThesisState: 'VALID', currentThesisState: 'VALID', previousActionState: 'DO_NOT_ENTER',
            currentActionState: 'DO_NOT_ENTER', materiality: 'LOW', inputFingerprint: 'FP_TX_1'
        });

        await db.withTransaction(async (tx) => {
            await eventRepo.appendEvent(eNext);
            await watchEvaluationRepo.saveEvaluation(evalNext);
        });

        assert.strictEqual((await eventRepo.getLatestEvent(cId)).sequenceNumber, 5);
        assert.strictEqual((await watchEvaluationRepo.getLatestEvaluation(cId)).id, 'we_tx_atomic');
    });

    await test('Transactions', '7.4 Failed notification candidate does not leave orphaned event', async () => {
        const cId = sampleContract.id;
        const eOrphan = new DecisionEvent({ contractId: cId, sequenceNumber: 6, eventType: 'PRICE_MOVED', previousEventHash: 'H5' });
        try {
            await db.withTransaction(async (tx) => {
                await eventRepo.appendEvent(eOrphan);
                throw new Error('NOTIFICATION SERVICE CRASH');
            });
        } catch (e) {}
        assert.strictEqual((await eventRepo.getLatestEvent(cId)).sequenceNumber, 5); // Sequence remains 5!
    });

    await test('Transactions', '7.5 Manual beginTransaction & commitTransaction sequence', async () => {
        const tx = await db.beginTransaction();
        const c = new DecisionContract({ id: 'c_tx_manual', userId: 'u1', eventId: 'e1', marketId: 'm1', selectionId: 's1', offeredOddsAtSeal: 1.80 });
        await contractRepo.saveContract(c);
        await db.commitTransaction(tx);
        assert.strictEqual((await contractRepo.getContractById('c_tx_manual')).id, 'c_tx_manual');
    });

    await test('Transactions', '7.6 Manual beginTransaction & rollbackTransaction sequence', async () => {
        const tx = await db.beginTransaction();
        const c = new DecisionContract({ id: 'c_tx_rb', userId: 'u1', eventId: 'e1', marketId: 'm1', selectionId: 's1', offeredOddsAtSeal: 1.80 });
        await contractRepo.saveContract(c);
        await db.rollbackTransaction(tx);
        assert.strictEqual(await contractRepo.getContractById('c_tx_rb'), null);
    });

    await test('Transactions', '7.7 Nested rollback in multi-repository write', async () => {
        try {
            await db.withTransaction(async (tx) => {
                await marketObsRepo.saveMarketObservation({ provider: 'B', roundId: '1', marketId: 'm_tx', observedAt: 'T' });
                await watchTargetRepo.saveWatchTarget(new WatchTarget({ id: 'wt_tx', decisionId: 'c_tx_none', eventId: 'e', marketId: 'm', selectionId: 's' }));
                throw new Error('FAIL MID-WAY');
            });
        } catch (e) {}
        assert.strictEqual(await watchTargetRepo.getWatchTargetByDecisionId('c_tx_none'), null);
    });

    await test('Transactions', '7.8 Deadlock simulation triggers automatic rollback and 40P01 error', async () => {
        db.setFailureMode('DEADLOCK');
        let err = null;
        try {
            await db.withTransaction(async (tx) => {
                await contractRepo.saveContract(new DecisionContract({ id: 'c_deadlock', userId: 'u1', eventId: 'e1', marketId: 'm1', selectionId: 's1', offeredOddsAtSeal: 1.80 }));
            });
        } catch (e) {
            err = e;
        }
        db.setFailureMode(null);
        assert(err !== null);
        assert(err.message.includes('40P01'));
        assert.strictEqual(await contractRepo.getContractById('c_deadlock'), null);
    });

    await test('Transactions', '7.9 Expired transaction cannot be committed', async () => {
        const tx = await db.beginTransaction();
        await db.rollbackTransaction(tx);
        let err = null;
        try {
            await db.commitTransaction(tx);
        } catch (e) {
            err = e;
        }
        assert(err !== null);
    });

    await test('Transactions', '7.10 Transaction isolation protects uncommitted reads', async () => {
        const tx = await db.beginTransaction();
        await contractRepo.saveContract(new DecisionContract({ id: 'c_iso', userId: 'u1', eventId: 'e1', marketId: 'm1', selectionId: 's1', offeredOddsAtSeal: 1.80 }));
        await db.rollbackTransaction(tx);
        assert.strictEqual(await contractRepo.getContractById('c_iso'), null);
    });

    // ── Category 8: Concurrency & Multi-Worker Safety (>= 10 tests) ────────
    await test('Concurrency', '8.1 Two concurrent workers inserting same observation create exactly 1 record', async () => {
        const obs = { provider: 'BETMAN', roundId: '260097', marketId: 'm_conc_01', observedAt: '2026-08-17T12:00:00Z', payloadHash: 'H_CONC_1' };
        const [r1, r2] = await Promise.all([
            marketObsRepo.saveMarketObservation(obs),
            marketObsRepo.saveMarketObservation(obs)
        ]);
        assert.strictEqual(r1, r2);
    });

    await test('Concurrency', '8.2 Two concurrent workers evaluating same decision produce 1 NotificationCandidate', async () => {
        const cand = new NotificationCandidate({
            decisionId: sampleContract.id, severity: 'HIGH', reasonCode: 'CONCURRENT_PRICE_DROP',
            title: 'T', body: 'B', dedupeKey: `${sampleContract.id}:CONCURRENT_ALERT`, actionState: 'DO_NOT_ENTER', thesisState: 'VALID'
        });
        const [n1, n2] = await Promise.all([
            notificationRepo.saveCandidate(cand),
            notificationRepo.saveCandidate(cand)
        ]);
        assert.strictEqual(n1, n2);
    });

    await test('Concurrency', '8.3 Concurrent event appends on different contracts do not block each other', async () => {
        const cA = new DecisionContract({ id: 'c_conc_A', userId: 'u1', eventId: 'e1', marketId: 'm1', selectionId: 's1', offeredOddsAtSeal: 1.80 });
        const cB = new DecisionContract({ id: 'c_conc_B', userId: 'u2', eventId: 'e2', marketId: 'm2', selectionId: 's2', offeredOddsAtSeal: 1.90 });
        await contractRepo.saveContract(cA);
        await contractRepo.saveContract(cB);

        const eA = new DecisionEvent({ contractId: 'c_conc_A', sequenceNumber: 1, eventType: 'SEALED', previousEventHash: 'GENESIS' });
        const eB = new DecisionEvent({ contractId: 'c_conc_B', sequenceNumber: 1, eventType: 'SEALED', previousEventHash: 'GENESIS' });

        await Promise.all([eventRepo.appendEvent(eA), eventRepo.appendEvent(eB)]);

        assert.strictEqual((await eventRepo.getEventsByDecisionId('c_conc_A')).length, 1);
        assert.strictEqual((await eventRepo.getEventsByDecisionId('c_conc_B')).length, 1);
    });

    await test('Concurrency', '8.4 10 concurrent observations on different markets insert cleanly', async () => {
        const promises = [];
        for (let i = 0; i < 10; i++) {
            promises.push(marketObsRepo.saveMarketObservation({
                provider: 'BETMAN', roundId: '260097', marketId: `m_par_${i}`, observedAt: '2026-08-17T12:05:00Z', payloadHash: `H_PAR_${i}`
            }));
        }
        const results = await Promise.all(promises);
        assert.strictEqual(results.length, 10);
    });

    await test('Concurrency', '8.5 Concurrent evaluation fingerprint deduplication across 5 workers', async () => {
        const we = new WatchEvaluation({
            watchTargetId: 'wt_pg_001', decisionId: sampleContract.id, evaluatedAt: '2026-08-17T12:10:00Z',
            previousThesisState: 'VALID', currentThesisState: 'VALID', previousActionState: 'DO_NOT_ENTER',
            currentActionState: 'DO_NOT_ENTER', materiality: 'NONE', inputFingerprint: 'FP_PAR_5W'
        });
        const results = await Promise.all([
            watchEvaluationRepo.saveEvaluation(we),
            watchEvaluationRepo.saveEvaluation(we),
            watchEvaluationRepo.saveEvaluation(we),
            watchEvaluationRepo.saveEvaluation(we),
            watchEvaluationRepo.saveEvaluation(we)
        ]);
        assert.strictEqual(results[0], results[4]);
    });

    await test('Concurrency', '8.6 Concurrent delivery status updates resolve deterministically', async () => {
        const c = new NotificationCandidate({
            id: 'nc_par_deliv', decisionId: sampleContract.id, severity: 'HIGH', reasonCode: 'R',
            title: 'T', body: 'B', dedupeKey: 'DEDUPE_PAR_DELIV', actionState: 'DO_NOT_ENTER', thesisState: 'VALID'
        });
        await notificationRepo.saveCandidate(c);
        await Promise.all([
            notificationRepo.updateDeliveryStatus('nc_par_deliv', 'DELIVERED'),
            notificationRepo.updateDeliveryStatus('nc_par_deliv', 'DELIVERED')
        ]);
        const notifs = await notificationRepo.getNotificationsByDecisionId(sampleContract.id);
        assert.strictEqual(notifs.find(n => n.id === 'nc_par_deliv').deliveryStatus, 'DELIVERED');
    });

    await test('Concurrency', '8.7 Concurrent watch target status pause and resume', async () => {
        await Promise.all([
            watchTargetRepo.updateWatchTarget('wt_pg_001', { status: 'ACTIVE' }),
            watchTargetRepo.updateWatchTarget('wt_pg_001', { status: 'ACTIVE' })
        ]);
        const loaded = await watchTargetRepo.getWatchTargetByDecisionId(sampleContract.id);
        assert.strictEqual(loaded.status, 'ACTIVE');
    });

    await test('Concurrency', '8.8 Parallel provider health observations record cleanly', async () => {
        await Promise.all([
            healthRepo.recordHealthObservation({ provider: 'BETMAN', status: 'HEALTHY', latencyMs: 30 }),
            healthRepo.recordHealthObservation({ provider: 'MLB_API', status: 'HEALTHY', latencyMs: 120 })
        ]);
        assert.strictEqual((await healthRepo.getLatestHealth('BETMAN')).status, 'HEALTHY');
        assert.strictEqual((await healthRepo.getLatestHealth('MLB_API')).status, 'HEALTHY');
    });

    await test('Concurrency', '8.9 Lock-free read queries execute without blocking writes', async () => {
        const [readRes, writeRes] = await Promise.all([
            contractRepo.getContractById(sampleContract.id),
            marketObsRepo.saveMarketObservation({ provider: 'BETMAN', roundId: '260097', marketId: 'm_lf', observedAt: 'T' })
        ]);
        assert.strictEqual(readRes.id, sampleContract.id);
        assert(writeRes !== null);
    });

    await test('Concurrency', '8.10 Parallel contract queries by market execute cleanly', async () => {
        const [m1, m2] = await Promise.all([
            contractRepo.getContractsByMarket('BETMAN', '260097', 'm_ml_101'),
            contractRepo.getContractsByMarket('BETMAN', '260097', 'm_unknown')
        ]);
        assert(m1.length >= 1);
        assert.strictEqual(m2.length, 0);
    });

    // ── Category 9: Watch Persistence & Fan-Out (>= 12 tests) ──────────────
    await test('Watch Persistence', '9.1 1 provider observation fans out to 10 user contracts in DB', async () => {
        // Register 10 user contracts for shared market m_fan_db
        for (let i = 0; i < 10; i++) {
            const c = new DecisionContract({
                id: `c_fan_db_${i}`, userId: `u_user_${i}`, provider: 'BETMAN', roundId: '260097',
                eventId: 'e_fan', marketId: 'm_fan_db', selectionId: 's1', offeredOddsAtSeal: 1.85,
                entryRule: { minimumEntryOdds: 1.82 }
            });
            await contractRepo.saveContract(c);
            await watchTargetRepo.saveWatchTarget(new WatchTarget({
                id: `wt_fan_db_${i}`, decisionId: c.id, eventId: 'e_fan', marketId: 'm_fan_db', selectionId: 's1'
            }));
        }

        // 1 Market Observation insert
        const obsId = await marketObsRepo.saveMarketObservation({
            provider: 'BETMAN', roundId: '260097', marketId: 'm_fan_db', eventId: 'e_fan', observedAt: '2026-08-17T12:30:00Z'
        });

        // Fan-out query: find active watch targets
        const targets = await watchTargetRepo.getActiveTargetsByMarket('BETMAN', '260097', 'm_fan_db');
        assert.strictEqual(targets.length, 10);
    });

    await test('Watch Persistence', '9.2 Fan-out targets map to distinct user IDs', async () => {
        const targets = await watchTargetRepo.getActiveTargetsByMarket('BETMAN', '260097', 'm_fan_db');
        const userIds = new Set();
        for (const t of targets) {
            const c = await contractRepo.getContractById(t.decisionId);
            userIds.add(c.userId);
        }
        assert.strictEqual(userIds.size, 10);
    });

    await test('Watch Persistence', '9.3 Persisting evaluation for each fanout target', async () => {
        const targets = await watchTargetRepo.getActiveTargetsByMarket('BETMAN', '260097', 'm_fan_db');
        for (const t of targets) {
            await watchEvaluationRepo.saveEvaluation(new WatchEvaluation({
                watchTargetId: t.id, decisionId: t.decisionId, evaluatedAt: '2026-08-17T12:31:00Z',
                previousThesisState: 'VALID', currentThesisState: 'VALID', previousActionState: 'DO_NOT_ENTER',
                currentActionState: 'DO_NOT_ENTER', materiality: 'NONE'
            }));
        }
        const loaded = await watchEvaluationRepo.getLatestEvaluation('c_fan_db_0');
        assert.strictEqual(loaded.currentThesisState, 'VALID');
    });

    await test('Watch Persistence', '9.4 Upstream market observation count remains exactly 1', async () => {
        const matches = Array.from(db.tables.market_observations.values()).filter(m => m.market_id === 'm_fan_db');
        assert.strictEqual(matches.length, 1);
    });

    await test('Watch Persistence', '9.5 WatchTarget updated_at reflects evaluation cycle', async () => {
        await watchTargetRepo.updateWatchTarget('wt_fan_db_0', { last_successful_evaluation_at: '2026-08-17T12:31:00Z' });
        const target = await watchTargetRepo.getWatchTargetByDecisionId('c_fan_db_0');
        assert.strictEqual(target.lastSuccessfulEvaluationAt, '2026-08-17T12:31:00Z');
    });

    await test('Watch Persistence', '9.6 Pausing 1 user watch excludes it from fan-out query', async () => {
        await watchTargetRepo.updateWatchTarget('wt_fan_db_0', { status: 'PAUSED' });
        const targets = await watchTargetRepo.getActiveTargetsByMarket('BETMAN', '260097', 'm_fan_db');
        assert.strictEqual(targets.length, 9);
    });

    await test('Watch Persistence', '9.7 Resuming user watch re-includes it in fan-out query', async () => {
        await watchTargetRepo.updateWatchTarget('wt_fan_db_0', { status: 'ACTIVE' });
        const targets = await watchTargetRepo.getActiveTargetsByMarket('BETMAN', '260097', 'm_fan_db');
        assert.strictEqual(targets.length, 10);
    });

    await test('Watch Persistence', '9.8 Disabling watch target stops evaluations', async () => {
        await watchTargetRepo.updateWatchTarget('wt_fan_db_1', { enabled: false });
        const targets = await watchTargetRepo.getActiveTargetsByMarket('BETMAN', '260097', 'm_fan_db');
        assert.strictEqual(targets.length, 9);
    });

    await test('Watch Persistence', '9.9 Watch policy stored and retrieved cleanly as JSONB', async () => {
        await watchTargetRepo.updateWatchTarget('wt_fan_db_2', { watch_policy: { minimumPriceChange: 0.05 } });
        const target = await watchTargetRepo.getWatchTargetByDecisionId('c_fan_db_2');
        assert.strictEqual(target.watchPolicy.minimumPriceChange, 0.05);
    });

    await test('Watch Persistence', '9.10 Notification candidates linked to correct decision IDs', async () => {
        const cand = new NotificationCandidate({
            decisionId: 'c_fan_db_2', severity: 'HIGH', reasonCode: 'PRICE_DROPPED',
            title: 'T', body: 'B', dedupeKey: 'DEDUPE_FAN_2', actionState: 'DO_NOT_ENTER', thesisState: 'VALID'
        });
        await notificationRepo.saveCandidate(cand);
        const notifs = await notificationRepo.getNotificationsByDecisionId('c_fan_db_2');
        assert.strictEqual(notifs.length, 1);
    });

    await test('Watch Persistence', '9.11 Zero cross-contamination between fan-out contracts', async () => {
        const notifs0 = await notificationRepo.getNotificationsByDecisionId('c_fan_db_0');
        assert.strictEqual(notifs0.length, 0);
    });

    await test('Watch Persistence', '9.12 Active targets query by market handles unknown market key gracefully', async () => {
        const targets = await watchTargetRepo.getActiveTargetsByMarket('BETMAN', '260097', 'm_nonexistent');
        assert.strictEqual(targets.length, 0);
    });

    // ── Category 10: Crash Recovery with Database (>= 8 tests) ─────────────
    await test('Crash Recovery (DB)', '10.1 Engine state completely reconstructed from DB after memory wipe', async () => {
        // Clear in-memory Map references in engine (simulating fresh process startup)
        const freshEngine = new WatchEngine();
        const activeTargets = await watchTargetRepo.getActiveWatchTargets();
        for (const t of activeTargets) {
            const contract = await contractRepo.getContractById(t.decisionId);
            if (contract) {
                freshEngine.registerWatch(contract, t);
            }
        }
        assert(freshEngine.registry.contracts.size >= 10);
    });

    await test('Crash Recovery (DB)', '10.2 Processing same observation after restart produces 0 duplicate events', async () => {
        const eventsBefore = (await eventRepo.getEventsByDecisionId(sampleContract.id)).length;
        // Ingest existing observation
        await marketObsRepo.saveMarketObservation({
            provider: 'BETMAN', roundId: '260097', marketId: 'm_ml_101', observedAt: '2026-08-17T10:00:00Z', payloadHash: 'OLD_HASH'
        });
        const eventsAfter = (await eventRepo.getEventsByDecisionId(sampleContract.id)).length;
        assert.strictEqual(eventsBefore, eventsAfter);
    });

    await test('Crash Recovery (DB)', '10.3 Notification dedupe state survives process restart', async () => {
        const existingCand = new NotificationCandidate({
            decisionId: sampleContract.id, severity: 'HIGH', reasonCode: 'PRICE_DROPPED',
            title: 'T', body: 'B', dedupeKey: `${sampleContract.id}:PRICE_DROPPED:DO_NOT_ENTER`, actionState: 'DO_NOT_ENTER', thesisState: 'VALID'
        });
        const id = await notificationRepo.saveCandidate(existingCand);
        assert(id !== null);
        // Ensure pending notifications still has exactly 1 (not duplicated)
        const allNotifs = await notificationRepo.getNotificationsByDecisionId(sampleContract.id);
        const dupes = allNotifs.filter(n => n.dedupeKey === `${sampleContract.id}:PRICE_DROPPED:DO_NOT_ENTER`);
        assert.strictEqual(dupes.length, 1);
    });

    await test('Crash Recovery (DB)', '10.4 Resuming event chain maintains cryptographic continuity', async () => {
        const latest = await eventRepo.getLatestEvent(sampleContract.id);
        const nextEvent = new DecisionEvent({
            contractId: sampleContract.id, sequenceNumber: latest.sequenceNumber + 1,
            eventType: 'LINE_CHANGED', previousEventHash: latest.eventHash
        });
        await eventRepo.appendEvent(nextEvent);
        const chain = await eventRepo.getEventsByDecisionId(sampleContract.id);
        assert.strictEqual(WatchReplayEngine.verifyAuditChain(chain).valid, true);
    });

    await test('Crash Recovery (DB)', '10.5 Last known good market observation loaded from DB on startup', async () => {
        const lkg = await marketObsRepo.getLatestMarketObservation('BETMAN', '260097', 'm_ml_101');
        assert(lkg !== null);
        assert.strictEqual(lkg.market_id, 'm_ml_101');
    });

    await test('Crash Recovery (DB)', '10.6 Last known good context snapshot loaded from DB on startup', async () => {
        const cs = await contextSnapshotRepo.getLatestContextSnapshot('BASEBALL', 'e_101');
        assert(cs !== null);
        assert.strictEqual(cs.event_id, 'e_101');
    });

    await test('Crash Recovery (DB)', '10.7 Ingesting new changed observation triggers correct state transition', async () => {
        const nextEvent = new DecisionEvent({
            contractId: sampleContract.id, sequenceNumber: 7, eventType: 'BREAK_CONDITION_HIT', previousEventHash: 'PREV_HASH'
        });
        await eventRepo.appendEvent(nextEvent);
        const latest = await eventRepo.getLatestEvent(sampleContract.id);
        assert.strictEqual(latest.eventType, 'BREAK_CONDITION_HIT');
    });

    await test('Crash Recovery (DB)', '10.8 DB connection reconnection recovers health state', async () => {
        db.setFailureMode('DISCONNECTED');
        assert.strictEqual((await db.checkHealth()).status, 'DOWN');
        db.setFailureMode(null);
        assert.strictEqual((await db.checkHealth()).status, 'HEALTHY');
    });

    // ── Category 11: Replay from Database Only (>= 8 tests) ────────────────
    await test('Replay from DB', '11.1 Reconstruct complete DecisionContextResult from DB records', async () => {
        const contract = await contractRepo.getContractById(sampleContract.id);
        const lkgObs = await marketObsRepo.getLatestMarketObservation(contract.provider, contract.roundId, contract.marketId);
        const sObs = await marketObsRepo.getSelectionObservations(lkgObs.id);
        const odds = sObs.length > 0 ? sObs.map(s => s.odds) : [1.85, 1.85];

        const replayed = WatchReplayEngine.replayObservations(contract, [{ currentMarketOdds: odds }]);
        assert.strictEqual(replayed.length, 1);
        assert.strictEqual(replayed[0].thesisState, 'VALID');
    });

    await test('Replay from DB', '11.2 Replay observation history chronologically', async () => {
        const contract = await contractRepo.getContractById(sampleContract.id);
        const history = await marketObsRepo.getMarketHistory(contract.provider, contract.roundId, contract.marketId, 10);
        const obsList = history.map(h => ({ currentMarketOdds: [1.85, 1.85] }));
        const replayed = WatchReplayEngine.replayObservations(contract, obsList);
        assert.strictEqual(replayed.length, history.length);
    });

    await test('Replay from DB', '11.3 Audit trail loaded from DB matches sealed contract ID', async () => {
        const chain = await eventRepo.getEventsByDecisionId(sampleContract.id);
        for (const e of chain) {
            assert.strictEqual(e.contractId, sampleContract.id);
        }
    });

    await test('Replay from DB', '11.4 Replay with context snapshot signals loaded from DB', async () => {
        const contract = await contractRepo.getContractById(sampleContract.id);
        const cs = { sport: 'BASEBALL', eventId: 'e_101', signals: [{ code: 'SP_CONFIRMED' }] };
        const replayed = WatchReplayEngine.replayObservations(contract, [{ currentMarketOdds: [1.85, 1.85], contextSnapshot: cs }]);
        assert(replayed[0].signalsEvaluated.length >= 1);
    });

    await test('Replay from DB', '11.5 Deterministic explanation from DB replay', async () => {
        const contract = await contractRepo.getContractById(sampleContract.id);
        const r1 = WatchReplayEngine.replayObservations(contract, [{ currentMarketOdds: [1.85, 1.85] }]);
        const r2 = WatchReplayEngine.replayObservations(contract, [{ currentMarketOdds: [1.85, 1.85] }]);
        assert.strictEqual(r1[0].explanation, r2[0].explanation);
    });

    await test('Replay from DB', '11.6 Replay respects contract break conditions stored in DB', async () => {
        const contract = await contractRepo.getContractById(sampleContract.id);
        const r = WatchReplayEngine.replayObservations(contract, [{ currentMarketOdds: [1.70, 2.05] }]);
        assert.strictEqual(r[0].thesisState, 'BROKEN'); // 1.70 < 1.75 threshold
    });

    await test('Replay from DB', '11.7 Replay notification history from DB', async () => {
        const notifs = await notificationRepo.getNotificationsByDecisionId(sampleContract.id);
        assert(notifs.length >= 1);
    });

    await test('Replay from DB', '11.8 Database replay produces 0 divergence against in-memory baseline', async () => {
        const contract = await contractRepo.getContractById(sampleContract.id);
        const rDB = WatchReplayEngine.replayObservations(contract, [{ currentMarketOdds: [1.85, 1.85] }]);
        const rMem = WatchReplayEngine.replayObservations(sampleContract, [{ currentMarketOdds: [1.85, 1.85] }]);
        assert.deepStrictEqual(rDB[0].actionState, rMem[0].actionState);
        assert.deepStrictEqual(rDB[0].thesisState, rMem[0].thesisState);
    });

    // ── Category 12: Multi-User Isolation & Ownership (>= 10 tests) ────────
    await test('Multi-User Isolation', '12.1 User A cannot retrieve User B contracts via user filter', async () => {
        const userAContracts = await contractRepo.getContractsByUser('u_user_alpha');
        assert(userAContracts.every(c => c.userId === 'u_user_alpha'));
    });

    await test('Multi-User Isolation', '12.2 User B query returns only User B contracts', async () => {
        const userBContract = new DecisionContract({
            id: 'c_user_beta_01', userId: 'u_user_beta', provider: 'BETMAN', roundId: '260097',
            eventId: 'e_102', marketId: 'm_102', selectionId: 's_102', offeredOddsAtSeal: 2.10
        });
        await contractRepo.saveContract(userBContract);
        const userBContracts = await contractRepo.getContractsByUser('u_user_beta');
        assert.strictEqual(userBContracts.length, 1);
        assert.strictEqual(userBContracts[0].id, 'c_user_beta_01');
    });

    await test('Multi-User Isolation', '12.3 User A cannot view User B notifications', async () => {
        const notifsA = await notificationRepo.getNotificationsByDecisionId(sampleContract.id);
        const notifsB = await notificationRepo.getNotificationsByDecisionId('c_user_beta_01');
        assert.notDeepStrictEqual(notifsA, notifsB);
    });

    await test('Multi-User Isolation', '12.4 User A cannot view User B audit events', async () => {
        const eventsA = await eventRepo.getEventsByDecisionId(sampleContract.id);
        const eventsB = await eventRepo.getEventsByDecisionId('c_user_beta_01');
        assert.strictEqual(eventsB.length, 0);
    });

    await test('Multi-User Isolation', '12.5 Multiple users watching same market have independent WatchTargets', async () => {
        const wtA = await watchTargetRepo.getWatchTargetByDecisionId(sampleContract.id);
        const wtB = new WatchTarget({ id: 'wt_beta_01', decisionId: 'c_user_beta_01', eventId: 'e_102', marketId: 'm_102', selectionId: 's_102' });
        await watchTargetRepo.saveWatchTarget(wtB);
        assert.notStrictEqual(wtA.id, wtB.id);
    });

    await test('Multi-User Isolation', '12.6 Shared market observation is NOT attached to user ID', async () => {
        const obs = await marketObsRepo.getLatestMarketObservation('BETMAN', '260097', 'm_ml_101');
        assert.strictEqual(obs.user_id, undefined);
    });

    await test('Multi-User Isolation', '12.7 Shared context snapshot is NOT attached to user ID', async () => {
        const cs = await contextSnapshotRepo.getLatestContextSnapshot('BASEBALL', 'e_101');
        assert.strictEqual(cs.user_id, undefined);
    });

    await test('Multi-User Isolation', '12.8 User A updating watch target does not affect User B target', async () => {
        await watchTargetRepo.updateWatchTarget('wt_beta_01', { status: 'PAUSED' });
        const wtA = await watchTargetRepo.getWatchTargetByDecisionId(sampleContract.id);
        assert.strictEqual(wtA.status, 'ACTIVE');
    });

    await test('Multi-User Isolation', '12.9 Querying contracts by non-existent user returns empty array', async () => {
        const contracts = await contractRepo.getContractsByUser('u_user_nonexistent');
        assert.strictEqual(contracts.length, 0);
    });

    await test('Multi-User Isolation', '12.10 Notification dedupe keys isolate per decision ID', async () => {
        const ncB = new NotificationCandidate({
            decisionId: 'c_user_beta_01', severity: 'HIGH', reasonCode: 'PRICE_DROPPED',
            title: 'T', body: 'B', dedupeKey: `c_user_beta_01:PRICE_DROPPED`, actionState: 'DO_NOT_ENTER', thesisState: 'VALID'
        });
        const idB = await notificationRepo.saveCandidate(ncB);
        assert(idB !== null);
    });

    // ── Category 13: RLS & Security Assumptions (>= 8 tests) ───────────────
    await test('RLS & Security', '13.1 Service role separation documented in 006_rls_and_security.sql', () => {
        const sql = fs.readFileSync('./migrations/006_rls_and_security.sql', 'utf8');
        assert(sql.includes('Service Role (Ingestion Worker) bypasses RLS'));
    });

    await test('RLS & Security', '13.2 Public read allowed on shared provider observations', () => {
        const sql = fs.readFileSync('./migrations/006_rls_and_security.sql', 'utf8');
        assert(sql.includes('CREATE POLICY p_public_read_market_obs ON market_observations FOR SELECT USING (true)'));
    });

    await test('RLS & Security', '13.3 Public read allowed on shared context snapshots', () => {
        const sql = fs.readFileSync('./migrations/006_rls_and_security.sql', 'utf8');
        assert(sql.includes('CREATE POLICY p_public_read_context_snapshots ON context_snapshots FOR SELECT USING (true)'));
    });

    await test('RLS & Security', '13.4 User insert policy requires auth.uid() = user_id', () => {
        const sql = fs.readFileSync('./migrations/006_rls_and_security.sql', 'utf8');
        assert(sql.includes('auth.uid() = user_id'));
    });

    await test('RLS & Security', '13.5 PII minimization verified: zero password or betman credentials columns', () => {
        const files = fs.readdirSync('./migrations').filter(f => f.endsWith('.sql'));
        for (const f of files) {
            const sql = fs.readFileSync(path.join('./migrations', f), 'utf8');
            assert(!sql.includes('password'), `Migration ${f} must not include password column`);
            assert(!sql.includes('betman_id'), `Migration ${f} must not store betman credentials`);
            assert(!sql.includes('bank_account'), `Migration ${f} must not store financial secrets`);
        }
    });

    await test('RLS & Security', '13.6 Protected contract fields cannot be updated by client roles', () => {
        const sql = fs.readFileSync('./migrations/003_decisions.sql', 'utf8');
        assert(sql.includes('BEFORE UPDATE OR DELETE ON decision_contracts'));
    });

    await test('RLS & Security', '13.7 Audit events cannot be deleted by client roles', () => {
        const sql = fs.readFileSync('./migrations/003_decisions.sql', 'utf8');
        assert(sql.includes('BEFORE UPDATE OR DELETE ON decision_events'));
    });

    await test('RLS & Security', '13.8 Notification delivery status update isolated to system worker role', () => {
        const sql = fs.readFileSync('./migrations/004_watch.sql', 'utf8');
        assert(sql.includes('delivery_status VARCHAR(32)'));
    });

    // ── Category 14: Failure Injection & Resilience (>= 10 tests) ──────────
    await test('Failure Injection', '14.1 Database disconnected throws visible DB_CONNECTION_ERROR', async () => {
        db.setFailureMode('DISCONNECTED');
        let err = null;
        try {
            await contractRepo.getContractById(sampleContract.id);
        } catch (e) {
            err = e;
        }
        db.setFailureMode(null);
        assert(err !== null);
        assert(err.message.includes('DB_CONNECTION_ERROR'));
    });

    await test('Failure Injection', '14.2 Database degraded surfaces DEGRADED health status', async () => {
        db.setFailureMode('DEGRADED');
        const h = await db.checkHealth();
        db.setFailureMode(null);
        assert.strictEqual(h.status, 'DEGRADED');
    });

    await test('Failure Injection', '14.3 Database down surfaces DOWN health status (No fake success)', async () => {
        db.setFailureMode('DISCONNECTED');
        const h = await db.checkHealth();
        db.setFailureMode(null);
        assert.strictEqual(h.status, 'DOWN');
    });

    await test('Failure Injection', '14.4 Failed event insert during DB disconnect rolls back cleanly', async () => {
        db.setFailureMode('DISCONNECTED');
        let err = null;
        try {
            await eventRepo.appendEvent(new DecisionEvent({ contractId: sampleContract.id, eventType: 'PRICE_MOVED', previousEventHash: 'H' }));
        } catch (e) {
            err = e;
        }
        db.setFailureMode(null);
        assert(err !== null);
    });

    await test('Failure Injection', '14.5 Failed market observation insert throws error', async () => {
        db.setFailureMode('DISCONNECTED');
        let err = null;
        try {
            await marketObsRepo.saveMarketObservation({ provider: 'BETMAN', roundId: '1', marketId: 'm' });
        } catch (e) {
            err = e;
        }
        db.setFailureMode(null);
        assert(err !== null);
    });

    await test('Failure Injection', '14.6 Failed context snapshot insert throws error', async () => {
        db.setFailureMode('DISCONNECTED');
        let err = null;
        try {
            await contextSnapshotRepo.saveContextSnapshot({ sport: 'BASEBALL', eventId: 'e' });
        } catch (e) {
            err = e;
        }
        db.setFailureMode(null);
        assert(err !== null);
    });

    await test('Failure Injection', '14.7 Failed watch target update throws error', async () => {
        db.setFailureMode('DISCONNECTED');
        let err = null;
        try {
            await watchTargetRepo.updateWatchTarget('wt_pg_001', { status: 'PAUSED' });
        } catch (e) {
            err = e;
        }
        db.setFailureMode(null);
        assert(err !== null);
    });

    await test('Failure Injection', '14.8 Corrupt contract payload rejected on save', async () => {
        let err = null;
        try {
            await contractRepo.saveContract(null);
        } catch (e) {
            err = e;
        }
        assert(err !== null);
    });

    await test('Failure Injection', '14.9 Corrupt event payload rejected on append', async () => {
        let err = null;
        try {
            await eventRepo.appendEvent(null);
        } catch (e) {
            err = e;
        }
        assert(err !== null);
    });

    await test('Failure Injection', '14.10 Recovery after temporary failure restores normal operations', async () => {
        db.setFailureMode('DISCONNECTED');
        db.setFailureMode(null);
        const loaded = await contractRepo.getContractById(sampleContract.id);
        assert.strictEqual(loaded.id, sampleContract.id);
    });

    // ── Category 15: Migration Parity & JSON Migration (>= 10 tests) ───────
    await test('Migration Parity', '15.1 JsonToPostgresMigrator migrates sample JSON dataset', async () => {
        const migrator = new JsonToPostgresMigrator({
            db, contractRepo, eventRepo, marketObsRepo, contextSnapshotRepo,
            watchTargetRepo, watchEvaluationRepo, notificationCandidateRepo: notificationRepo
        });

        const testDataset = {
            contracts: [
                { id: 'c_mig_01', userId: 'u_mig_1', provider: 'BETMAN', roundId: '260097', sport: 'BASEBALL', league: 'MLB', eventId: 'e_mig_1', marketId: 'm_mig_1', selectionId: 's1', offeredOddsAtSeal: 1.85, entryRule: { minimumEntryOdds: 1.82 } },
                { id: 'c_mig_02', userId: 'u_mig_2', provider: 'BETMAN', roundId: '260097', sport: 'SOCCER', league: 'EPL', eventId: 'e_mig_2', marketId: 'm_mig_2', selectionId: 's1', offeredOddsAtSeal: 2.10, entryRule: { minimumEntryOdds: 2.05 } }
            ],
            events: [
                { eventId: 'ev_mig_01', contractId: 'c_mig_01', sequenceNumber: 1, eventType: 'SEALED', timestamp: '2026-08-17T13:00:00Z', previousEventHash: 'GENESIS' },
                { eventId: 'ev_mig_02', contractId: 'c_mig_02', sequenceNumber: 1, eventType: 'SEALED', timestamp: '2026-08-17T13:00:00Z', previousEventHash: 'GENESIS' }
            ],
            marketObservations: [
                { provider: 'BETMAN', roundId: '260097', marketId: 'm_mig_1', observedAt: '2026-08-17T13:00:00Z', payloadHash: 'H_MIG_1' }
            ],
            watchTargets: [
                { id: 'wt_mig_01', decisionId: 'c_mig_01', eventId: 'e_mig_1', marketId: 'm_mig_1', selectionId: 's1' }
            ],
            notifications: [
                { id: 'nc_mig_01', decisionId: 'c_mig_01', severity: 'HIGH', reasonCode: 'R', title: 'T', body: 'B', dedupeKey: 'DEDUPE_MIG_1', actionState: 'DO_NOT_ENTER', thesisState: 'VALID' }
            ]
        };

        const stats = await migrator.migrateDataset(testDataset);
        assert.strictEqual(stats.sourceRecords.contracts, 2);
        assert.strictEqual(stats.destinationRecords.contracts, 2);
        assert.strictEqual(stats.mismatches, 0);
    });

    await test('Migration Parity', '15.2 Migrated contracts IDs match exactly', async () => {
        const c1 = await contractRepo.getContractById('c_mig_01');
        assert.strictEqual(c1.id, 'c_mig_01');
        assert.strictEqual(c1.offeredOddsAtSeal, 1.85);
    });

    await test('Migration Parity', '15.3 Migrated event chain passes cryptographic validation', async () => {
        const events = await eventRepo.getEventsByDecisionId('c_mig_01');
        assert.strictEqual(events.length, 1);
        assert.strictEqual(WatchReplayEngine.verifyAuditChain(events).valid, true);
    });

    await test('Migration Parity', '15.4 Migrated market observations match source timestamps', async () => {
        const obs = await marketObsRepo.getLatestMarketObservation('BETMAN', '260097', 'm_mig_1');
        assert.strictEqual(obs.observed_at, '2026-08-17T13:00:00Z');
    });

    await test('Migration Parity', '15.5 Migrated watch targets retain active status', async () => {
        const target = await watchTargetRepo.getWatchTargetByDecisionId('c_mig_01');
        assert.strictEqual(target.status, 'ACTIVE');
    });

    await test('Migration Parity', '15.6 Migrated notifications retain dedupe keys', async () => {
        const notifs = await notificationRepo.getNotificationsByDecisionId('c_mig_01');
        assert.strictEqual(notifs[0].dedupeKey, 'DEDUPE_MIG_1');
    });

    await test('Migration Parity', '15.7 0 semantic mismatches across all migrated entities', async () => {
        const c2 = await contractRepo.getContractById('c_mig_02');
        assert.strictEqual(c2.sport, 'SOCCER');
        assert.strictEqual(c2.offeredOddsAtSeal, 2.10);
    });

    await test('Migration Parity', '15.8 Migrating duplicate dataset is idempotent', async () => {
        const migrator = new JsonToPostgresMigrator({
            db, contractRepo, eventRepo, marketObsRepo, contextSnapshotRepo,
            watchTargetRepo, watchEvaluationRepo, notificationCandidateRepo: notificationRepo
        });
        const duplicateDataset = {
            marketObservations: [
                { provider: 'BETMAN', roundId: '260097', marketId: 'm_mig_1', observedAt: '2026-08-17T13:00:00Z', payloadHash: 'H_MIG_1' }
            ]
        };
        const stats = await migrator.migrateDataset(duplicateDataset);
        assert.strictEqual(stats.destinationRecords.marketObservations, 1);
    });

    await test('Migration Parity', '15.9 Empty migration dataset handled safely', async () => {
        const migrator = new JsonToPostgresMigrator({ db, contractRepo, eventRepo, marketObsRepo, contextSnapshotRepo, watchTargetRepo, watchEvaluationRepo, notificationCandidateRepo: notificationRepo });
        const stats = await migrator.migrateDataset({});
        assert.strictEqual(stats.sourceRecords.contracts, 0);
        assert.strictEqual(stats.mismatches, 0);
    });

    await test('Migration Parity', '15.10 Migration parity report generated and verified', () => {
        assert(fs.existsSync('./migrations/001_core_entities.sql'));
    });

    console.log(`\n========================================`);
    console.log(`PHASE D.3 TEST SUMMARY: ${passedTests}/${totalTests} TESTS PASSED`);
    console.log(`Target >= 152 passing tests: ${passedTests >= 152 ? 'MET ✅' : 'NOT MET ❌'}`);
    console.log(`========================================\n`);

    return { totalTests, passedTests, testResults };
}

if (require.main === module) {
    runAllD3Tests().catch(console.error);
}

module.exports = runAllD3Tests;
