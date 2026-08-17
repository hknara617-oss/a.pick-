/**
 * BetmanNormalizer
 * Converts BetmanParser output into A.PICK normalized models.
 * UI code must NEVER import BetmanParser or BetmanClient directly.
 *
 * Phase 1 STUB — normalization logic will be built in Phase 2
 * after Gate 1 confirms actual schema keys.
 */

import type { BetmanCurrentLottery, BetmanScheduleRow } from './BetmanParser';
import type { Round } from '../../models/Round';
import type { Event } from '../../models/Event';
import type { Market } from '../../models/Market';

// Placeholder until Phase 2
export function normalizeRound(
  _currentLottery: BetmanCurrentLottery,
  _gmId: string
): Round {
  throw new Error(
    'BetmanNormalizer.normalizeRound: NOT IMPLEMENTED — awaiting Gate 1 schema confirmation'
  );
}

export function normalizeEvents(
  _rows: BetmanScheduleRow[],
  _roundId: string
): Event[] {
  throw new Error(
    'BetmanNormalizer.normalizeEvents: NOT IMPLEMENTED — awaiting Gate 1 schema confirmation'
  );
}

export function normalizeMarkets(
  _rows: BetmanScheduleRow[],
  _eventMap: Map<string, string>
): Market[] {
  throw new Error(
    'BetmanNormalizer.normalizeMarkets: NOT IMPLEMENTED — awaiting Gate 1 schema confirmation'
  );
}
