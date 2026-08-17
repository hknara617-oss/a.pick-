export interface MarketChange {
  id: string;
  marketId: string;
  previousObservationId: string | null;
  currentObservationId: string;
  detectedAt: string;
  changeType: 'ODDS_CHANGE' | 'LINE_CHANGE' | 'MARKET_ADDED' | 'MARKET_REMOVED'
            | 'MARKET_SUSPENDED' | 'MARKET_RESTORED' | 'SELECTION_ADDED' | 'SELECTION_REMOVED';
  beforeLine: number | null;
  afterLine: number | null;
  changedSelections: Array<{
    selectionType: string;
    before: string | null;  // canonical decimal string
    after: string | null;
  }>;
  source: 'APICK_OBSERVATION' | 'PROVIDER_HISTORY';
}
