export interface MarketObservation {
  id: string;
  provider: string;
  roundId: string;
  marketId: string;
  providerMarketId: string;  // matchSeq
  observedAt: string;        // UTC ISO
  providerFetchedAt: string; // UTC ISO
  marketType: string;
  line: number | null;
  snapshotId: string;
  rowHash: string;
  parserVersion: string;
}
