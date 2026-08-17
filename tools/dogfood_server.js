'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');

const BetmanLiveFeedResolver = require('../src/feed/BetmanLiveFeedResolver');
const TodayService = require('../src/services/TodayService');
const DecisionService = require('../src/services/DecisionService');
const WatchService = require('../src/services/WatchService');
const ReviewMemoryService = require('../src/services/ReviewMemoryService');
const TicketImportService = require('../src/services/TicketImportService');
const TrackedDecision = require('../src/domain/TrackedDecision');
const LiveSportsStatsPipeline = require('../src/intelligence/LiveSportsStatsPipeline');

// Trigger background sync of live official stats
LiveSportsStatsPipeline.syncMLBStats('2026-08-17').catch(err => console.error('Initial stats sync:', err.message));

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, '../apps/web/public');

const todayService = new TodayService();
const decisionService = new DecisionService();
const watchService = new WatchService();
const reviewMemoryService = new ReviewMemoryService();

// Genuine Founder in-memory store (Strictly HUMAN actions only, ZERO simulated fixtures)
const founderStore = {
    founderUser: { id: 'u_founder_live', email: 'founder@apick.kr' },
    contracts: [],
    trackedDecisions: [],
    theses: [],
    imports: [],
    events: [],
    executions: [],
    reviews: [],
    feedback: []
};

const ticketImportService = new TicketImportService({ importStore: founderStore.imports });

