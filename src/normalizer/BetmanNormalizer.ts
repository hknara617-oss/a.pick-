/**
 * BetmanNormalizer — Gate 2.2 corrected implementation
 *
 * Critical corrections applied:
 *  1. Event identity: homeId+awayId+leagueCode+gameDate (NOT matchSeq)
 *  2. matchSeq = providerMarketRowId (market-level, not event-level)
 *  3. compSchedules parsing: keys + datas (not top-level array)
 *  4. Market types: WIN1LOSE, ODD_EVEN, 전반 variants
 *  5. Zero-odds selections are excluded
 *  6. All 850 rows accounted for (normalized + unsupported + invalid + ambiguous = 850)
 */

import { BetmanRepository } from '../repository/BetmanRepository';
import * as crypto from 'crypto';

// ── Types ─────────────────────────────────────────────────────────────────────

export type NormalizationStatus = 'NORMALIZED' | 'UNSUPPORTED' | 'INVALID' | 'AMBIGUOUS';

export type NormalizedMarketType =
  | 'MONEYLINE_3WAY'
  | 'MONEYLINE_2WAY'
  | 'HANDICAP_2WAY'
  | 'HANDICAP_3WAY'
  | 'TOTAL'
  | 'WIN1LOSE'
  | 'ODD_EVEN'       // 홀짝 (SUM market) — shortlistEligible=false
  | 'OTHER';

export interface IngestionSummary {
  snapshotId: string;
  round: {
    providerRoundId: string;
    year: number | null;
    roundNumber: number | null;
    gmTsDecodingStatus: 'UNVERIFIED' | 'VERIFIED';
  };
  providerRows: number;
  normalizedEvents: number;
  normalizedMarkets: number;
  normalizedSelections: number;
  unsupportedRows: number;
  invalidRows: number;
  ambiguousRows: number;
  checksum: number;
  checksumMatch: boolean;
  warnings: string[];
  marketTypeBreakdown: Record<string, number>;
}

// ── Market type mapping (empirically verified from Gate 2.1 audit) ────────────

interface MarketTypeResult {
  type: NormalizedMarketType;
  shortlistEligible: boolean;
  selectionSemantic: 'WIN_DRAW_LOSE' | 'WIN_LOSE' | 'HOME_AWAY' | 'OVER_UNDER' | 'ODD_EVEN' | 'WIN1LOSE' | 'UNKNOWN';
  isHalfTime: boolean;
}

