/**
 * A.PICK Normalized Model: Event
 * Provider-independent sports event (match).
 */
export type Sport = 'FOOTBALL' | 'BASEBALL' | 'BASKETBALL' | 'VOLLEYBALL' | 'OTHER';
export type EventStatus = 'SCHEDULED' | 'OPEN' | 'CLOSED' | 'LIVE' | 'FINISHED' | 'POSTPONED' | 'CANCELLED' | 'UNKNOWN';

export interface TeamRef {
  providerId: string;
  name: string;                // Korean-preserved team name
  nameEn?: string;
}

export interface Event {
  id: string;                  // internal UUID
  roundId: string;             // A.PICK Round.id
  providerEventId: string;     // provider's unique match identifier
  sport: Sport;
  leagueId: string;
  leagueName: string;          // Korean-preserved
  leagueShortName?: string;
  domestic: boolean;           // 국내 경기 여부
  startAt: Date;
  closeAt: Date | null;
  venue: string | null;
  home: TeamRef;
  away: TeamRef;
  status: EventStatus;
  fetchedAt: Date;
}
