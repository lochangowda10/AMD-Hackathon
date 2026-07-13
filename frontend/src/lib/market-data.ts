/**
 * Real market-data layer.
 *
 * Pulls live quotes, 1-year OHLCV history and news from Yahoo Finance's
 * public endpoints (no API key required; works for NSE ".NS", BSE ".BO",
 * indices "^NSEI"/"^BSESN" and global symbols), then computes real technical
 * indicators server-side. Every analysis in the app is grounded in this data,
 * which is what makes each stock's result unique and correct.
 *
 * Built for production traffic:
 *  - per-process TTL cache (quotes 60s, news 10min, search 24h)
 *  - in-flight request coalescing (N concurrent users -> 1 upstream call)
 *  - 12s timeout + retry across two Yahoo hosts
 */

export interface Candle {
  time: number; // unix seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TechnicalIndicators {
  sma20: number | null;
  sma50: number | null;
  sma200: number | null;
  ema12: number | null;
  ema26: number | null;
  rsi14: number | null;
  macd: number | null;
  macdSignal: number | null;
  macdHist: number | null;
  bollUpper: number | null;
  bollMiddle: number | null;
  bollLower: number | null;
  atr14: number | null;
  stdDevPct20: number | null; // 20-day close volatility as % of price
}

export interface NewsItem {
  title: string;
  publisher: string;
  link: string;
  publishedAt: number | null;
}

export interface StockSnapshot {
  yahooSymbol: string;
  displaySymbol: string;
  name: string;
  exchange: string;
  currency: string;
  currencySymbol: string;
  isIndex: boolean;

  price: number;
  previousClose: number;
  change: number;
  changePercent: number;
  dayOpen: number | null;
  dayHigh: number | null;
  dayLow: number | null;
  volume: number | null;
  avgVolume20: number | null;
  volumeRatio: number | null; // today's volume vs 20-day average

  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  positionIn52wRange: number; // 0..100 (% of the 52w range)
  drawdownFrom52wHighPct: number;

  returns: {
    r1w: number | null;
    r1m: number | null;
    r3m: number | null;
    r6m: number | null;
    r1y: number | null;
  };

  indicators: TechnicalIndicators;
  support: number[]; // nearest below price, descending relevance
  resistance: number[]; // nearest above price
  news: NewsItem[];
  candleCount: number;
  asOf: number; // unix ms
}

// ---------------------------------------------------------------------------
// Fetch plumbing: cache + coalescing + failover
// ---------------------------------------------------------------------------

const YAHOO_HOSTS = ['https://query1.finance.yahoo.com', 'https://query2.finance.yahoo.com'];
const FETCH_TIMEOUT_MS = 12_000;

interface CacheEntry {
  expires: number;
  value: unknown;
}

const cache = new Map<string, CacheEntry>();
const inFlight = new Map<string, Promise<unknown>>();

function cacheGet<T>(key: string): T | undefined {
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return hit.value as T;
  if (hit) cache.delete(key);
  return undefined;
}

function cacheSet(key: string, value: unknown, ttlMs: number): void {
  // Bound memory: drop oldest entries once the cache grows past 2000 keys
  if (cache.size > 2000) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, { expires: Date.now() + ttlMs, value });
}

async function fetchYahooJson<T>(path: string, cacheKey: string, ttlMs: number): Promise<T> {
  const cached = cacheGet<T>(cacheKey);
  if (cached !== undefined) return cached;

  const pending = inFlight.get(cacheKey);
  if (pending) return pending as Promise<T>;

  const task = (async () => {
    let lastError: unknown = null;
    for (const host of YAHOO_HOSTS) {
      try {
        const res = await fetch(`${host}${path}`, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
            Accept: 'application/json',
          },
          signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
          cache: 'no-store',
        });
        if (!res.ok) {
          lastError = new Error(`Yahoo Finance responded ${res.status} for ${path}`);
          continue;
        }
        const data = (await res.json()) as T;
        cacheSet(cacheKey, data, ttlMs);
        return data;
      } catch (err) {
        lastError = err;
      }
    }
    throw lastError instanceof Error ? lastError : new Error('Market data fetch failed');
  })();

  inFlight.set(cacheKey, task);
  try {
    return await task;
  } finally {
    inFlight.delete(cacheKey);
  }
}

// ---------------------------------------------------------------------------
// Technical indicators (real math, computed from real candles)
// ---------------------------------------------------------------------------