const MARKET_TYPE_MAP: Record<string, MarketTypeResult> = {
  // Soccer
  '1':   { type: 'MONEYLINE_3WAY', shortlistEligible: true,  selectionSemantic: 'WIN_DRAW_LOSE', isHalfTime: false },
  '5':   { type: 'HANDICAP_2WAY',  shortlistEligible: true,  selectionSemantic: 'HOME_AWAY',     isHalfTime: false },
  '28':  { type: 'HANDICAP_2WAY',  shortlistEligible: true,  selectionSemantic: 'HOME_AWAY',     isHalfTime: false }, // 소수핸디캡
  '78':  { type: 'TOTAL',          shortlistEligible: true,  selectionSemantic: 'OVER_UNDER',    isHalfTime: false },
  '17':  { type: 'ODD_EVEN',       shortlistEligible: false, selectionSemantic: 'ODD_EVEN',      isHalfTime: false }, // 축구 SUM 홀짝
  '118': { type: 'MONEYLINE_3WAY', shortlistEligible: false, selectionSemantic: 'WIN_DRAW_LOSE', isHalfTime: true  }, // 축구 전반 승무패
  '119': { type: 'HANDICAP_2WAY',  shortlistEligible: false, selectionSemantic: 'HOME_AWAY',     isHalfTime: true  }, // 축구 전반 핸디캡
  '121': { type: 'TOTAL',          shortlistEligible: false, selectionSemantic: 'OVER_UNDER',    isHalfTime: true  }, // 축구 전반 언더오버

  // Baseball
  '2':   { type: 'MONEYLINE_2WAY', shortlistEligible: true,  selectionSemantic: 'WIN_LOSE',      isHalfTime: false },
  '108': { type: 'WIN1LOSE',       shortlistEligible: true,  selectionSemantic: 'WIN1LOSE',      isHalfTime: false }, // 야구 승1패
  '7':   { type: 'HANDICAP_2WAY',  shortlistEligible: true,  selectionSemantic: 'HOME_AWAY',     isHalfTime: false },
  '79':  { type: 'TOTAL',          shortlistEligible: true,  selectionSemantic: 'OVER_UNDER',    isHalfTime: false },
  '77':  { type: 'ODD_EVEN',       shortlistEligible: false, selectionSemantic: 'ODD_EVEN',      isHalfTime: false }, // 야구 SUM 홀짝
  '111': { type: 'MONEYLINE_3WAY', shortlistEligible: false, selectionSemantic: 'WIN_DRAW_LOSE', isHalfTime: true  }, // 야구 전반 승무패
  '127': { type: 'HANDICAP_2WAY',  shortlistEligible: false, selectionSemantic: 'HOME_AWAY',     isHalfTime: true  }, // 야구 전반 핸디캡
  '114': { type: 'TOTAL',          shortlistEligible: false, selectionSemantic: 'OVER_UNDER',    isHalfTime: true  }, // 야구 전반 언더오버

  // Basketball
  '3':   { type: 'MONEYLINE_2WAY', shortlistEligible: true,  selectionSemantic: 'WIN_LOSE',   isHalfTime: false },
  '6':   { type: 'HANDICAP_2WAY',  shortlistEligible: true,  selectionSemantic: 'HOME_AWAY',  isHalfTime: false },
  '80':  { type: 'TOTAL',          shortlistEligible: true,  selectionSemantic: 'OVER_UNDER', isHalfTime: false },
  '75':  { type: 'ODD_EVEN',       shortlistEligible: false, selectionSemantic: 'ODD_EVEN',   isHalfTime: false }, // 농구 SUM 홀짝
};

function resolveMarketType(row: Record<string, unknown>): MarketTypeResult {
  const betId = String(row.betId ?? '');
  if (MARKET_TYPE_MAP[betId]) return MARKET_TYPE_MAP[betId];
  return { type: 'OTHER', shortlistEligible: false, selectionSemantic: 'UNKNOWN', isHalfTime: false };
}

// ── Canonical event key ───────────────────────────────────────────────────────

function canonicalEventKey(row: Record<string, unknown>): string {
  return `${row.homeId}|${row.awayId}|${row.leagueCode}|${row.gameDate}`;
}

function stableId(prefix: string, key: string): string {
  return `${prefix}_${crypto.createHash('sha256').update(key).digest('hex').slice(0, 12)}`;
}

// ── Seoul timezone display ────────────────────────────────────────────────────

function toSeoulISO(unixMs: number): string {
  if (!unixMs || isNaN(unixMs)) return 'INVALID';
  const d = new Date(unixMs + 9 * 3600 * 1000);
  return d.toISOString().replace('Z', '+09:00');
}

// ── Line parsing ──────────────────────────────────────────────────────────────

function parseHandicapLine(row: Record<string, unknown>): number {
  // handi field = home team's handicap (positive = home receives)
  const v = row.handi;
  if (v === null || v === undefined) return 0;
  return parseFloat(String(v)) || 0;
}

function parseTotalLine(row: Record<string, unknown>): number {
  // For TOTAL markets, handi field holds the O/U line
  const v = row.handi;
  if (v === null || v === undefined) return 0;
  return parseFloat(String(v)) || 0;
}

// ── Selection builders ────────────────────────────────────────────────────────