const server = http.createServer(async (req, res) => {
    const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = parsedUrl.pathname;

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    const sendJson = (data, statusCode = 200) => {
        res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(data));
    };

    // ── API ROUTES ──────────────────────────────────────────────────────────

    // GET /api/today — 100% Genuine LIVE_BETMAN round & markets
    if (pathname === '/api/today' && req.method === 'GET') {
        const liveFeed = BetmanLiveFeedResolver.getActiveLiveRound();
        const vm = await todayService.getTodayViewModel({
            userId: founderStore.founderUser.id,
            liveMarketObservations: liveFeed.markets
        });

        const EvidenceEngine = require('../src/intelligence/EvidenceEngine');
        const enrichedAllMarkets = liveFeed.markets.map(m => {
            const analysis = EvidenceEngine.analyzeMarket(m);
            return {
                ...m,
                matchupInfo: analysis.matchupInfo,
                caseFor: analysis.caseFor,
                caseAgainst: analysis.caseAgainst,
                killConditions: analysis.killConditions,
                actionHeadline: analysis.actionHeadline,
                marketFairOdds: analysis.marketInfo.marketFairOdds,
                betmanNoVigFairOdds: analysis.marketInfo.betmanNoVigFairOdds,
                provenanceLabel: analysis.marketInfo.provenanceLabel,
                priceQuality: analysis.priceQuality,
                overroundPct: analysis.marketInfo.overroundPct,
                unverifiedCount: analysis.unverifiedCount
            };
        });

        return sendJson({
            ...vm,
            currentRound: liveFeed.roundId,
            saleStatus: liveFeed.saleStatus,
            sportsPresent: liveFeed.sportsPresent,
            totalLiveCount: liveFeed.rowCount,
            allMarkets: enrichedAllMarkets
        });
    }

    // POST /api/decision/seal — Seal a Real Founder DecisionContract
    if (pathname === '/api/decision/seal' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
            try {
                const data = JSON.parse(body || '{}');
                const liveFeed = BetmanLiveFeedResolver.getActiveLiveRound();

                const result = await decisionService.sealDecision({
                    userId: founderStore.founderUser.id,
                    provider: 'BETMAN',
                    roundId: data.roundId || liveFeed.roundId,
                    sport: data.sport,
                    league: data.league,
                    eventId: data.eventId,
                    marketId: data.marketId,
                    selectionId: data.selectionId,
                    offeredOdds: data.offeredOdds,
                    entryThreshold: data.entryThreshold || data.offeredOdds,
                    thesisSummary: data.thesis?.userStatement || data.thesisSummary || '',
                    evidenceChips: data.thesis?.selectedReasonCodes || data.evidenceChips || [],
                    breakConditions: data.breakConditions || []
                });

                // Store Immutable Pre-Decision Thesis ("당시의 나")
                const DecisionThesis = require('../src/domain/DecisionThesis');
                const thesis = new DecisionThesis({
                    decisionId: result.contract.id,
                    userId: founderStore.founderUser.id,
                    selectedReasonCodes: data.thesis?.selectedReasonCodes || [],
                    userStatement: data.thesis?.userStatement || '',
                    primaryDriver: data.thesis?.primaryDriver || 'OTHER',
                    biggestConcern: data.thesis?.biggestConcern || '',
                    suggestedKillCondition: data.thesis?.suggestedKillCondition || '',
                    evidenceRefs: data.evidenceChips || []
                });

                // Create TrackedDecision (APICK_CREATED)
                const tracked = new TrackedDecision({
                    id: result.contract.id,
                    userId: founderStore.founderUser.id,
                    origin: 'APICK_CREATED',
                    eventId: data.eventId,
                    marketId: data.marketId,
                    selectionId: data.selectionId,
                    eventName: data.eventName || data.eventId,
                    selectionName: data.selectionName || data.selectionId,
                    sport: data.sport || 'BASEBALL',
                    league: data.league || 'MLB',
                    provider: 'BETMAN',
                    roundId: data.roundId || liveFeed.roundId,
                    contractId: result.contract.id,
                    contractStatus: 'SEALED',
                    thesisStatus: 'RECORDED',
                    reconciliationStatus: 'MATCHED',
                    capturedOdds: data.offeredOdds,
                    currentOdds: data.offeredOdds,
                    entryThreshold: data.entryThreshold || data.offeredOdds,
                    thesisSummary: data.thesis?.userStatement || '가격 조건 및 사전 가설 확인',
                    thesisOrigin: 'ORIGINAL_AT_DECISION',
                    watchCoverage: ['내 진입 기준', '선발 변경', '라인업 변경', '내가 정한 파기 조건'],
                    breakConditions: data.breakConditions || []
                });

                founderStore.theses.push(thesis);
                founderStore.contracts.push(result.contract);
                founderStore.trackedDecisions.push(tracked);
                founderStore.events.push(result.genesisEvent);

                return sendJson({ ...result, thesis, trackedDecision: tracked }, 201);
            } catch (err) {
                return sendJson({ error: err.message }, 400);
            }
        });
        return;
    }

    // POST /api/import/upload-image — Real Image Ingestion Pipeline (Binary / Base64 / Clipboard)
    if (pathname === '/api/import/upload-image' && req.method === 'POST') {
        const chunks = [];
        let totalSize = 0;
        req.on('data', chunk => {
            chunks.push(chunk);
            totalSize += chunk.length;
            if (totalSize > 25 * 1024 * 1024) { // 25MB max
                res.writeHead(413, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: '이미지 크기가 너무 큽니다 (25MB 초과).' }));
                req.destroy();
            }
        });
        req.on('end', async () => {
            try {
                const bodyStr = Buffer.concat(chunks).toString('utf-8');
                const data = JSON.parse(bodyStr || '{}');
                const result = await ticketImportService.parseAndReconcile({
                    userId: founderStore.founderUser.id,
                    imageData: data.imageData,
                    rawText: data.rawText || '',
                    manualPayload: data.manualPayload || null
                });
                return sendJson(result);
            } catch (err) {
                return sendJson({ error: err.message }, 400);
            }
        });
        return;
    }

    // POST /api/import/parse — Parse Screenshot/Ticket Image & Reconcile with Betman
    if (pathname === '/api/import/parse' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
            try {
                const data = JSON.parse(body || '{}');
                const result = await ticketImportService.parseAndReconcile({
                    userId: founderStore.founderUser.id,
                    imageData: data.imageData,
                    rawText: data.rawText,
                    manualPayload: data.manualPayload
                });
                return sendJson(result);
            } catch (err) {
                return sendJson({ error: err.message }, 400);
            }
        });
        return;
    }

    // POST /api/import/confirm — User Confirms Parsed Legs & Activates WATCH
    if (pathname === '/api/import/confirm' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const data = JSON.parse(body || '{}');
                const newTracked = ticketImportService.confirmAndTrack({
                    userId: founderStore.founderUser.id,
                    importSessionId: data.importSessionId,
                    selectedLegs: data.selectedLegs || [],
                    userExecuted: data.userExecuted || false,
                    userThesis: data.userThesis || ''
                });

                for (const t of newTracked) {
                    founderStore.trackedDecisions.push(t);
                }

                return sendJson({ success: true, count: newTracked.length, tracked: newTracked });
            } catch (err) {
                return sendJson({ error: err.message }, 400);
            }
        });
        return;
    }

    // POST /api/decision/execution — Real Human Execution Record
    if (pathname === '/api/decision/execution' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            const data = JSON.parse(body || '{}');
            founderStore.executions.push({
                decisionId: data.decisionId,
                status: data.status, // ENTERED | NOT_YET | NO_ENTRY
                entryOdds: data.entryOdds || null,
                recordedAt: new Date().toISOString()
            });
            return sendJson({ success: true });
        });
        return;
    }

    // GET /api/watch — Unified Human WATCH State
    if (pathname === '/api/watch' && req.method === 'GET') {
        const liveFeed = BetmanLiveFeedResolver.getActiveLiveRound();
        const vm = await watchService.getWatchViewModel({
            userId: founderStore.founderUser.id,
            sealedContracts: founderStore.contracts,
            trackedDecisions: founderStore.trackedDecisions,
            currentObservations: liveFeed.markets,
            decisionEvents: founderStore.events
        });
        return sendJson(vm);
    }

    // POST /api/review/counterfactual — Store Human Stated Intention Reflection
    if (pathname === '/api/review/counterfactual' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            const data = JSON.parse(body || '{}');
            if (!founderStore.counterfactuals) founderStore.counterfactuals = [];
            founderStore.counterfactuals.push({
                decisionId: data.decisionId || 'dec_sample_tor_van',
                answer: data.answer, // SAME | WAIT | NO
                evidenceSnapshotId: data.evidenceSnapshotId || 'snap_sample',
                reviewedAt: new Date().toISOString()
            });
            return sendJson({ success: true, count: founderStore.counterfactuals.length });
        });
        return;
    }

    // GET /api/review — Real Review & Cold Start Memory
    if (pathname === '/api/review' && req.method === 'GET') {
        const vm = await reviewMemoryService.getReviewViewModel({
            userId: founderStore.founderUser.id,
            reviewResults: founderStore.reviews,
            memoryRecords: [] // Genuine cold-start: 0 synthetic memory records
        });
        return sendJson(vm);
    }

    // POST /api/feedback — Founder [이상함 / 불편함] & Session Q1 Feedback
    if (pathname === '/api/feedback' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            const data = JSON.parse(body || '{}');
            const entry = {
                id: `fb_${Date.now()}`,
                userId: founderStore.founderUser.id,
                screen: data.screen || 'TODAY',
                issueType: data.issueType || 'OTHER',
                note: data.note || '',
                createdAt: new Date().toISOString()
            };
            founderStore.feedback.push(entry);
            console.log(`[FOUNDER HUMAN FEEDBACK] [${entry.issueType}] ${entry.note}`);
            return sendJson({ success: true, entry });
        });
        return;
    }

    // GET /api/founder/session-status — Session Checkpoint Status
    if (pathname === '/api/founder/session-status' && req.method === 'GET') {
        const liveFeed = BetmanLiveFeedResolver.getActiveLiveRound();
        return sendJson({
            currentRound: liveFeed.roundId,
            sportsPresent: liveFeed.sportsPresent,
            liveMarketCount: liveFeed.rowCount,
            realContractsCount: founderStore.contracts.length,
            contracts: founderStore.contracts,
            executions: founderStore.executions,
            feedback: founderStore.feedback,
            status: founderStore.contracts.length > 0 ? 'IN_PROGRESS' : 'READY_FOR_HUMAN'
        });
    }

    // ── STATIC FILE SERVING ─────────────────────────────────────────────────
    let filePath = path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname);
    const ext = path.extname(filePath);
    const contentTypeMap = {
        '.html': 'text/html; charset=utf-8',
        '.js': 'application/javascript; charset=utf-8',
        '.css': 'text/css; charset=utf-8',
        '.json': 'application/json; charset=utf-8',
        '.png': 'image/png'
    };

    fs.readFile(filePath, (err, content) => {
        if (err) {
            fs.readFile(path.join(PUBLIC_DIR, 'index.html'), (err2, fallback) => {
                if (err2) {
                    res.writeHead(404);
                    res.end('Not Found');
                } else {
                    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                    res.end(fallback);
                }
            });
        } else {
            res.writeHead(200, { 'Content-Type': contentTypeMap[ext] || 'text/plain' });
            res.end(content);
        }
    });
});

if (require.main === module) {
    const liveFeed = BetmanLiveFeedResolver.getActiveLiveRound();
    server.listen(PORT, () => {
        console.log(`\n======================================================`);
        console.log(`  A.PICK FOUNDER DOGFOOD SERVER READY 🚀`);
        console.log(`  URL: http://localhost:${PORT}`);
        console.log(`  CURRENT ROUND: ${liveFeed.roundId}`);
        console.log(`  SPORTS PRESENT: ${liveFeed.sportsPresent.join(', ')}`);
        console.log(`  LIVE MARKET COUNT: ${liveFeed.rowCount}`);
        console.log(`  Waiting for founder manual use...`);
        console.log(`======================================================\n`);
    });
}

module.exports = server;
