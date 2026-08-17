import { BetmanRepository } from './BetmanRepository';
import { MarketObservation } from '../models/MarketObservation';
import { SelectionObservation } from '../models/SelectionObservation';
import { MarketChange } from '../models/MarketChange';

export interface ProviderHealthState {
    provider: string;
    lastAttemptAt: string | null;
    lastSuccessAt: string | null;
    latencyMs: number | null;
    consecutiveFailures: number;
    latestSnapshotHash: string | null;
    schemaHash: string | null;
    staleAgeMs: number;
    state: 'HEALTHY' | 'DEGRADED' | 'STALE' | 'DOWN';
}

export interface IRepository extends BetmanRepository {
    // Phase 3 additions
    saveMarketObservation(obs: MarketObservation): Promise<void>;
    saveSelectionObservations(obs: SelectionObservation[]): Promise<void>;
    saveMarketChange(change: MarketChange): Promise<void>;
    saveProviderHealth(health: ProviderHealthState): Promise<void>;
    
    // Retrievals for change detection
    getLatestMarketObservation(marketId: string): Promise<MarketObservation | null>;
    getSelectionObservations(marketObservationId: string): Promise<SelectionObservation[]>;
    getPreviousMarketObservations(marketId: string, count: number): Promise<MarketObservation[]>;
    
    // Needed to calculate if a market is removed
    getMarketsBySnapshotId(snapshotId: string): Promise<MarketObservation[]>;
    
    getActiveMarketsCount(): Promise<number>;
    
    getAllMarketObservations(): Promise<MarketObservation[]>;
    getAllMarketChanges(): Promise<MarketChange[]>;
}