function buildSelections(
  marketId: string,
  type: NormalizedMarketType,
  semantic: string,
  row: Record<string, unknown>
): Array<{ id: string; marketId: string; selectionType: string; odds: number; providerLabel: string }> {
  const sels: Array<{ id: string; marketId: string; selectionType: string; odds: number; providerLabel: string }> = [];

  const w = Number(row.winAllot) || 0;
  const d = Number(row.drawAllot) || 0;
  const l = Number(row.loseAllot) || 0;
  const wTxt = String(row.winTxt || '승');
  const dTxt = String(row.drawTxt || '무');
  const lTxt = String(row.loseTxt || '패');

  const addSel = (selType: string, odds: number, label: string) => {
    if (odds <= 0) return; // Never create selection for zero/negative odds
    sels.push({ id: `SEL_${marketId}_${selType}`, marketId, selectionType: selType, odds, providerLabel: label });
  };

  switch (semantic) {
    case 'WIN_DRAW_LOSE':
      addSel('HOME', w, wTxt);
      addSel('DRAW', d, dTxt);
      addSel('AWAY', l, lTxt);
      break;
    case 'WIN_LOSE':
      addSel('HOME', w, wTxt);
      addSel('AWAY', l, lTxt);
      break;
    case 'HOME_AWAY':   // handicap
      addSel('HOME_HANDICAP', w, wTxt);
      if (type === 'HANDICAP_3WAY') addSel('DRAW_HANDICAP', d, dTxt);
      addSel('AWAY_HANDICAP', l, lTxt);
      break;
    case 'OVER_UNDER':
      // For TOTAL: winAllot = over, loseAllot = under (verified from betNm context)
      addSel('OVER', w, '오버');
      addSel('UNDER', l, '언더');
      break;
    case 'ODD_EVEN':
      // ODD = winAllot, EVEN = loseAllot (from SUM market structure)
      addSel('ODD', w, '홀');
      addSel('EVEN', l, '짝');
      break;
    case 'WIN1LOSE':
      // 야구 승1패: win=승, draw=1점차승(무효경기보완), lose=패
      // drawAllot > 0 here means '1점차 승' special outcome
      addSel('HOME', w, wTxt);
      if (d > 0) addSel('DRAW', d, dTxt); // preserve if non-zero
      addSel('AWAY', l, lTxt);
      break;
    default:
      break;
  }

  return sels;
}

// ── Main normalizer ───────────────────────────────────────────────────────────

export class BetmanNormalizer {
  constructor(private repository: BetmanRepository) {}

