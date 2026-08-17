'use strict';

const fs = require('fs');
const path = require('path');
const DecisionContract = require('../models/DecisionContract');
const DecisionEvent = require('../models/DecisionEvent');
const WatchTarget = require('../watch/WatchTarget');
const WatchEvaluation = require('../watch/WatchEvaluation');
const NotificationCandidate = require('../watch/NotificationCandidate');
const WatchReplayEngine = require('../watch/WatchReplayEngine');

/**
 * src/migration/JsonToPostgresMigrator.js
 * Migrates historical JSON data records into PostgreSQL and verifies 0 semantic mismatches.
 */
class JsonToPostgresMigrator {
    constructor({
        db,
        contractRepo,
        eventRepo,
        marketObsRepo,
        contextSnapshotRepo,
        watchTargetRepo,
        watchEvaluationRepo,
        notificationCandidateRepo
    }) {
        this.db = db;
        this.contractRepo = contractRepo;
        this.eventRepo = eventRepo;
        this.marketObsRepo = marketObsRepo;
        this.contextSnapshotRepo = contextSnapshotRepo;
        this.watchTargetRepo = watchTargetRepo;
        this.watchEvaluationRepo = watchEvaluationRepo;
        this.notificationCandidateRepo = notificationCandidateRepo;
    }

    /**
     * Migrate a JSON dataset object or directory into PostgreSQL.
     */
    async migrateDataset(jsonData) {
        const stats = {
            sourceRecords: {
                contracts: jsonData.contracts?.length || 0,
                events: jsonData.events?.length || 0,
                marketObservations: jsonData.marketObservations?.length || 0,
                contextSnapshots: jsonData.contextSnapshots?.length || 0,
                watchTargets: jsonData.watchTargets?.length || 0,
                watchEvaluations: jsonData.watchEvaluations?.length || 0,
                notifications: jsonData.notifications?.length || 0
            },
            destinationRecords: {
                contracts: 0,
                events: 0,
                marketObservations: 0,
                contextSnapshots: 0,
                watchTargets: 0,
                watchEvaluations: 0,
                notifications: 0
            },
            mismatches: 0,
            auditValidations: {
                totalChains: 0,
                validChains: 0
            }
        };

        // 1. Migrate DecisionContracts
        if (jsonData.contracts) {
            for (const c of jsonData.contracts) {
                const contract = new DecisionContract(c);
                await this.contractRepo.saveContract(contract);
                stats.destinationRecords.contracts++;
            }
        }

        // 2. Migrate DecisionEvents
        if (jsonData.events) {
            for (const e of jsonData.events) {
                const event = new DecisionEvent(e);
                await this.eventRepo.appendEvent(event);
                stats.destinationRecords.events++;
            }
        }

        // 3. Migrate MarketObservations
        if (jsonData.marketObservations) {
            for (const m of jsonData.marketObservations) {
                await this.marketObsRepo.saveMarketObservation(m, m.selections || []);
                stats.destinationRecords.marketObservations++;
            }
        }

        // 4. Migrate ContextSnapshots
        if (jsonData.contextSnapshots) {
            for (const cs of jsonData.contextSnapshots) {
                await this.contextSnapshotRepo.saveContextSnapshot(cs);
                stats.destinationRecords.contextSnapshots++;
            }
        }

        // 5. Migrate WatchTargets
        if (jsonData.watchTargets) {
            for (const wt of jsonData.watchTargets) {
                const target = new WatchTarget(wt);
                await this.watchTargetRepo.saveWatchTarget(target);
                stats.destinationRecords.watchTargets++;
            }
        }

        // 6. Migrate WatchEvaluations
        if (jsonData.watchEvaluations) {
            for (const we of jsonData.watchEvaluations) {
                const evaluation = new WatchEvaluation(we);
                await this.watchEvaluationRepo.saveEvaluation(evaluation);
                stats.destinationRecords.watchEvaluations++;
            }
        }

        // 7. Migrate NotificationCandidates
        if (jsonData.notifications) {
            for (const nc of jsonData.notifications) {
                const candidate = new NotificationCandidate(nc);
                await this.notificationCandidateRepo.saveCandidate(candidate);
                stats.destinationRecords.notifications++;
            }
        }

        // 8. Validate parity & hash chains
        if (jsonData.contracts) {
            for (const c of jsonData.contracts) {
                const loaded = await this.contractRepo.getContractById(c.id);
                const expectedStatus = c.status || 'SEALED';
                if (!loaded || loaded.offeredOddsAtSeal !== c.offeredOddsAtSeal || (c.status && loaded.status !== expectedStatus)) {
                    stats.mismatches++;
                }

                // Check audit chain for this contract
                const chain = await this.eventRepo.getEventsByDecisionId(c.id);
                if (chain.length > 0) {
                    stats.auditValidations.totalChains++;
                    const v = WatchReplayEngine.verifyAuditChain(chain);
                    if (v.valid) {
                        stats.auditValidations.validChains++;
                    } else {
                        stats.mismatches++;
                    }
                }
            }
        }

        return stats;
    }
}

module.exports = JsonToPostgresMigrator;
