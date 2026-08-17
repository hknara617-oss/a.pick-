import * as fs from 'fs';
import * as path from 'path';
import { IRepository, ProviderHealthState } from './IRepository';
import { ProviderSnapshot, Round, Event, Market, MarketSelection, ProviderRowAudit, NormalizationIssue } from './BetmanRepository';
import { MarketObservation } from '../models/MarketObservation';
import { SelectionObservation } from '../models/SelectionObservation';
import { MarketChange } from '../models/MarketChange';

export class JsonFileRepository implements IRepository {
    private dataPath: string;
    private data: any;

    constructor(dataPath: string) {
        this.dataPath = dataPath;
        this.load();
    }

    private load() {
        if (fs.existsSync(this.dataPath)) {
            this.data = JSON.parse(fs.readFileSync(this.dataPath, 'utf8'));
        } else {
            this.data = {
                snapshots: [],
                rounds: [],
                events: [],
                markets: [],
                selections: [],
                audits: [],
                issues: [],
                marketObservations: [],
                selectionObservations: [],
                marketChanges: [],
                providerHealth: null
            };
        }
    }

    public save() {
        fs.writeFileSync(this.dataPath, JSON.stringify(this.data, null, 2), 'utf8');
    }

    async saveSnapshot(snapshot: ProviderSnapshot): Promise<void> {
        this.data.snapshots.push(snapshot); 
    }
    async saveRound(round: Round): Promise<void> {
        this.data.rounds.push(round); 
    }
    async saveEvent(event: Event): Promise<void> {
        this.data.events.push(event); 
    }
    async saveMarket(market: Market): Promise<void> {
        this.data.markets.push(market); 
    }
    async saveSelections(selections: MarketSelection[]): Promise<void> {
        this.data.selections.push(...selections); 
    }
    async saveAuditRecord(audit: ProviderRowAudit): Promise<void> {
        this.data.audits.push(audit); 
    }
    async saveIssue(issue: NormalizationIssue): Promise<void> {
        this.data.issues.push(issue); 
    }

    async saveMarketObservation(obs: MarketObservation): Promise<void> {
        this.data.marketObservations.push(obs); 
    }
    async saveSelectionObservations(obs: SelectionObservation[]): Promise<void> {
        this.data.selectionObservations.push(...obs); 
    }
    async saveMarketChange(change: MarketChange): Promise<void> {
        this.data.marketChanges.push(change); 
    }
    async saveProviderHealth(health: ProviderHealthState): Promise<void> {
        this.data.providerHealth = health; 
    }

    async getLatestMarketObservation(marketId: string): Promise<MarketObservation | null> {
        const obsList = this.data.marketObservations.filter((o: any) => o.marketId === marketId);
        if (obsList.length === 0) return null;
        return obsList[obsList.length - 1];
    }
    async getSelectionObservations(marketObservationId: string): Promise<SelectionObservation[]> {
        return this.data.selectionObservations.filter((o: any) => o.marketObservationId === marketObservationId);
    }
    async getPreviousMarketObservations(marketId: string, count: number): Promise<MarketObservation[]> {
        const obsList = this.data.marketObservations.filter((o: any) => o.marketId === marketId);
        return obsList.slice(-count);
    }
    async getMarketsBySnapshotId(snapshotId: string): Promise<MarketObservation[]> {
        return this.data.marketObservations.filter((o: any) => o.snapshotId === snapshotId);
    }
    async getActiveMarketsCount(): Promise<number> {
        const latestObs = new Map<string, any>();
        for (const o of this.data.marketObservations) {
            latestObs.set(o.marketId, o);
        }
        let activeCount = 0;
        // Approximation: if it hasn't been removed, it's active.
        // We could look at marketChanges to see if it was removed, or status.
        return latestObs.size;
    }
    async getAllMarketObservations(): Promise<MarketObservation[]> {
        return this.data.marketObservations;
    }
    async getAllMarketChanges(): Promise<MarketChange[]> {
        return this.data.marketChanges;
    }
}