  public async normalize(fixtureJson: Record<string, unknown>): Promise<IngestionSummary> {

    // ── Parse rows via keys + datas (Gate 2.1 correction) ────────────────────
    const cs = fixtureJson.compSchedules as Record<string, unknown> | undefined;
    if (!cs || !Array.isArray(cs.keys) || !Array.isArray(cs.datas)) {
      throw new Error('INVALID_FIXTURE: compSchedules.keys or compSchedules.datas missing');
    }
    const schemaKeys = cs.keys as string[];
    const rawRows = cs.datas as unknown[][];
    const rows: Record<string, unknown>[] = rawRows.map(arr =>
      Object.fromEntries(schemaKeys.map((k, i) => [k, (arr as unknown[])[i]]))
    );

    const snapshotId = `SNAP_${Date.now()}`;

    // ── Round identity (gmTs decoding = UNVERIFIED with single fixture) ───────
    const gmTs = fixtureJson.gmTs as number ?? (fixtureJson.currentLottery as Record<string,unknown>)?.gmTs as number;
    const currentLottery = fixtureJson.currentLottery as Record<string, unknown> | undefined;
    const providerRoundId = String(gmTs ?? 'UNKNOWN');

    // gmTs=260096: single fixture only — cannot verify decode formula
    const roundInfo = {
      providerRoundId,
      year: null as number | null,         // UNVERIFIED
      roundNumber: null as number | null,   // UNVERIFIED
      gmTsDecodingStatus: 'UNVERIFIED' as const,
    };

    await this.repository.saveRound({
      providerRoundId,
      year: new Date().getFullYear(), // placeholder
      roundNumber: 0,
    });

    await this.repository.saveSnapshot({
      snapshotId,
      gmId: String((fixtureJson as Record<string,unknown>).gmId ?? currentLottery?.gmId ?? 'G101'),
      gmTs: typeof gmTs === 'number' ? gmTs : 0,
      fetchedAt: new Date().toISOString(),
    });

    // ── Ingestion summary ─────────────────────────────────────────────────────
    const summary: IngestionSummary = {
      snapshotId,
      round: roundInfo,
      providerRows: rows.length,
      normalizedEvents: 0,
      normalizedMarkets: 0,
      normalizedSelections: 0,
      unsupportedRows: 0,
      invalidRows: 0,
      ambiguousRows: 0,
      checksum: 0,
      checksumMatch: false,
      warnings: [],
      marketTypeBreakdown: {},
    };

    // ── Event deduplication map (canonical key → event ID) ───────────────────
    const canonicalToEventId = new Map<string, string>();

    // ── Process all rows ──────────────────────────────────────────────────────
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rawHash = crypto
        .createHash('sha256')
        .update(JSON.stringify(row))
        .digest('hex');

      let status: NormalizationStatus = 'NORMALIZED';
      const warningCodes: string[] = [];

      // Validity: must have matchSeq
      if (!row.matchSeq) {
        status = 'INVALID';
        warningCodes.push('MISSING_MATCH_SEQ');
        summary.invalidRows++;
        await this.recordAudit(snapshotId, i, 'UNKNOWN', null, null, status, warningCodes, rawHash);
        continue;
      }

      const providerMarketRowId = String(row.matchSeq); // matchSeq = market-level ID

      // ── Canonical event identity ──────────────────────────────────────────
      if (!row.homeId || !row.awayId || !row.leagueCode || !row.gameDate) {
        status = 'AMBIGUOUS';
        warningCodes.push('AMBIGUOUS_EVENT_KEY');
        summary.ambiguousRows++;
        await this.recordAudit(snapshotId, i, providerMarketRowId, null, null, status, warningCodes, rawHash);
        continue;
      }

      const evtKey = canonicalEventKey(row);
      let eventId: string;

      if (!canonicalToEventId.has(evtKey)) {
        eventId = stableId('EVT', evtKey);
        canonicalToEventId.set(evtKey, eventId);
        summary.normalizedEvents++;

        await this.repository.saveEvent({
          id: eventId,
          providerEventId: evtKey,    // canonical composite key
          sport: this.mapSport(row.matchSportId),
          league: String(row.leagueName || 'UNKNOWN'),
          homeTeam: String(row.homeName || 'UNKNOWN'),
          awayTeam: String(row.awayName || 'UNKNOWN'),
          startAt: new Date(Number(row.gameDate)).toISOString(),
        });
      } else {
        eventId = canonicalToEventId.get(evtKey)!;
      }

      // ── Market type resolution ─────────────────────────────────────────────
      const marketTypeResult = resolveMarketType(row);

      if (marketTypeResult.type === 'OTHER') {
        status = 'UNSUPPORTED';
        warningCodes.push(`UNSUPPORTED_MARKET_betId_${row.betId}`);
        summary.unsupportedRows++;
        await this.recordAudit(snapshotId, i, providerMarketRowId, eventId, null, status, warningCodes, rawHash);
        continue;
      }

      // ODD_EVEN: normalize but mark unsupported for product
      // Still normalize to DB; product layer checks shortlistEligible
      if (marketTypeResult.type === 'ODD_EVEN') {
        warningCodes.push('ODD_EVEN_NOT_SHORTLIST_ELIGIBLE');
      }

      // ── Line parsing ───────────────────────────────────────────────────────
      let line: number | null = null;
      if (marketTypeResult.type === 'HANDICAP_2WAY' || marketTypeResult.type === 'HANDICAP_3WAY') {
        line = parseHandicapLine(row);
      } else if (marketTypeResult.type === 'TOTAL') {
        line = parseTotalLine(row);
      }

      // ── Market ID: derived from provider + gmTs + matchSeq ──
      const marketId = stableId('MKT', `betman|${gmTs}|${providerMarketRowId}`);
      summary.normalizedMarkets++;
      summary.marketTypeBreakdown[marketTypeResult.type] =
        (summary.marketTypeBreakdown[marketTypeResult.type] || 0) + 1;

      await this.repository.saveMarket({
        id: marketId,
        eventId,
        providerMarketId: providerMarketRowId, // matchSeq preserved
        marketType: marketTypeResult.type,
        line: line ?? undefined,
        status: 'OPEN',
      });

      // ── Selections ─────────────────────────────────────────────────────────
      const selections = buildSelections(
        marketId,
        marketTypeResult.type,
        marketTypeResult.selectionSemantic,
        row
      );

      if (selections.length > 0) {
        await this.repository.saveSelections(selections);
        summary.normalizedSelections += selections.length;
      } else {
        warningCodes.push('NO_VALID_SELECTIONS');
        // Don't mark INVALID for ODD_EVEN with zero odds — that's expected
        if (marketTypeResult.type !== 'ODD_EVEN') {
          status = 'INVALID';
          summary.invalidRows++;
          summary.normalizedMarkets--; // rollback market count
        }
      }

      await this.recordAudit(
        snapshotId, i, providerMarketRowId, eventId, marketId, status, warningCodes, rawHash
      );
    }

