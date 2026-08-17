/**
 * BetmanParser unit tests
 * Uses sanitized fixture data — no real provider secrets.
 */

import { describe, it, expect } from 'vitest';
import { parseBetmanResponse } from '../../adapters/betman/BetmanParser';
import { validateBetmanResponse, checkRequiredKeys } from '../../adapters/betman/BetmanValidator';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const MOCK_KEYS = [
  'itemCode', 'itemName', 'gameName', 'gameDate', 'endDate',
  'leagueCode', 'leagueName', 'leagueShortName', 'domastic',
  'matchSeq', 'homeId', 'awayId', 'homeName', 'awayName',
  'winTxt', 'winOdds', 'drawTxt', 'drawOdds', 'loseTxt', 'loseOdds',
];

function makeRow(overrides: Record<string, unknown> = {}): unknown[] {
  return MOCK_KEYS.map((k) => {
    if (k in overrides) return overrides[k];
    if (k.endsWith('Odds')) return '2.00';
    if (k === 'gameName') return '축구 승무패';
    if (k === 'homeName') return '한국';
    if (k === 'awayName') return '일본';
    if (k === 'domastic') return 'N';
    return `${k}_value`;
  });
}

const MOCK_VALID_RESPONSE = JSON.stringify({
  currentLottery: {
    gmId: 'G101',
    gmTs: 260096,
    gameYear: '2026',
    lotteryName: '프로토 승부식',
    lotteryStatus: 'OPEN',
    saleStartDate: '2026-08-10',
    saleEndDate: '2026-08-16',
    resultDate: '2026-08-17',
  },
  compSchedules: {
    keys: MOCK_KEYS,
    list: [makeRow(), makeRow({ homeName: '맨체스터 시티', awayName: '리버풀', gameName: '축구 승무패' })],
  },
  tooltipList: [{ id: 1, text: '배당 변화 있음' }, { id: 2, text: '주목 경기' }],
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('BetmanParser', () => {
  it('parses valid response successfully', () => {
    const result = parseBetmanResponse(MOCK_VALID_RESPONSE);
    expect(result.success).toBe(true);
    expect(result.currentLottery?.gmId).toBe('G101');
    expect(result.currentLottery?.lotteryName).toBe('프로토 승부식');
  });

  it('extracts compSchedules keys', () => {
    const result = parseBetmanResponse(MOCK_VALID_RESPONSE);
    expect(result.schemaKeys).toEqual(MOCK_KEYS);
  });

  it('parses rows via keys[]+values[] (no hardcoded indices)', () => {
    const result = parseBetmanResponse(MOCK_VALID_RESPONSE);
    expect(result.scheduleRows).toHaveLength(2);
    expect(result.scheduleRows![0]['homeName']).toBe('한국');
    expect(result.scheduleRows![0]['awayName']).toBe('일본');
    expect(result.scheduleRows![1]['homeName']).toBe('맨체스터 시티');
  });

  it('preserves Korean team names', () => {
    const result = parseBetmanResponse(MOCK_VALID_RESPONSE);
    const row = result.scheduleRows![0];
    expect(typeof row['homeName']).toBe('string');
    expect(row['homeName']).toBe('한국');
  });

  it('parses tooltipList', () => {
    const result = parseBetmanResponse(MOCK_VALID_RESPONSE);
    expect(result.tooltipList).toHaveLength(2);
  });

  it('fails gracefully on invalid JSON', () => {
    const result = parseBetmanResponse('not json{{{');
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/JSON_PARSE_ERROR/);
  });

  it('fails gracefully on empty string', () => {
    const result = parseBetmanResponse('');
    expect(result.success).toBe(false);
  });

  it('fails on array top-level', () => {
    const result = parseBetmanResponse('[]');
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/UNEXPECTED_TOP_LEVEL_TYPE/);
  });

  it('detects unknown top-level keys', () => {
    const withExtra = JSON.stringify({ ...JSON.parse(MOCK_VALID_RESPONSE), extraField: 'mystery' });
    const result = parseBetmanResponse(withExtra);
    expect(result.unknownTopLevelKeys).toContain('extraField');
  });
});

describe('BetmanValidator', () => {
  it('validates a valid response', () => {
    const parsed = JSON.parse(MOCK_VALID_RESPONSE);
    const result = validateBetmanResponse(parsed);
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.schemaHash).toHaveLength(16);
    }
  });

  it('schema hash is stable for same keys', () => {
    const parsed = JSON.parse(MOCK_VALID_RESPONSE);
    const r1 = validateBetmanResponse(parsed);
    const r2 = validateBetmanResponse(parsed);
    expect((r1 as { schemaHash: string }).schemaHash).toBe(
      (r2 as { schemaHash: string }).schemaHash
    );
  });

  it('schema hash changes when keys change', () => {
    const parsed1 = JSON.parse(MOCK_VALID_RESPONSE);
    const parsed2 = JSON.parse(MOCK_VALID_RESPONSE);
    parsed2.compSchedules.keys = [...MOCK_KEYS, 'newUnknownField'];

    const r1 = validateBetmanResponse(parsed1);
    const r2 = validateBetmanResponse(parsed2);
    expect((r1 as { schemaHash: string }).schemaHash).not.toBe(
      (r2 as { schemaHash: string }).schemaHash
    );
  });

  it('rejects non-array keys', () => {
    const bad = { compSchedules: { keys: 'not-an-array' } };
    const result = validateBetmanResponse(bad);
    expect(result.valid).toBe(false);
  });

  it('checks required schedule keys — present', () => {
    const { present, missing } = checkRequiredKeys(MOCK_KEYS);
    expect(missing).toHaveLength(0);
    expect(present).toContain('homeName');
    expect(present).toContain('awayName');
    expect(present).toContain('matchSeq');
  });

  it('checks required schedule keys — missing', () => {
    const keysWithoutMatchSeq = MOCK_KEYS.filter((k) => k !== 'matchSeq');
    const { missing } = checkRequiredKeys(keysWithoutMatchSeq);
    expect(missing).toContain('matchSeq');
  });
});
