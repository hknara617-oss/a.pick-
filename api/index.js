'use strict';

const BetmanLiveFeedResolver = require('../src/feed/BetmanLiveFeedResolver');
const TodayService = require('../src/services/TodayService');
const DecisionService = require('../src/services/DecisionService');
const WatchService = require('../src/services/WatchService');
const ReviewMemoryService = require('../src/services/ReviewMemoryService');
const TicketImportService = require('../src/services/TicketImportService');
const TrackedDecision = require('../src/domain/TrackedDecision');
const LiveSportsStatsPipeline = require('../src/intelligence/LiveSportsStatsPipeline');

const todayService = new TodayService();
const decisionService = new DecisionService();
const watchService = new WatchService();
const reviewMemoryService = new ReviewMemoryService();

// Persistent memory store for serverless invocation
const serverlessStore = {
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

const ticketImportService = new TicketImportService({ importStore: serverlessStore.imports });

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.statusCode = 200;
        res.end();
        return;
    }

    const sendJson = (data, statusCode = 200) => {
        res.setHeader('Content-Type', 'application/json');
        res.statusCode = statusCode;
        res.end(JSON.stringify(data));
    };

    const url = req.url || '';
    const parsedUrl = new URL(url, `http://${req.headers.host || 'localhost'}`);
    const pathname = parsedUrl.pathname;

    try {
        // GET /api/today — Event-First Top 3 Market Discovery
        if (pathname === '/api/today' && req.method === 'GET') {
            const feed = BetmanLiveFeedResolver.getActiveLiveRound();
            const candidates = await todayService.getTodayCandidates({
                userId: serverlessStore.founderUser.id,
                date: '2026-08-17',
                topN: 3
            });

            return sendJson({
                currentRound: feed.roundId,
                totalLiveCount: feed.meta?.totalMarketsCount || 142,
                asOf: feed.asOf,
                candidates,
                allMarkets: feed.markets || []
            });
        }

        // GET /api/watch — Unified Watch Inbox
        if (pathname === '/api/watch' && req.method === 'GET') {
            const vm = await watchService.getWatchViewModel({
                userId: serverlessStore.founderUser.id,
                contracts: serverlessStore.contracts,
                trackedDecisions: serverlessStore.trackedDecisions,
                decisionEvents: serverlessStore.events
            });
            return sendJson(vm);
        }

        // POST /api/decision/seal — 15s Decision Contract Seal
        if (pathname === '/api/decision/seal' && req.method === 'POST') {
            const data = req.body || {};
            const result = await decisionService.sealDecision({
                userId: serverlessStore.founderUser.id,
                eventId: data.eventId,
                marketId: data.marketId,
                selectionId: data.selectionId,
                entryThreshold: data.entryThreshold,
                primaryDriver: data.primaryDriver,
                biggestConcern: data.biggestConcern,
                userThesis: data.userThesis,
                breakConditions: data.breakConditions,
                watchCoverage: data.watchCoverage,
                executed: data.executed || false,
                entryOdds: data.entryOdds || null
            });

            if (result.contract) {
                serverlessStore.contracts.push(result.contract);
                const tracked = new TrackedDecision({
                    id: `track_${result.contract.id}`,
                    userId: serverlessStore.founderUser.id,
                    origin: 'APICK_CREATED',
                    eventId: data.eventId,
                    marketId: data.marketId,
                    selectionId: data.selectionId,
                    eventName: data.eventName || data.eventId,
                    selectionName: data.selectionName || data.selectionId,
                    contractId: result.contract.id,
                    thesisId: result.thesis?.id,
                    contractStatus: 'SEALED',
                    thesisStatus: 'RECORDED',
                    capturedOdds: data.currentOdds,
                    currentOdds: data.currentOdds,
                    entryThreshold: data.entryThreshold,
                    thesisSummary: data.userThesis || data.primaryDriver || '',
                    thesisOrigin: 'ORIGINAL_AT_DECISION',
                    watchCoverage: data.watchCoverage,
                    breakConditions: data.breakConditions,
                    executed: data.executed || false,
                    entryOdds: data.entryOdds
                });
                serverlessStore.trackedDecisions.push(tracked);
            }

            return sendJson(result);
        }

        // POST /api/import/upload-image — Real Image Ingestion Pipeline
        if (pathname === '/api/import/upload-image' && req.method === 'POST') {
            const data = req.body || {};
            const result = await ticketImportService.parseAndReconcile({
                userId: serverlessStore.founderUser.id,
                imageData: data.imageData,
                rawText: data.rawText || '',
                manualPayload: data.manualPayload || null
            });
            return sendJson(result);
        }

        // POST /api/import/confirm — User Confirms Parsed Legs & Activates WATCH
        if (pathname === '/api/import/confirm' && req.method === 'POST') {
            const data = req.body || {};
            const newTracked = ticketImportService.confirmAndTrack({
                userId: serverlessStore.founderUser.id,
                importSessionId: data.importSessionId,
                selectedLegs: data.selectedLegs || [],
                userExecuted: data.userExecuted || true,
                userThesis: data.userThesis || ''
            });

            for (const t of newTracked) {
                serverlessStore.trackedDecisions.push(t);
            }

            return sendJson({ success: true, count: newTracked.length, tracked: newTracked });
        }

        // GET /api/review — Outcome Blur & Decision Memory
        if (pathname === '/api/review' && req.method === 'GET') {
            const reviewSummary = await reviewMemoryService.getReviewDashboard({
                userId: serverlessStore.founderUser.id,
                contracts: serverlessStore.contracts,
                trackedDecisions: serverlessStore.trackedDecisions,
                theses: serverlessStore.theses,
                reviews: serverlessStore.reviews
            });
            return sendJson(reviewSummary);
        }

        return sendJson({ error: 'Endpoint Not Found', pathname }, 404);
    } catch (err) {
        return sendJson({ error: err.message }, 500);
    }
};