    // ── Checksum ──────────────────────────────────────────────────────────────
    summary.checksum = summary.normalizedMarkets + summary.unsupportedRows +
                       summary.invalidRows + summary.ambiguousRows;
    summary.checksumMatch = summary.checksum === rows.length;
    if (!summary.checksumMatch) {
      summary.warnings.push(`CHECKSUM_MISMATCH: ${summary.checksum} !== ${rows.length}`);
    }

    return summary;
  }

  private mapSport(sportId: unknown): string {
    const sid = String(sportId ?? '');
    const map: Record<string, string> = {
      '1': 'SOCCER', '2': 'BASEBALL', '3': 'BASKETBALL', '4': 'VOLLEYBALL',
    };
    return map[sid] ?? `OTHER_${sid}`;
  }

  private async recordAudit(
    snapshotId: string,
    rowIndex: number,
    providerMarketRowId: string,
    normalizedEventId: string | null,
    normalizedMarketId: string | null,
    status: NormalizationStatus,
    warnings: string[],
    hash: string
  ) {
    await this.repository.saveAuditRecord({
      snapshotId,
      providerRowIndex: rowIndex,
      providerEventId: providerMarketRowId,
      normalizedEventId,
      normalizedMarketId,
      normalizationStatus: status,
      warningCodes: warnings,
      rawRowHash: hash,
    });
  }
}

// ── Tooltip helpers (Gate 2.2) ────────────────────────────────────────────────

/**
 * Normalize tooltip odds from provider integer scale to decimal.
 * Verified: BCHG_W_ODDS=480 → 4.80, ACHG_W_ODDS=405 → 4.05
 * IMPORTANT: compSchedules odds (winAllot etc.) are already decimal — DO NOT apply /100 to them.
 */
export function normalizeTooltipOdds(raw: unknown): number | null {
  if (raw === null || raw === undefined) return null;
  const n = Number(raw);
  if (isNaN(n)) return null;
  if (n === 0) return null; // 0 odds = no selection
  if (n < 0) return null;  // invalid
  return Math.round((n / 100) * 1000) / 1000; // divide by 100, preserve 3dp
}

/**
 * Tooltip timestamp CHG_DTM is NOT a standard Unix timestamp.
 * Example: 20260815191634031948
 * Appears to be: YYYYMMDDHHmmss + 6-digit nanosecond suffix
 * DO NOT parse until format is empirically confirmed.
 */
export function parseTooltipTimestamp(raw: unknown): {
  raw: string;
  parsedAt: null;
  status: 'UNVERIFIED_TIMESTAMP_FORMAT';
  note: string;
} {
  return {
    raw: String(raw ?? ''),
    parsedAt: null,
    status: 'UNVERIFIED_TIMESTAMP_FORMAT',
    note: 'CHG_DTM format unverified. Looks like YYYYMMDDHHmmss+nanoseconds. Requires empirical confirmation.',
  };
}
