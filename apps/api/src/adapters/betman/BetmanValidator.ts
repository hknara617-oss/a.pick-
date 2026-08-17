/**
 * BetmanValidator
 * Zod schemas for validating raw Betman response structure.
 * Detects schema drift.
 *
 * Phase 1: minimal validation for probe.
 * Phase 2: extend with full field validation after schema confirmed.
 */

import { z } from 'zod';
import * as crypto from 'crypto';

// Minimal probe-time validation
export const BetmanCurrentLotterySchema = z.object({
  gmId: z.string().optional(),
  gmTs: z.union([z.string(), z.number()]).optional(),
  gameYear: z.string().optional(),
  lotteryName: z.string().optional(),
  lotteryStatus: z.string().optional(),
}).passthrough();

export const BetmanCompSchedulesSchema = z.object({
  keys: z.array(z.string()),
}).passthrough();

export const BetmanResponseSchema = z.object({
  currentLottery: BetmanCurrentLotterySchema.optional(),
  compSchedules: BetmanCompSchedulesSchema.optional(),
  tooltipList: z.array(z.unknown()).optional(),
}).passthrough();

export type BetmanResponseValidation =
  | { valid: true; schemaHash: string }
  | { valid: false; errors: z.ZodIssue[] };

export function validateBetmanResponse(raw: unknown): BetmanResponseValidation {
  const result = BetmanResponseSchema.safeParse(raw);
  if (!result.success) {
    return { valid: false, errors: result.error.issues };
  }
  // Schema hash for drift detection
  const keys = (result.data.compSchedules as { keys?: string[] })?.keys ?? [];
  const schemaHash = crypto
    .createHash('sha256')
    .update(JSON.stringify(keys.slice().sort()))
    .digest('hex')
    .substring(0, 16);
  return { valid: true, schemaHash };
}

// Known required fields from the harness
export const REQUIRED_SCHEDULE_KEYS = [
  'itemCode',
  'gameName',
  'gameDate',
  'leagueName',
  'homeName',
  'awayName',
  'matchSeq',
] as const;

export function checkRequiredKeys(discoveredKeys: string[]): {
  present: string[];
  missing: string[];
} {
  const keySet = new Set(discoveredKeys);
  const present: string[] = [];
  const missing: string[] = [];
  for (const k of REQUIRED_SCHEDULE_KEYS) {
    if (keySet.has(k)) {
      present.push(k);
    } else {
      missing.push(k);
    }
  }
  return { present, missing };
}
