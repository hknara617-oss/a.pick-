import { Database } from 'sqlite';

export interface ProviderSnapshot {
    snapshotId: string;
    gmId: string;
    gmTs: number;
    fetchedAt: string;
}

export interface Round {
    providerRoundId: string;
    year: number;
    roundNumber: number;
}

export interface Event {
    id: string; // canonical id
    providerEventId: string; // e.g., matchSeq
    sport: string;
    league: string;
    homeTeam: string;
    awayTeam: string;
    startAt: string; // UTC ISO
}

export interface Market {
    id: string;
    eventId: string;
    providerMarketId: string;
    marketType: string;
    line?: number;
    status: string;
}

export interface MarketSelection {
    id: string;
    marketId: string;
    selectionType: string;
    odds: number;
    providerLabel: string;
}

export interface ProviderRowAudit {
    snapshotId: string;
    providerRowIndex: number;
    providerEventId: string;
    normalizedEventId: string | null;
    normalizedMarketId: string | null;
    normalizationStatus: 'NORMALIZED' | 'UNSUPPORTED' | 'INVALID' | 'AMBIGUOUS';
    warningCodes: string[];
    rawRowHash: string;
}

export interface NormalizationIssue {
    issueId: string;
    snapshotId: string;
    providerRowIndex: number;
    issueCode: string;
    message: string;
}

export interface BetmanRepository {
    saveSnapshot(snapshot: ProviderSnapshot): Promise<void>;
    saveRound(round: Round): Promise<void>;
    saveEvent(event: Event): Promise<void>;
    saveMarket(market: Market): Promise<void>;
    saveSelections(selections: MarketSelection[]): Promise<void>;
    saveAuditRecord(audit: ProviderRowAudit): Promise<void>;
    saveIssue(issue: NormalizationIssue): Promise<void>;
}
