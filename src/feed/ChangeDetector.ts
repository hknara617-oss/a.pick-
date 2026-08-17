import * as crypto from 'crypto';
import { IRepository } from '../repository/IRepository';
import { MarketChange } from '../models/MarketChange';
import { MarketObservation } from '../models/MarketObservation';
import { SelectionObservation } from '../models/SelectionObservation';

export class ChangeDetector {
    constructor(private repository: IRepository, private minObservationsBeforeRemoval: number = 2) {}

    public async detectChanges(currentObsId: string, isPartialPayload: boolean): Promise<MarketChange | null> {
        // Fetch current observation and its selections
        // Normally we wouldn't fetch everything but for simplicity in Phase 3:
        const allObs = await this.repository.getAllMarketObservations();
        const currentObs = allObs.find(o => o.id === currentObsId);
        if (!currentObs) return null;

        const currentSels = await this.repository.getSelectionObservations(currentObsId);

        // Fetch previous observation for the same market
        const marketObsList = allObs.filter(o => o.marketId === currentObs.marketId).sort((a, b) => new Date(a.observedAt).getTime() - new Date(b.observedAt).getTime());
        const currentIndex = marketObsList.findIndex(o => o.id === currentObsId);
        
        if (currentIndex === 0) {
            // Market added
            const change: MarketChange = {
                id: `CHG_${crypto.randomBytes(6).toString('hex')}`,
                marketId: currentObs.marketId,
                previousObservationId: null,
                currentObservationId: currentObsId,
                detectedAt: new Date().toISOString(),
                changeType: 'MARKET_ADDED',
                beforeLine: null,
                afterLine: currentObs.line,
                changedSelections: currentSels.map(s => ({
                    selectionType: s.selectionType,
                    before: null,
                    after: s.oddsDecimal
                })),
                source: 'APICK_OBSERVATION'
            };
            await this.repository.saveMarketChange(change);
            return change;
        }

        const prevObs = marketObsList[currentIndex - 1];
        const prevSels = await this.repository.getSelectionObservations(prevObs.id);

        let changeType: MarketChange['changeType'] | null = null;
        const changedSelections: MarketChange['changedSelections'] = [];

        if (currentObs.line !== prevObs.line) {
            changeType = 'LINE_CHANGE';
        }

        // Compare selections
        const prevSelMap = new Map(prevSels.map(s => [s.selectionType, s.oddsDecimal]));
        const currSelMap = new Map(currentSels.map(s => [s.selectionType, s.oddsDecimal]));

        for (const [type, currOdds] of currSelMap) {
            const prevOdds = prevSelMap.get(type);
            if (prevOdds === undefined) {
                if (!changeType) changeType = 'SELECTION_ADDED';
                changedSelections.push({ selectionType: type, before: null, after: currOdds });
            } else if (prevOdds !== currOdds) {
                if (!changeType) changeType = 'ODDS_CHANGE';
                changedSelections.push({ selectionType: type, before: prevOdds, after: currOdds });
            }
        }

        for (const [type, prevOdds] of prevSelMap) {
            if (!currSelMap.has(type)) {
                if (!changeType) changeType = 'SELECTION_REMOVED';
                changedSelections.push({ selectionType: type, before: prevOdds, after: null });
            }
        }

        if (changeType) {
            const change: MarketChange = {
                id: `CHG_${crypto.randomBytes(6).toString('hex')}`,
                marketId: currentObs.marketId,
                previousObservationId: prevObs.id,
                currentObservationId: currentObsId,
                detectedAt: new Date().toISOString(),
                changeType,
                beforeLine: prevObs.line,
                afterLine: currentObs.line,
                changedSelections,
                source: 'APICK_OBSERVATION'
            };
            await this.repository.saveMarketChange(change);
            return change;
        }

        return null;
    }

    public async detectRemovals(currentSnapshotId: string, isPartialPayload: boolean): Promise<MarketChange[]> {
        if (isPartialPayload) {
            return []; // Safety: do not emit MARKET_REMOVED if partial payload
        }
        
        const allObs = await this.repository.getAllMarketObservations();
        const latestObsMap = new Map<string, MarketObservation>();
        for (const o of allObs) {
            latestObsMap.set(o.marketId, o);
        }

        const removedChanges: MarketChange[] = [];
        for (const [marketId, latestObs] of latestObsMap) {
            if (latestObs.snapshotId !== currentSnapshotId) {
                // Market was not in the latest snapshot
                // We should also check if it's already marked as removed.
                // For simplicity, just check if the last change was MARKET_REMOVED
                const allChanges = await this.repository.getAllMarketChanges();
                const marketChanges = allChanges.filter(c => c.marketId === marketId);
                const lastChange = marketChanges[marketChanges.length - 1];

                if (!lastChange || lastChange.changeType !== 'MARKET_REMOVED') {
                    // Check minObservationsBeforeRemoval
                    const marketObsList = allObs.filter(o => o.marketId === marketId);
                    if (marketObsList.length >= this.minObservationsBeforeRemoval) {
                        const change: MarketChange = {
                            id: `CHG_${crypto.randomBytes(6).toString('hex')}`,
                            marketId: marketId,
                            previousObservationId: latestObs.id,
                            currentObservationId: latestObs.id, // using latest as current for removal
                            detectedAt: new Date().toISOString(),
                            changeType: 'MARKET_REMOVED',
                            beforeLine: latestObs.line,
                            afterLine: null,
                            changedSelections: [],
                            source: 'APICK_OBSERVATION'
                        };
                        await this.repository.saveMarketChange(change);
                        removedChanges.push(change);
                    }
                }
            }
        }
        return removedChanges;
    }
}
