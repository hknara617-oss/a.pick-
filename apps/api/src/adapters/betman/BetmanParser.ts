/**
 * BetmanParser
 * Converts raw Betman JSON body into typed provider objects.
 *
 * Critical rule: compSchedules rows are parsed via keys[]+values[]
 * NO hardcoded array index assumptions.
 */

export interface BetmanRawResponse {
  currentLottery?: BetmanCurrentLottery;
  compSchedules?: BetmanCompSchedules;
  tooltipList?: BetmanTooltipEntry[];
  [key: string]: unknown;
}

export interface BetmanCurrentLottery {
  gmId?: string;
  gmTs?: number | string;
  gameYear?: string;
  lotteryName?: string;
  gameTypeName?: string;
  lotteryStatus?: string;
  saleStartDate?: string;
  saleEndDate?: string;
  resultDate?: string;
  [key: string]: unknown;
}

export interface BetmanCompSchedules {
  keys: string[];
  // The row array might be named differently — we inspect actual response
  [key: string]: unknown;
}

export interface BetmanTooltipEntry {
  [key: string]: unknown;
}

// Each row deserialized from compSchedules.keys + values[]
export type BetmanScheduleRow = Record<string, unknown>;

export interface ParseResult {
  success: boolean;
  error?: string;
  raw?: BetmanRawResponse;
  currentLottery?: BetmanCurrentLottery;
  scheduleRows?: BetmanScheduleRow[];
  schemaKeys?: string[];
  tooltipList?: BetmanTooltipEntry[];
  unknownTopLevelKeys?: string[];
}

const KNOWN_TOP_LEVEL_KEYS = ['currentLottery', 'compSchedules', 'tooltipList'];

/**
 * Discovers the row array inside compSchedules.
 * The key holding the rows is unknown — iterate all keys except 'keys'.
 */
function extractScheduleRows(
  cs: BetmanCompSchedules
): { rows: BetmanScheduleRow[]; rowKey: string } | null {
  const keys = cs.keys;
  if (!Array.isArray(keys) || keys.length === 0) return null;

  for (const [k, v] of Object.entries(cs)) {
    if (k === 'keys') continue;
    if (Array.isArray(v) && v.length > 0 && Array.isArray(v[0])) {
      // v is an array of row arrays
      const rows: BetmanScheduleRow[] = (v as unknown[][]).map((row) =>
        Object.fromEntries(keys.map((key, idx) => [key, row[idx]]))
      );
      return { rows, rowKey: k };
    }
  }

  // Fallback: rows might be array of objects (already keyed)
  for (const [k, v] of Object.entries(cs)) {
    if (k === 'keys') continue;
    if (Array.isArray(v) && v.length > 0 && typeof v[0] === 'object') {
      return { rows: v as BetmanScheduleRow[], rowKey: k };
    }
  }

  return null;
}

export function parseBetmanResponse(rawBody: string): ParseResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch (e) {
    return { success: false, error: `JSON_PARSE_ERROR: ${String(e)}` };
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return { success: false, error: 'UNEXPECTED_TOP_LEVEL_TYPE' };
  }

  const raw = parsed as BetmanRawResponse;

  // Detect unknown top-level keys for schema drift monitoring
  const unknownTopLevelKeys = Object.keys(raw).filter(
    (k) => !KNOWN_TOP_LEVEL_KEYS.includes(k)
  );

  const currentLottery = raw.currentLottery;
  const tooltipList = raw.tooltipList;

  let scheduleRows: BetmanScheduleRow[] | undefined;
  let schemaKeys: string[] | undefined;

  const cs = raw.compSchedules;
  if (cs && typeof cs === 'object') {
    const csTyped = cs as BetmanCompSchedules;
    schemaKeys = Array.isArray(csTyped.keys) ? csTyped.keys : undefined;

    const extracted = extractScheduleRows(csTyped);
    if (extracted) {
      scheduleRows = extracted.rows;
    }
  }

  return {
    success: true,
    raw,
    currentLottery,
    scheduleRows,
    schemaKeys,
    tooltipList: Array.isArray(tooltipList) ? (tooltipList as BetmanTooltipEntry[]) : undefined,
    unknownTopLevelKeys,
  };
}
