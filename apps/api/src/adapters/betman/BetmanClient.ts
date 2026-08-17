/**
 * BetmanClient
 * Handles raw HTTP communication with the Betman provider.
 * UI code must NEVER import this directly.
 *
 * Architecture:
 *   BetmanClient → RAW response → BetmanParser → BetmanNormalizer → A.PICK models
 */

import * as https from 'https';
import * as http from 'http';

export const BETMAN_BASE_URL = 'https://www.betman.co.kr';
export const BETMAN_MARKET_ENDPOINT = '/buyPsblGame/gameInfoInq.do';

export interface BetmanRequestPayload {
  gmId: string;
  gmTs: number | string;
  gameYear: string;
  _sbmInfo: {
    _sbmInfo: {
      debugMode: string;
    };
  };
}

export type RequestLevel = 'A' | 'B' | 'C';

function buildHeaders(level: RequestLevel): Record<string, string> {
  const base: Record<string, string> = {
    'Content-Type': 'application/json; charset=UTF-8',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  };

  if (level === 'B' || level === 'C') {
    base['X-Requested-With'] = 'XMLHttpRequest';
  }

  if (level === 'C') {
    base['Origin'] = 'https://www.betman.co.kr';
    base['Referer'] = 'https://www.betman.co.kr/';
  }

  return base;
}

export interface RawFetchResult {
  httpStatus: number | null;
  contentType: string | null;
  body: string | null;
  latencyMs: number;
  error: string | null;
  redirectedTo?: string;
}

/**
 * Performs a raw HTTP POST to Betman.
 * Does NOT use session cookies.
 * Does NOT bypass authentication.
 * If the server redirects to a login page, we detect and report AUTH_REQUIRED.
 */
export async function betmanFetch(
  payload: BetmanRequestPayload,
  level: RequestLevel
): Promise<RawFetchResult> {
  const url = `${BETMAN_BASE_URL}${BETMAN_MARKET_ENDPOINT}`;
  const headers = buildHeaders(level);
  const body = JSON.stringify(payload);
  const start = Date.now();

  return new Promise((resolve) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const mod = isHttps ? https : http;

    const options: https.RequestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: 'POST',
      headers: {
        ...headers,
        'Content-Length': Buffer.byteLength(body),
      },
      timeout: 15000,
    };

    const req = mod.request(options, (res) => {
      const latencyMs = Date.now() - start;
      const httpStatus = res.statusCode ?? null;
      const contentType = res.headers['content-type'] ?? null;

      // Detect redirect to login
      if (
        httpStatus !== null &&
        httpStatus >= 300 &&
        httpStatus < 400 &&
        res.headers.location
      ) {
        resolve({
          httpStatus,
          contentType,
          body: null,
          latencyMs,
          error: null,
          redirectedTo: res.headers.location,
        });
        return;
      }

      const chunks: Buffer[] = [];
      res.on('data', (chunk: Buffer) => chunks.push(chunk));
      res.on('end', () => {
        const rawBody = Buffer.concat(chunks).toString('utf-8');
        resolve({
          httpStatus,
          contentType: contentType as string | null,
          body: rawBody,
          latencyMs,
          error: null,
        });
      });
      res.on('error', (err: Error) => {
        resolve({
          httpStatus,
          contentType,
          body: null,
          latencyMs: Date.now() - start,
          error: err.message,
        });
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        httpStatus: null,
        contentType: null,
        body: null,
        latencyMs: Date.now() - start,
        error: 'REQUEST_TIMEOUT',
      });
    });

    req.on('error', (err: Error) => {
      resolve({
        httpStatus: null,
        contentType: null,
        body: null,
        latencyMs: Date.now() - start,
        error: err.message,
      });
    });

    req.write(body);
    req.end();
  });
}