function sma(values: number[], period: number): number | null {
  if (values.length < period) return null;
  const slice = values.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

function emaSeries(values: number[], period: number): number[] {
  if (values.length < period) return [];
  const k = 2 / (period + 1);
  const out: number[] = [];
  let prev = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
  out.push(prev);
  for (let i = period; i < values.length; i++) {
    prev = values[i] * k + prev * (1 - k);
    out.push(prev);
  }
  return out;
}

function rsi(closes: number[], period = 14): number | null {
  if (closes.length < period + 1) return null;
  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff > 0) avgGain += diff;
    else avgLoss -= diff;
  }
  avgGain /= period;
  avgLoss /= period;
  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    avgGain = (avgGain * (period - 1) + Math.max(diff, 0)) / period;
    avgLoss = (avgLoss * (period - 1) + Math.max(-diff, 0)) / period;
  }
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

function atr(candles: Candle[], period = 14): number | null {
  if (candles.length < period + 1) return null;
  const trs: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    const c = candles[i];
    const prevClose = candles[i - 1].close;
    trs.push(Math.max(c.high - c.low, Math.abs(c.high - prevClose), Math.abs(c.low - prevClose)));
  }
  let value = trs.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < trs.length; i++) {
    value = (value * (period - 1) + trs[i]) / period;
  }
  return value;
}

function computeIndicators(candles: Candle[]): TechnicalIndicators {
  const closes = candles.map(c => c.close);
  const price = closes[closes.length - 1];

  const ema12Arr = emaSeries(closes, 12);
  const ema26Arr = emaSeries(closes, 26);

  let macd: number | null = null;
  let macdSignal: number | null = null;
  let macdHist: number | null = null;
  if (ema12Arr.length && ema26Arr.length) {
    // Align the two EMA series on their tails to build the MACD line
    const len = Math.min(ema12Arr.length, ema26Arr.length);
    const macdLine: number[] = [];
    for (let i = 0; i < len; i++) {
      macdLine.push(ema12Arr[ema12Arr.length - len + i] - ema26Arr[ema26Arr.length - len + i]);
    }
    macd = macdLine[macdLine.length - 1];
    const signalArr = emaSeries(macdLine, 9);
    if (signalArr.length) {
      macdSignal = signalArr[signalArr.length - 1];
      macdHist = macd - macdSignal;
    }
  }

  const sma20v = sma(closes, 20);
  let bollUpper: number | null = null;
  let bollLower: number | null = null;
  let stdDevPct20: number | null = null;
  if (sma20v !== null) {
    const last20 = closes.slice(-20);
    const variance = last20.reduce((s, v) => s + (v - sma20v) ** 2, 0) / 20;
    const sd = Math.sqrt(variance);
    bollUpper = sma20v + 2 * sd;
    bollLower = sma20v - 2 * sd;
    stdDevPct20 = price > 0 ? (sd / price) * 100 : null;
  }

  return {
    sma20: sma20v,
    sma50: sma(closes, 50),
    sma200: sma(closes, 200),
    ema12: ema12Arr.length ? ema12Arr[ema12Arr.length - 1] : null,
    ema26: ema26Arr.length ? ema26Arr[ema26Arr.length - 1] : null,
    rsi14: rsi(closes, 14),
    macd,
    macdSignal,
    macdHist,
    bollUpper,
    bollMiddle: sma20v,
    bollLower,
    atr14: atr(candles, 14),
    stdDevPct20,
  };
}

/**
 * Swing-point support/resistance: local extremes over the last ~6 months,
 * clustered within 1.5% and split around the current price.
 */
