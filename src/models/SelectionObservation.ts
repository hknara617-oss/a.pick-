export interface SelectionObservation {
  id: string;
  marketObservationId: string;
  selectionType: string;
  providerLabel: string;
  oddsDecimal: string;   // TEXT — e.g. "1.63" (canonical, no float imprecision)
  oddsRaw: number;       // original provider number
  observedAt: string;
}
