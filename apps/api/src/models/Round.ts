/**
 * A.PICK Normalized Model: Round
 * Provider-independent. Built from BetmanNormalizer output.
 */
export type SaleStatus = 'OPEN' | 'CLOSED' | 'RESULT' | 'UNKNOWN';

export interface Round {
  id: string;                  // internal UUID
  provider: string;            // e.g. 'BETMAN'
  providerRoundId: string;     // e.g. 'G101-2026-96'
  year: number;
  roundNumber: number;
  gameName: string;            // e.g. '프로토 승부식'
  gameId: string;              // e.g. 'G101'
  saleStatus: SaleStatus;
  saleStartAt: Date | null;
  saleEndAt: Date | null;
  resultAt: Date | null;
  fetchedAt: Date;
}