function findLevels(candles: Candle[], price: number): { support: number[]; resistance: number[] } {
  const window = 3;
  const recent = candles.slice(-130);
  const pivots: number[] = [];

  for (let i = window; i < recent.length - window; i++) {
    const highs = recent.slice(i - window, i + window + 1).map(c => c.high);
    const lows = recent.slice(i - window, i + window + 1).map(c => c.low);
    if (recent[i].high === Math.max(...highs)) pivots.push(recent[i].high);
    if (recent[i].low === Math.min(...lows)) pivots.push(recent[i].low);
  }

  // Cluster pivots that sit within 1.5% of each other; weight by touch count
  const clusters: { level: number; touches: number }[] = [];
  for (const p of pivots.sort((a, b) => a - b)) {
    const hit = clusters.find(c => Math.abs(c.level - p) / c.level < 0.015);
    if (hit) {
      hit.level = (hit.level * hit.touches + p) / (hit.touches + 1);
      hit.touches++;
    } else {
      clusters.push({ level: p, touches: 1 });
    }
  }

  const strong = clusters.sort((a, b) => b.touches - a.touches);
  const support = strong
    .filter(c => c.level < price * 0.998)
    .sort((a, b) => b.level - a.level)
    .slice(0, 3)
    .map(c => round2(c.level));
  const resistance = strong
    .filter(c => c.level > price * 1.002)
    .sort((a, b) => a.level - b.level)
    .slice(0, 3)
    .map(c => round2(c.level));

  return { support, resistance };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function pctReturn(closes: number[], daysAgo: number): number | null {
  if (closes.length <= daysAgo) return null;
  const past = closes[closes.length - 1 - daysAgo];
  const now = closes[closes.length - 1];
  if (!past) return null;
  return round2(((now - past) / past) * 100);
}

export function currencySymbolFor(currency: string): string {
  const map: Record<string, string> = { INR: '₹', USD: '$', EUR: '€', GBP: '£', JPY: '¥' };
  return map[currency] || `${currency} `;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

interface YahooChartResponse {
  chart?: {
    result?: Array<{
      meta?: {
        currency?: string;
        symbol?: string;
        exchangeName?: string;
        fullExchangeName?: string;
        instrumentType?: string;
        regularMarketPrice?: number;
        chartPreviousClose?: number;
        previousClose?: number;
        regularMarketDayHigh?: number;
        regularMarketDayLow?: number;
        regularMarketVolume?: number;
        fiftyTwoWeekHigh?: number;
        fiftyTwoWeekLow?: number;
        longName?: string;
        shortName?: string;
      };
      timestamp?: number[];
      indicators?: {
        quote?: Array<{
          open?: (number | null)[];
          high?: (number | null)[];
          low?: (number | null)[];
          close?: (number | null)[];
          volume?: (number | null)[];
        }>;
      };
    }>;
    error?: { code?: string; description?: string } | null;
  };
}

interface YahooSearchResponse {
  quotes?: Array<{
    symbol?: string;
    shortname?: string;
    longname?: string;
    exchange?: string;
    exchDisp?: string;
    quoteType?: string;
    score?: number;
  }>;
  news?: Array<{
    title?: string;
    publisher?: string;
    link?: string;
    providerPublishTime?: number;
  }>;
}

export interface SearchQuoteResult {
  symbol: string;
  name: string;
  exchange: string;
  quoteType: string;
}

/** Search Yahoo Finance for symbols matching a free-text query. */
export async function searchSymbols(query: string): Promise<SearchQuoteResult[]> {
  const q = query.trim();
  if (!q) return [];
  const data = await fetchYahooJson<YahooSearchResponse>(
    `/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=8&newsCount=0`,
    `search:${q.toLowerCase()}`,
    24 * 60 * 60 * 1000
  );
  return (data.quotes || [])
    .filter(x => x.symbol && (x.quoteType === 'EQUITY' || x.quoteType === 'INDEX' || x.quoteType === 'ETF'))
    .map(x => ({
      symbol: x.symbol as string,
      name: x.longname || x.shortname || (x.symbol as string),
      exchange: x.exchDisp || x.exchange || '',
      quoteType: x.quoteType || 'EQUITY',
    }));
}

/** Recent news headlines for a stock (used to ground the news agent). */
export async function getNews(searchTerm: string): Promise<NewsItem[]> {
  try {
    const data = await fetchYahooJson<YahooSearchResponse>(
      `/v1/finance/search?q=${encodeURIComponent(searchTerm)}&quotesCount=0&newsCount=8`,
      `news:${searchTerm.toLowerCase()}`,
      10 * 60 * 1000
    );
    return (data.news || [])
      .filter(n => n.title)
      .slice(0, 6)
      .map(n => ({
        title: n.title as string,
        publisher: n.publisher || 'Unknown',
        link: n.link || '',
        publishedAt: n.providerPublishTime ?? null,
      }));
  } catch {
    return []; // news is enrichment - never fail an analysis over it
  }
}

/**
 * Full data snapshot for one symbol: live quote, 1y candles, indicators,
 * support/resistance and (optionally) news. Cached for 60 seconds.
 */
export async function getStockSnapshot(
  yahooSymbol: string,
  options: { includeNews?: boolean; newsQuery?: string } = {}
): Promise<StockSnapshot> {
  const key = `snapshot:${yahooSymbol}:${options.includeNews ? 1 : 0}`;
  const cached = cacheGet<StockSnapshot>(key);
  if (cached) return cached;

  const data = await fetchYahooJson<YahooChartResponse>(
    `/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?range=1y&interval=1d`,
    `chart:${yahooSymbol}`,
    60 * 1000
  );

  const result = data.chart?.result?.[0];
  if (!result?.meta || !result.timestamp?.length) {
    const desc = data.chart?.error?.description || `No market data found for "${yahooSymbol}"`;
    throw new Error(desc);
  }

  const meta = result.meta;
  const quote = result.indicators?.quote?.[0] || {};
  const candles: Candle[] = [];
  for (let i = 0; i < result.timestamp.length; i++) {
    const o = quote.open?.[i];
    const h = quote.high?.[i];
    const l = quote.low?.[i];
    const c = quote.close?.[i];
    if (o == null || h == null || l == null || c == null) continue;
    candles.push({ time: result.timestamp[i], open: o, high: h, low: l, close: c, volume: quote.volume?.[i] ?? 0 });
  }
  if (candles.length < 10) {
    throw new Error(`Not enough trading history for "${yahooSymbol}" to analyze`);
  }

  const closes = candles.map(c => c.close);
  const price = meta.regularMarketPrice ?? closes[closes.length - 1];
  const previousClose =
    meta.chartPreviousClose ?? meta.previousClose ?? (closes.length > 1 ? closes[closes.length - 2] : price);

  const volumes = candles.map(c => c.volume).filter(v => v > 0);
  const avgVolume20 = volumes.length >= 20 ? volumes.slice(-20).reduce((a, b) => a + b, 0) / 20 : null;
  const lastVolume = meta.regularMarketVolume ?? (volumes.length ? volumes[volumes.length - 1] : null);

  const high52 = meta.fiftyTwoWeekHigh ?? Math.max(...candles.map(c => c.high));
  const low52 = meta.fiftyTwoWeekLow ?? Math.min(...candles.map(c => c.low));
  const range = high52 - low52;

  const indicators = computeIndicators(candles);
  const { support, resistance } = findLevels(candles, price);

  const currency = meta.currency || 'INR';
  const isIndex = (meta.instrumentType || '').toUpperCase() === 'INDEX' || yahooSymbol.startsWith('^');
  const name = meta.longName || meta.shortName || yahooSymbol;

  const snapshot: StockSnapshot = {
    yahooSymbol,
    displaySymbol: yahooSymbol.replace(/\.(NS|BO)$/, '').replace(/^\^/, ''),
    name,
    exchange: meta.fullExchangeName || meta.exchangeName || '',
    currency,
    currencySymbol: currencySymbolFor(currency),
    isIndex,
    price: round2(price),
    previousClose: round2(previousClose),
    change: round2(price - previousClose),
    changePercent: previousClose ? round2(((price - previousClose) / previousClose) * 100) : 0,
    dayOpen: quote.open?.[quote.open.length - 1] ?? null,
    dayHigh: meta.regularMarketDayHigh ?? null,
    dayLow: meta.regularMarketDayLow ?? null,
    volume: lastVolume,
    avgVolume20: avgVolume20 ? Math.round(avgVolume20) : null,
    volumeRatio: avgVolume20 && lastVolume ? round2(lastVolume / avgVolume20) : null,
    fiftyTwoWeekHigh: round2(high52),
    fiftyTwoWeekLow: round2(low52),
    positionIn52wRange: range > 0 ? Math.round(((price - low52) / range) * 100) : 50,
    drawdownFrom52wHighPct: high52 > 0 ? round2(((high52 - price) / high52) * 100) : 0,
    returns: {
      r1w: pctReturn(closes, 5),
      r1m: pctReturn(closes, 21),
      r3m: pctReturn(closes, 63),
      r6m: pctReturn(closes, 126),
      r1y: pctReturn(closes, Math.min(249, closes.length - 1)),
    },
    indicators,
    support,
    resistance,
    news: [],
    candleCount: candles.length,
    asOf: Date.now(),
  };

  if (options.includeNews) {
    snapshot.news = await getNews(options.newsQuery || `${snapshot.displaySymbol} ${name}`.slice(0, 60));
  }

  cacheSet(key, snapshot, 60 * 1000);
  return snapshot;
}

/** NIFTY 50 snapshot used for macro / relative-strength context (2min cache). */
export async function getBenchmarkSnapshot(currency: string): Promise<StockSnapshot | null> {
  const symbol = currency === 'INR' ? '^NSEI' : '^GSPC';
  try {
    return await getStockSnapshot(symbol);
  } catch {
    return null; // macro context is enrichment - analysis proceeds without it
  }
}
