/**
 * A.PICK Normalized Model: OddsHistory
 * Tracks odds changes from two distinguishable sources.
 */
export type OddsHistorySource = 'PROVIDER_HISTORY' | 'APICK_OBSERVATION';

export interface OddsHistory {
  id: string;
  marketId: string;            // A.PICK Market.id
  selection: string;           // SelectionType or label
  beforeOdds: number | null;
  afterOdds: number | null;
  beforeLine: number | null;
  afterLine: number | null;
  changedAt: Date;
  source: OddsHistorySource;
  rawMetadata?: Record<string, unknown>;
}
