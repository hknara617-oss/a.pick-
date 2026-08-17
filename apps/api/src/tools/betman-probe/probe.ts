/**
 * A.PICK — Betman Connector Probe
 * ================================
 * PHASE 1 / GATE 1
 *
 * Tests three request levels (A, B, C) against the observed Betman endpoint.
 * Does NOT use personal/session cookies.
 * Does NOT bypass authentication.
 * Reports AUTH_REQUIRED if a login redirect is detected.
 *
 * Run: npx ts-node src/tools/betman-probe/probe.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

import {
  betmanFetch,
  type BetmanRequestPayload,
  type RequestLevel,
} from '../../adapters/betman/BetmanClient';
import { parseBetmanResponse } from '../../adapters/betman/BetmanParser';
import { validateBetmanResponse, checkRequiredKeys } from '../../adapters/betman/BetmanValidator';

// ── Types ────────────────────────────────────────────────────────────────────

export type ProbeStatus = 'PASS' | 'FAIL' | 'AUTH_REQUIRED' | 'ERROR';
export type MinimumRequestLevel = 'A' | 'B' | 'C' | 'NONE' | 'AUTH_REQUIRED';

export interface LevelResult {
  testLevel: RequestLevel;
  status: ProbeStatus;
  httpStatus: number | null;
  contentType: string | null;
  validJson: boolean;
  hasCurrentLottery: boolean;
  hasCompSchedules: boolean;
  scheduleCount: number;
  hasTooltipList: boolean;
  tooltipCount: number;
  latencyMs: number;
  error: string | null;
  redirectedTo?: string;
  schemaKeys?: string[];
  schemaHash?: string;
  requiredKeysPresent?: string[];
  requiredKeysMissing?: string[];
  currentLotterySummary?: object;
  sampleRows?: object[];
  unknownTopLevelKeys?: string[];
}

export interface ProbeReport {
  minimumRequestLevel: MinimumRequestLevel;
  overallStatus: ProbeStatus;
  testResults: { A: LevelResult; B: LevelResult; C: LevelResult };
  schemaDiscovered: {
    compSchedulesKeys: string[];
    knownFields: string[];
    unknownFields: string[];
    rowCount: number;
  };
  currentLottery: object | null;
  latencySummaryMs: {
    A: number;
    B: number;
    C: number;
  };
  timestamp: string;
  fixturesSaved: string[];
  error: string | null;
}

// ── Payload ──────────────────────────────────────────────────────────────────

const PROBE_PAYLOADS: BetmanRequestPayload[] = [
  {
    gmId: 'G101',
    gmTs: 260096,
    gameYear: '',
    _sbmInfo: { _sbmInfo: { debugMode: 'false' } },
  },
  // Fallback: try with gmTs=0 to request current round
  {
    gmId: 'G101',
    gmTs: 0,
    gameYear: '',
    _sbmInfo: { _sbmInfo: { debugMode: 'false' } },
  },
];

// ── Auth detection ───────────────────────────────────────────────────────────

function isLoginRedirect(result: { redirectedTo?: string; body?: string | null }): boolean {
  if (result.redirectedTo) {
    const loc = result.redirectedTo.toLowerCase();
    if (loc.includes('login') || loc.includes('member') || loc.includes('auth')) return true;
  }
  if (result.body) {
    const b = result.body.toLowerCase();
    if (
      (b.includes('login') || b.includes('로그인')) &&
      b.includes('<html')
    ) {
      return true;
    }
  }
  return false;
}

// ── Core probe for one level ─────────────────────────────────────────────────

async function probeLevel(
  level: RequestLevel,
  payload: BetmanRequestPayload
): Promise<LevelResult> {
  const base: LevelResult = {
    testLevel: level,
    status: 'FAIL',
    httpStatus: null,
    contentType: null,
    validJson: false,
    hasCurrentLottery: false,
    hasCompSchedules: false,
    scheduleCount: 0,
    hasTooltipList: false,
    tooltipCount: 0,
    latencyMs: 0,
    error: null,
  };

  let raw;
  try {
    raw = await betmanFetch(payload, level);
  } catch (e) {
    return { ...base, status: 'ERROR', error: String(e) };
  }

  base.httpStatus = raw.httpStatus;
  base.contentType = raw.contentType;
  base.latencyMs = raw.latencyMs;

  // Auth redirect check
  if (isLoginRedirect(raw)) {
    return { ...base, status: 'AUTH_REQUIRED', redirectedTo: raw.redirectedTo };
  }

  if (raw.error) {
    return { ...base, status: 'ERROR', error: raw.error };
  }

  if (raw.httpStatus !== null && raw.httpStatus >= 400) {
    return { ...base, status: 'FAIL', error: `HTTP ${raw.httpStatus}` };
  }

  if (!raw.body) {
    return { ...base, status: 'FAIL', error: 'EMPTY_BODY' };
  }

  // Parse
  const parsed = parseBetmanResponse(raw.body);
  if (!parsed.success) {
    return { ...base, status: 'FAIL', error: parsed.error ?? 'PARSE_FAILED' };
  }

  base.validJson = true;
  base.hasCurrentLottery = !!parsed.currentLottery;
  base.hasCompSchedules = !!(parsed.schemaKeys && parsed.schemaKeys.length > 0);
  base.scheduleCount = parsed.scheduleRows?.length ?? 0;
  base.hasTooltipList = !!(parsed.tooltipList && parsed.tooltipList.length > 0);
  base.tooltipCount = parsed.tooltipList?.length ?? 0;
  base.unknownTopLevelKeys = parsed.unknownTopLevelKeys;

  if (parsed.schemaKeys) {
    base.schemaKeys = parsed.schemaKeys;
    const { present, missing } = checkRequiredKeys(parsed.schemaKeys);
    base.requiredKeysPresent = present;
    base.requiredKeysMissing = missing;
  }

  // Validate
  const validation = validateBetmanResponse(parsed.raw);
  if (validation.valid) {
    base.schemaHash = validation.schemaHash;
  }

  if (parsed.currentLottery) {
    base.currentLotterySummary = {
      gmId: parsed.currentLottery.gmId,
      gmTs: parsed.currentLottery.gmTs,
      gameYear: parsed.currentLottery.gameYear,
      lotteryName: parsed.currentLottery.lotteryName,
      lotteryStatus: parsed.currentLottery.lotteryStatus,
      saleStartDate: parsed.currentLottery.saleStartDate,
      saleEndDate: parsed.currentLottery.saleEndDate,
    };
  }

  if (parsed.scheduleRows && parsed.scheduleRows.length > 0) {
    base.sampleRows = parsed.scheduleRows.slice(0, 2);
  }

  // Determine PASS: need JSON + at least one of the expected sections
  const meaningful = base.hasCurrentLottery || base.hasCompSchedules || base.hasTooltipList;
  base.status = meaningful ? 'PASS' : 'FAIL';
  if (!meaningful) {
    base.error = 'RESPONSE_MISSING_EXPECTED_FIELDS';
  }

  return base;
}

// ── Fixture saving ────────────────────────────────────────────────────────────

function saveFixture(
  rawBody: string,
  gmId: string,
  gmTs: number | string,
  fixturesDir: string
): { rawPath: string; sanitizedPath: string } | null {
  try {
    fs.mkdirSync(fixturesDir, { recursive: true });

    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const hash = crypto.createHash('sha256').update(rawBody).digest('hex').substring(0, 8);
    const rawName = `betman_raw_${gmId}_${gmTs}_${ts}_${hash}.json`;
    const rawPath = path.join(fixturesDir, rawName);

    // Check for PII (basic heuristic: any field with 'user', 'session', 'token', 'cookie', 'id' in typical auth patterns)
    const lower = rawBody.toLowerCase();
    const piiIndicators = ['sessionid', 'accesstoken', 'refreshtoken', 'memberId', 'userId'];
    const hasPii = piiIndicators.some((p) => lower.includes(p.toLowerCase()));

    if (hasPii) {
      console.warn('[PROBE] PII detected in response — raw fixture NOT saved');
      return null;
    }

    fs.writeFileSync(rawPath, rawBody, 'utf-8');

    // Sanitized: replace odds values (numeric fields matching known odds keys) with 1.00
    let sanitized = rawBody;
    for (const key of ['winOdds', 'drawOdds', 'loseOdds', 'overOdds', 'underOdds']) {
      sanitized = sanitized.replace(
        new RegExp(`"${key}"\\s*:\\s*[\\d.]+`, 'g'),
        `"${key}": 0.00`
      );
    }

    const sanitizedName = `betman_sanitized_${gmId}_${gmTs}_${ts}_${hash}.json`;
    const sanitizedPath = path.join(fixturesDir, sanitizedName);
    fs.writeFileSync(sanitizedPath, sanitized, 'utf-8');

    return { rawPath, sanitizedPath };
  } catch (e) {
    console.error('[PROBE] Fixture save failed:', e);
    return null;
  }
}

// ── Main probe orchestrator ───────────────────────────────────────────────────

async function runProbe(): Promise<ProbeReport> {
  const timestamp = new Date().toISOString();
  const fixturesDir = path.resolve(__dirname, '..', '..', '..', '..', '..', 'fixtures');
  const fixturesSaved: string[] = [];

  const levels: RequestLevel[] = ['A', 'B', 'C'];
  const results: Partial<Record<RequestLevel, LevelResult>> = {};

  console.log('\n╔═══════════════════════════════════════════╗');
  console.log('║  A.PICK — Betman Connector Probe          ║');
  console.log('║  PHASE 1 / GATE 1                         ║');
  console.log('╚═══════════════════════════════════════════╝\n');

  for (const payload of PROBE_PAYLOADS) {
    console.log(`\n► Testing with gmId=${payload.gmId} gmTs=${payload.gmTs}\n`);

    for (const level of levels) {
      if (results[level]?.status === 'PASS') continue; // already passed

      console.log(`  [TEST ${level}] ${getTestDescription(level)}`);
      const result = await probeLevel(level, payload);
      results[level] = result;

      console.log(`    Status:      ${result.status}`);
      console.log(`    HTTP:        ${result.httpStatus ?? 'N/A'}`);
      console.log(`    Latency:     ${result.latencyMs}ms`);
      console.log(`    Valid JSON:  ${result.validJson}`);
      console.log(`    CurrentLottery: ${result.hasCurrentLottery}`);
      console.log(`    CompSchedules:  ${result.hasCompSchedules} (${result.scheduleCount} rows)`);
      console.log(`    TooltipList:    ${result.hasTooltipList} (${result.tooltipCount} items)`);
      if (result.schemaKeys) {
        console.log(`    Schema keys: [${result.schemaKeys.join(', ')}]`);
      }
      if (result.error) console.log(`    Error: ${result.error}`);
      if (result.redirectedTo) console.log(`    Redirected to: ${result.redirectedTo}`);
      if (result.currentLotterySummary) {
        console.log(`    CurrentLottery:`, JSON.stringify(result.currentLotterySummary, null, 2));
      }
      if (result.status === 'AUTH_REQUIRED') {
        console.log('\n  ⚠️  AUTH_REQUIRED detected. Stopping probe. Do not bypass.\n');
        break;
      }
    }

    // If any level passed, save fixture
    const firstPass = levels.find((l) => results[l]?.status === 'PASS');
    if (firstPass) {
      // Re-fetch to get raw body for fixture saving
      try {
        const raw = await betmanFetch(payload, firstPass);
        if (raw.body) {
          const saved = saveFixture(raw.body, payload.gmId, payload.gmTs, fixturesDir);
          if (saved) {
            fixturesSaved.push(saved.rawPath, saved.sanitizedPath);
            console.log(`\n  ✓ Fixture saved: ${saved.rawPath}`);
          }
        }
      } catch {}
      break; // Don't try next payload if first succeeded
    }
  }

  // Determine minimum passing level
  let minimumRequestLevel: MinimumRequestLevel = 'NONE';
  let overallStatus: ProbeStatus = 'FAIL';

  for (const l of levels) {
    const r = results[l];
    if (!r) continue;
    if (r.status === 'AUTH_REQUIRED') {
      minimumRequestLevel = 'AUTH_REQUIRED';
      overallStatus = 'AUTH_REQUIRED';
      break;
    }
    if (r.status === 'PASS') {
      minimumRequestLevel = l;
      overallStatus = 'PASS';
      break;
    }
  }

  // Schema summary
  const passResult = levels.map((l) => results[l]).find((r) => r?.status === 'PASS');
  const schemaKeys = passResult?.schemaKeys ?? [];
  const knownFields = passResult?.requiredKeysPresent ?? [];
  const unknownFields = (passResult?.schemaKeys ?? []).filter(
    (k) => !(passResult?.requiredKeysPresent ?? []).includes(k)
  );

  const report: ProbeReport = {
    minimumRequestLevel,
    overallStatus,
    testResults: {
      A: results['A'] ?? makeEmptyResult('A'),
      B: results['B'] ?? makeEmptyResult('B'),
      C: results['C'] ?? makeEmptyResult('C'),
    },
    schemaDiscovered: {
      compSchedulesKeys: schemaKeys,
      knownFields,
      unknownFields,
      rowCount: passResult?.scheduleCount ?? 0,
    },
    currentLottery: passResult?.currentLotterySummary ?? null,
    latencySummaryMs: {
      A: results['A']?.latencyMs ?? 0,
      B: results['B']?.latencyMs ?? 0,
      C: results['C']?.latencyMs ?? 0,
    },
    timestamp,
    fixturesSaved,
    error: null,
  };

  return report;
}

function makeEmptyResult(level: RequestLevel): LevelResult {
  return {
    testLevel: level,
    status: 'FAIL',
    httpStatus: null,
    contentType: null,
    validJson: false,
    hasCurrentLottery: false,
    hasCompSchedules: false,
    scheduleCount: 0,
    hasTooltipList: false,
    tooltipCount: 0,
    latencyMs: 0,
    error: 'NOT_TESTED',
  };
}

function getTestDescription(level: RequestLevel): string {
  switch (level) {
    case 'A': return 'POST + JSON only';
    case 'B': return 'POST + JSON + X-Requested-With: XMLHttpRequest';
    case 'C': return 'POST + JSON + X-Requested-With + Origin + Referer';
  }
}

// ── Entry point ───────────────────────────────────────────────────────────────

async function main() {
  let report: ProbeReport;
  try {
    report = await runProbe();
  } catch (e) {
    report = {
      minimumRequestLevel: 'NONE',
      overallStatus: 'ERROR' as ProbeStatus,
      testResults: {
        A: makeEmptyResult('A'),
        B: makeEmptyResult('B'),
        C: makeEmptyResult('C'),
      },
      schemaDiscovered: { compSchedulesKeys: [], knownFields: [], unknownFields: [], rowCount: 0 },
      currentLottery: null,
      latencySummaryMs: { A: 0, B: 0, C: 0 },
      timestamp: new Date().toISOString(),
      fixturesSaved: [],
      error: String(e),
    };
  }

  const reportsDir = path.resolve(__dirname, '..', '..', '..', '..', '..', 'reports');
  fs.mkdirSync(reportsDir, { recursive: true });

  const reportPath = path.join(reportsDir, 'BETMAN_CONNECTOR_REPORT.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8');

  console.log('\n══════════════════════════════════════════════');
  console.log('  PROBE COMPLETE');
  console.log('══════════════════════════════════════════════');
  console.log(JSON.stringify(report, null, 2));
  console.log(`\n  Report saved: ${reportPath}`);
}

main().catch(console.error);
