/**
 * A.PICK Normalized Model: Market
 * Provider-independent betting market for an Event.
 */
export type MarketType =
  | 'MONEYLINE_2WAY'   // 승패 (야구)
  | 'MONEYLINE_3WAY'   // 승무패 (축구)
  | 'HANDICAP_2WAY'    // 핸디캡 2way
  | 'HANDICAP_3WAY'    // 핸디캡 3way
  | 'TOTAL'            // 언더오버
  | 'WIN1LOSE'         // 승1패 (야구)
  | 'OTHER';           // 알 수 없는 마켓 — 보존됨

export type SelectionType = 'HOME' | 'DRAW' | 'AWAY' | 'OVER' | 'UNDER' | 'OTHER';

export interface MarketSelection {
  type: SelectionType;
  label: string;               // 한국어 레이블 (e.g. '승', '무', '패', '홈승', '오버')
  odds: number;
}

export interface Market {
  id: string;                  // internal UUID
  eventId: string;             // A.PICK Event.id
  providerMarketId: string;    // provider's market identifier
  marketType: MarketType;
  line: number | null;         // handicap/total line
  selections: MarketSelection[];
  rawMetadata: Record<string, unknown>;  // original provider fields, never discarded
  fetchedAt: Date;
}
