/**
 * Deterministic multi-agent analysis engine.
 *
 * Every agent scores the stock from its REAL market data (live price, RSI,
 * MACD, moving averages, volume, news headlines, benchmark comparison...),
 * so two different stocks can never produce the same analysis. This engine
 * always runs; when an LLM key is configured it only enriches the narrative
 * on top of these grounded numbers.
 *
 * Score convention: -100 (strong sell) .. +100 (strong buy).
 */

import type { StockSnapshot, NewsItem } from '@/lib/market-data';

export type AgentDecision = 'BUY' | 'SELL' | 'WAIT';
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export interface AgentResult {
  agent: string;
  decision: AgentDecision;
  confidence: number;
  reasoning: string;
  keyFactors: string[];
}

export interface TradePlan {
  entry: number;
  stopLoss: number;
  target1: number;
  target2: number;
  rewardToRisk: number;
}

export interface EngineOutput {
  finalDecision: AgentDecision;
  overallConfidence: number;
  agentResults: AgentResult[];
  fusionReasoning: string;
  riskLevel: RiskLevel;
  actionableAdvice: string[];
  explanation: { score: number; reasons: string[]; risks: string[] };
  tradePlan: TradePlan | null;
}

// ---------------------------------------------------------------------------

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function decisionFromScore(score: number, buyAt = 15, sellAt = -15): AgentDecision {
  if (score >= buyAt) return 'BUY';
  if (score <= sellAt) return 'SELL';
  return 'WAIT';
}

function confidenceFromScore(score: number): number {
  return Math.round(clamp(55 + Math.abs(score) * 0.4, 52, 93));
}

function fmt(s: StockSnapshot, n: number | null | undefined, digits = 2): string {
  if (n == null) return 'n/a';
  return `${s.currencySymbol}${n.toLocaleString('en-IN', { maximumFractionDigits: digits, minimumFractionDigits: digits })}`;
}

function pct(n: number | null | undefined): string {
  if (n == null) return 'n/a';
  return `${n > 0 ? '+' : ''}${n.toFixed(1)}%`;
}

// ---------------------------------------------------------------------------
// Individual agents
// ---------------------------------------------------------------------------

function technicalAgent(s: StockSnapshot): AgentResult {
  const ind = s.indicators;
  let score = 0;
  const factors: string[] = [];
  const parts: string[] = [];

  if (ind.rsi14 != null) {
    const r = ind.rsi14;
    if (r > 75) { score -= 18; parts.push(`RSI(14) at ${r.toFixed(1)} is heavily overbought`); factors.push(`RSI ${r.toFixed(0)} overbought`); }
    else if (r > 65) { score -= 6; parts.push(`RSI(14) at ${r.toFixed(1)} is approaching overbought territory`); factors.push(`RSI ${r.toFixed(0)} elevated`); }
    else if (r >= 50) { score += 12; parts.push(`RSI(14) at ${r.toFixed(1)} shows healthy bullish momentum`); factors.push(`RSI ${r.toFixed(0)} bullish`); }
    else if (r >= 40) { score -= 4; parts.push(`RSI(14) at ${r.toFixed(1)} is mildly weak`); factors.push(`RSI ${r.toFixed(0)} soft`); }
    else if (r >= 30) { score -= 12; parts.push(`RSI(14) at ${r.toFixed(1)} shows bearish momentum`); factors.push(`RSI ${r.toFixed(0)} weak`); }
    else { score += 8; parts.push(`RSI(14) at ${r.toFixed(1)} is oversold — watch for a mean-reversion bounce`); factors.push(`RSI ${r.toFixed(0)} oversold`); }
  }

  if (ind.macd != null && ind.macdSignal != null && ind.macdHist != null) {
    if (ind.macdHist > 0) { score += 14; parts.push(`MACD (${ind.macd.toFixed(2)}) is above its signal line — bullish crossover in force`); factors.push('MACD bullish'); }
    else { score -= 14; parts.push(`MACD (${ind.macd.toFixed(2)}) is below its signal line — bearish pressure`); factors.push('MACD bearish'); }
  }

  const above: string[] = [];
  const below: string[] = [];
  if (ind.sma20 != null) (s.price > ind.sma20 ? above : below).push('20-DMA');
  if (ind.sma50 != null) (s.price > ind.sma50 ? above : below).push('50-DMA');
  if (ind.sma200 != null) (s.price > ind.sma200 ? above : below).push('200-DMA');
  score += above.length * 8 - below.length * 8;
  if (above.length) parts.push(`price trades above the ${above.join(', ')}`);
  if (below.length) parts.push(`price is below the ${below.join(', ')}`);
  if (above.length >= 2) factors.push(`Above ${above.join('/')}`);
  if (below.length >= 2) factors.push(`Below ${below.join('/')}`);

  if (ind.sma50 != null && ind.sma200 != null) {
    if (ind.sma50 > ind.sma200) { score += 8; parts.push('the 50-DMA rides above the 200-DMA (golden alignment)'); }
    else { score -= 8; parts.push('the 50-DMA sits below the 200-DMA (death-cross structure)'); }
  }

  if (ind.bollUpper != null && ind.bollLower != null) {
    if (s.price > ind.bollUpper) { score -= 6; parts.push(`price has stretched above the upper Bollinger band (${fmt(s, ind.bollUpper)})`); }
    else if (s.price < ind.bollLower) { score += 6; parts.push(`price is pinned under the lower Bollinger band (${fmt(s, ind.bollLower)})`); }
  }

  score = clamp(score, -100, 100);
  return {
    agent: 'technical',
    decision: decisionFromScore(score),
    confidence: confidenceFromScore(score),
    reasoning: `At ${fmt(s, s.price)}, ${parts.join('; ')}.`,
    keyFactors: factors.slice(0, 4),
  };
}

function marketScannerAgent(s: StockSnapshot, benchmark: StockSnapshot | null): AgentResult {
  let score = 0;
  const factors: string[] = [];
  const parts: string[] = [];

  const r1m = s.returns.r1m;
  const b1m = benchmark?.returns.r1m ?? null;
  if (r1m != null && b1m != null) {
    const rel = r1m - b1m;
    if (rel > 3) { score += 18; parts.push(`outperforming ${benchmark!.name} by ${rel.toFixed(1)} pts over 1 month (${pct(r1m)} vs ${pct(b1m)})`); factors.push('Strong relative strength'); }
    else if (rel > 0) { score += 8; parts.push(`slightly ahead of ${benchmark!.name} over 1 month (${pct(r1m)} vs ${pct(b1m)})`); factors.push('Positive relative strength'); }
    else if (rel > -3) { score -= 8; parts.push(`lagging ${benchmark!.name} over 1 month (${pct(r1m)} vs ${pct(b1m)})`); factors.push('Mild underperformance'); }
    else { score -= 18; parts.push(`sharply underperforming ${benchmark!.name} (${pct(r1m)} vs ${pct(b1m)})`); factors.push('Weak vs index'); }
  } else if (r1m != null) {
    score += clamp(r1m * 1.5, -15, 15);
    parts.push(`1-month move of ${pct(r1m)}`);
  }

  if (s.returns.r3m != null) {
    score += clamp(s.returns.r3m, -12, 12) * 0.8;
    parts.push(`3-month trend ${pct(s.returns.r3m)}`);
  }

  if (s.volumeRatio != null && s.returns.r1w != null) {
    if (s.volumeRatio >= 1.5 && s.returns.r1w > 0) { score += 12; parts.push(`volume running ${s.volumeRatio.toFixed(1)}× its 20-day average on an up week — signs of accumulation`); factors.push('Accumulation volume'); }
    else if (s.volumeRatio >= 1.5 && s.returns.r1w < 0) { score -= 12; parts.push(`volume ${s.volumeRatio.toFixed(1)}× average on a down week — distribution risk`); factors.push('Distribution volume'); }
    else if (s.volumeRatio < 0.6) { parts.push(`volume is thin at ${s.volumeRatio.toFixed(1)}× average`); }
  }

  if (s.positionIn52wRange >= 85) { score += 6; parts.push(`trading in the top of its 52-week range (${s.positionIn52wRange}%)`); factors.push('Near 52w high'); }
  else if (s.positionIn52wRange <= 15) { score -= 6; parts.push(`sitting near 52-week lows (${s.positionIn52wRange}% of range)`); factors.push('Near 52w low'); }

  score = clamp(score, -100, 100);
  return {
    agent: 'marketScanner',
    decision: decisionFromScore(score),
    confidence: confidenceFromScore(score),
    reasoning: `${s.name} is ${parts.join('; ')}.`,
    keyFactors: factors.slice(0, 4),
  };
}

const POSITIVE_NEWS = /\b(beat|beats|surge|surges|soar|soars|jump|jumps|rally|rallies|record|wins?|order|upgrade[ds]?|buyback|bonus|dividend|profit|growth|expands?|acquisition|strong|bullish|outperform|raises?|approval|launch(es)?)\b/i;
const NEGATIVE_NEWS = /\b(miss|misses|fall|falls|drop|drops|plunge|plunges|crash|slump|probe|fraud|penalty|fine[ds]?|downgrade[ds]?|loss|losses|weak|bearish|underperform|cuts?|recall|lawsuit|default|resign(s|ation)?|scam|debt)\b/i;

function newsAgent(s: StockSnapshot): AgentResult {
  const news = s.news;
  if (!news.length) {
    return {
      agent: 'newsIntelligence',
      decision: 'WAIT',
      confidence: 55,
      reasoning: `No major recent headlines found for ${s.name}; news flow is quiet, so price action and technicals should drive the decision.`,
      keyFactors: ['Quiet news cycle'],
    };
  }

  let pos = 0;
  let neg = 0;
  for (const n of news) {
    if (POSITIVE_NEWS.test(n.title)) pos++;
    if (NEGATIVE_NEWS.test(n.title)) neg++;
  }
  const score = clamp((pos - neg) * 18, -60, 60);
  const tone = pos > neg ? 'positive' : neg > pos ? 'negative' : 'mixed';
  const top = news.slice(0, 3).map(n => `"${n.title}" (${n.publisher})`).join('; ');

  return {
    agent: 'newsIntelligence',
    decision: decisionFromScore(score, 18, -18),
    confidence: confidenceFromScore(score * 0.8),
    reasoning: `Scanned ${news.length} recent headlines for ${s.name}: sentiment reads ${tone} (${pos} positive / ${neg} negative signals). Latest: ${top}.`,
    keyFactors: [`${tone[0].toUpperCase()}${tone.slice(1)} news tone`, ...news.slice(0, 2).map(n => n.title.slice(0, 60))],
  };
}

function macroAgent(s: StockSnapshot, benchmark: StockSnapshot | null): AgentResult {
  if (!benchmark) {
    return {
      agent: 'macro',
      decision: 'WAIT',
      confidence: 55,
      reasoning: 'Benchmark index data was unavailable, so the macro backdrop could not be assessed this run; treat the market regime as neutral.',
      keyFactors: ['Index data unavailable'],
    };
  }

  let score = 0;
  const parts: string[] = [];
  const factors: string[] = [];
  const bi = benchmark.indicators;

  if (bi.sma50 != null) {
    if (benchmark.price > bi.sma50) { score += 15; parts.push(`${benchmark.name} holds above its 50-DMA — the broad trend is supportive`); factors.push('Index above 50-DMA'); }
    else { score -= 15; parts.push(`${benchmark.name} is below its 50-DMA — the broad market is under pressure`); factors.push('Index below 50-DMA'); }
  }
  if (bi.sma200 != null) {
    if (benchmark.price > bi.sma200) { score += 10; parts.push('and above the 200-DMA (long-term uptrend intact)'); }
    else { score -= 10; parts.push('and below the 200-DMA (long-term trend broken)'); }
  }
  if (benchmark.returns.r1m != null) {
    score += clamp(benchmark.returns.r1m * 2, -12, 12);
    parts.push(`index 1-month return ${pct(benchmark.returns.r1m)}`);
  }
  if (bi.rsi14 != null && bi.rsi14 > 72) { score -= 8; parts.push(`index RSI ${bi.rsi14.toFixed(0)} is frothy`); factors.push('Index overbought'); }

  score = clamp(score, -100, 100);
  return {
    agent: 'macro',
    decision: decisionFromScore(score),
    confidence: confidenceFromScore(score * 0.9),
    reasoning: `Market regime check: ${parts.join('; ')}. ${benchmark.name} last at ${benchmark.price.toLocaleString('en-IN')} (${pct(benchmark.changePercent)} today).`,
    keyFactors: factors.length ? factors : [`Index ${pct(benchmark.returns.r1m)} over 1M`],
  };
}

function sentimentAgent(s: StockSnapshot): AgentResult {
  let score = 0;
  const parts: string[] = [];
  const factors: string[] = [];

  if (s.returns.r1w != null) {
    score += clamp(s.returns.r1w * 3, -20, 20);
    parts.push(`1-week price action ${pct(s.returns.r1w)}`);
  }
  if (s.changePercent) {
    score += clamp(s.changePercent * 3, -10, 10);
    parts.push(`today's session ${pct(s.changePercent)}`);
  }
  if (s.volumeRatio != null) {
    if (s.volumeRatio > 1.3) { score += s.returns.r1w != null && s.returns.r1w >= 0 ? 10 : -10; parts.push(`participation elevated at ${s.volumeRatio.toFixed(1)}× normal volume`); factors.push('High participation'); }
    else if (s.volumeRatio < 0.7) { parts.push(`participation muted (${s.volumeRatio.toFixed(1)}× normal volume)`); factors.push('Low participation'); }
  }
  if (s.positionIn52wRange >= 80) { score += 8; parts.push(`crowd interest is high near 52-week highs`); factors.push('Momentum crowd'); }
  else if (s.positionIn52wRange <= 20) { score -= 8; parts.push(`sentiment is depressed near 52-week lows`); factors.push('Depressed sentiment'); }

  score = clamp(score, -100, 100);
  return {
    agent: 'sentiment',
    decision: decisionFromScore(score),
    confidence: confidenceFromScore(score * 0.85),
    reasoning: `Reading market mood for ${s.displaySymbol} from price/volume behaviour: ${parts.join('; ')}.`,
    keyFactors: factors.length ? factors : ['Price-action based read'],
  };
}

function riskAgent(s: StockSnapshot): AgentResult {
  const ind = s.indicators;
  const atrPct = ind.atr14 != null && s.price > 0 ? (ind.atr14 / s.price) * 100 : null;
  let score = 0;
  const parts: string[] = [];
  const factors: string[] = [];

  if (atrPct != null) {
    if (atrPct < 1.6) { score += 15; parts.push(`daily ATR is ${atrPct.toFixed(1)}% of price — volatility is contained`); factors.push('Low volatility'); }
    else if (atrPct < 3) { parts.push(`daily ATR of ${atrPct.toFixed(1)}% is moderate`); factors.push('Moderate volatility'); }
    else { score -= 20; parts.push(`daily ATR of ${atrPct.toFixed(1)}% means wide daily swings — size positions down`); factors.push('High volatility'); }
  }
  if (s.drawdownFrom52wHighPct > 30) { score -= 12; parts.push(`the stock is ${s.drawdownFrom52wHighPct.toFixed(0)}% off its 52-week high — falling-knife risk`); factors.push(`${s.drawdownFrom52wHighPct.toFixed(0)}% below 52w high`); }
  else if (s.drawdownFrom52wHighPct < 8) { parts.push(`only ${s.drawdownFrom52wHighPct.toFixed(0)}% below its 52-week high`); }
  if (s.support.length) { score += 6; parts.push(`nearest support at ${fmt(s, s.support[0])} gives a clean invalidation level`); factors.push(`Support ${fmt(s, s.support[0])}`); }
  else { score -= 6; parts.push('no well-tested support nearby, stop placement is harder'); }
  if (ind.stdDevPct20 != null && ind.stdDevPct20 > 5) { score -= 8; parts.push(`20-day dispersion of ${ind.stdDevPct20.toFixed(1)}% is elevated`); }

  score = clamp(score, -100, 100);
  return {
    agent: 'risk',
    decision: score <= -18 ? 'WAIT' : decisionFromScore(score, 20, -35),
    confidence: confidenceFromScore(score),
    reasoning: `Risk audit for ${s.displaySymbol}: ${parts.join('; ')}.`,
    keyFactors: factors.slice(0, 4),
  };
}

function portfolioAgent(s: StockSnapshot, techScoreHint: number): AgentResult {
  const ind = s.indicators;
  const atrPct = ind.atr14 != null && s.price > 0 ? (ind.atr14 / s.price) * 100 : 2.5;
  const suggestedAlloc = atrPct > 3 ? 3 : atrPct > 2 ? 5 : 8;
  const parts = [
    `for a diversified swing portfolio, cap ${s.displaySymbol} at roughly ${suggestedAlloc}% of capital given its ${atrPct.toFixed(1)}% daily range`,
    `risking 1–2% of capital per trade keeps a losing streak survivable`,
  ];
  if (s.isIndex) parts.push('as an index, it can also anchor the portfolio via ETFs rather than direct positions');

  const score = clamp(techScoreHint * 0.4 + (atrPct < 2.5 ? 10 : -5), -100, 100);
  return {
    agent: 'portfolio',
    decision: decisionFromScore(score, 18, -18),
    confidence: confidenceFromScore(score * 0.8),
    reasoning: `Portfolio fit: ${parts.join('; ')}.`,
    keyFactors: [`~${suggestedAlloc}% max allocation`, '1–2% capital risk per trade'],
  };
}

function buildTradePlan(s: StockSnapshot): TradePlan | null {
  const atr = s.indicators.atr14;
  if (atr == null || s.price <= 0) return null;
  const entry = s.price;
  const supportStop = s.support.length ? s.support[0] * 0.995 : null;
  const atrStop = entry - 1.5 * atr;
  const stopLoss = supportStop != null ? Math.max(Math.min(supportStop, entry * 0.99), atrStop) : atrStop;
  const risk = entry - stopLoss;
  if (risk <= 0) return null;
  const target1 = s.resistance.length ? s.resistance[0] : entry + 2 * risk;
  const target2 = s.resistance.length > 1 ? s.resistance[1] : entry + 3 * risk;
  const round = (n: number) => Math.round(n * 100) / 100;
  return {
    entry: round(entry),
    stopLoss: round(stopLoss),
    target1: round(Math.max(target1, entry + risk)),
    target2: round(Math.max(target2, entry + 2 * risk)),
    rewardToRisk: round((Math.max(target1, entry + risk) - entry) / risk),
  };
}

function tradePlannerAgent(s: StockSnapshot, plan: TradePlan | null, techScoreHint: number): AgentResult {
  if (!plan) {
    return {
      agent: 'tradePlanner',
      decision: 'WAIT',
      confidence: 55,
      reasoning: `Not enough price history to compute a reliable entry/stop structure for ${s.displaySymbol}; wait for more data before committing capital.`,
      keyFactors: ['Insufficient history'],
    };
  }
  const goodRR = plan.rewardToRisk >= 1.8;
  const score = clamp(techScoreHint * 0.5 + (goodRR ? 15 : -10), -100, 100);
  return {
    agent: 'tradePlanner',
    decision: decisionFromScore(score),
    confidence: confidenceFromScore(score),
    reasoning:
      `Plan for ${s.displaySymbol}: entry near ${fmt(s, plan.entry)}, stop-loss ${fmt(s, plan.stopLoss)} ` +
      `(${(((plan.entry - plan.stopLoss) / plan.entry) * 100).toFixed(1)}% risk), targets ${fmt(s, plan.target1)} and ${fmt(s, plan.target2)}. ` +
      `Reward-to-risk works out to ${plan.rewardToRisk.toFixed(1)}:1${goodRR ? ' — acceptable for a swing setup' : ' — thin edge, wait for a better entry'}.`,
    keyFactors: [`R:R ${plan.rewardToRisk.toFixed(1)}:1`, `Stop ${fmt(s, plan.stopLoss)}`, `Target ${fmt(s, plan.target1)}`],
  };
}

// ---------------------------------------------------------------------------
// Fusion
// ---------------------------------------------------------------------------

const FUSION_WEIGHTS: Record<string, number> = {
  technical: 0.2,
  marketScanner: 0.16,
  newsIntelligence: 0.12,
  macro: 0.08,
  sentiment: 0.1,
  risk: 0.14,
  portfolio: 0.08,
  tradePlanner: 0.12,
};

export function runAnalysisEngine(s: StockSnapshot, benchmark: StockSnapshot | null): EngineOutput {
  const technical = technicalAgent(s);
  // Reuse the technical read as directional context for planner/portfolio
  const techHint = technical.decision === 'BUY' ? technical.confidence - 50 : technical.decision === 'SELL' ? -(technical.confidence - 50) : 0;

  const plan = buildTradePlan(s);
  const agentResults: AgentResult[] = [
    marketScannerAgent(s, benchmark),
    newsAgent(s),
    technical,
    macroAgent(s, benchmark),
    sentimentAgent(s),
    riskAgent(s),
    portfolioAgent(s, techHint),
    tradePlannerAgent(s, plan, techHint),
  ];

  let weighted = 0;
  for (const r of agentResults) {
    const dir = r.decision === 'BUY' ? 1 : r.decision === 'SELL' ? -1 : 0;
    weighted += (FUSION_WEIGHTS[r.agent] ?? 0.1) * dir * (r.confidence - 45);
  }

  const finalDecision: AgentDecision = weighted >= 6 ? 'BUY' : weighted <= -6 ? 'SELL' : 'WAIT';
  const overallConfidence = Math.round(clamp(52 + Math.abs(weighted) * 1.4, 52, 94));

  const atrPct = s.indicators.atr14 != null ? (s.indicators.atr14 / s.price) * 100 : 2.5;
  const riskLevel: RiskLevel = atrPct > 3 || s.drawdownFrom52wHighPct > 35 ? 'HIGH' : atrPct > 1.8 ? 'MEDIUM' : 'LOW';

  const buys = agentResults.filter(r => r.decision === 'BUY').length;
  const sells = agentResults.filter(r => r.decision === 'SELL').length;
  const waits = agentResults.filter(r => r.decision === 'WAIT').length;

  const reasons: string[] = [];
  const risks: string[] = [];
  for (const r of agentResults) {
    for (const f of r.keyFactors) {
      const lower = f.toLowerCase();
      if (/(overbought|weak|below|bearish|distribution|volatility|risk|down|low participation|depressed|underperform)/.test(lower)) {
        if (risks.length < 5 && !risks.includes(f)) risks.push(f);
      } else if (reasons.length < 5 && !reasons.includes(f)) {
        reasons.push(f);
      }
    }
  }

  const ind = s.indicators;
  const fusionReasoning =
    `${s.name} (${s.displaySymbol}) is trading at ${fmt(s, s.price)}, ${pct(s.changePercent)} today. ` +
    `Across the 8-agent panel: ${buys} vote BUY, ${sells} vote SELL, ${waits} vote WAIT. ` +
    `Technically, RSI(14) is ${ind.rsi14 != null ? ind.rsi14.toFixed(1) : 'n/a'}, MACD is ${ind.macdHist != null ? (ind.macdHist > 0 ? 'positive' : 'negative') : 'n/a'}, ` +
    `and price sits ${ind.sma50 != null ? (s.price > ind.sma50 ? 'above' : 'below') : 'near'} the 50-DMA (${fmt(s, ind.sma50)}). ` +
    `The stock is at ${s.positionIn52wRange}% of its 52-week range (${fmt(s, s.fiftyTwoWeekLow)}–${fmt(s, s.fiftyTwoWeekHigh)}) ` +
    `with 1-month return ${pct(s.returns.r1m)}${s.volumeRatio != null ? ` and volume at ${s.volumeRatio.toFixed(1)}× its 20-day average` : ''}. ` +
    `Net verdict: ${finalDecision} with ${overallConfidence}% confidence at ${riskLevel} risk. ` +
    (plan
      ? `If entering, the data-derived plan is entry ${fmt(s, plan.entry)}, stop ${fmt(s, plan.stopLoss)}, targets ${fmt(s, plan.target1)} / ${fmt(s, plan.target2)}.`
      : 'No trade plan could be derived from available history.') +
    ' This is analysis, not financial advice.';

  const actionableAdvice: string[] = [];
  if (finalDecision === 'BUY' && plan) {
    actionableAdvice.push(
      `Consider staggered entries near ${fmt(s, plan.entry)}${s.support.length ? ` or on dips toward support at ${fmt(s, s.support[0])}` : ''}`,
      `Protect the position with a stop-loss at ${fmt(s, plan.stopLoss)}`,
      `Book partial profits at ${fmt(s, plan.target1)}, trail the rest toward ${fmt(s, plan.target2)}`
    );
  } else if (finalDecision === 'SELL') {
    actionableAdvice.push(
      `Avoid fresh long positions in ${s.displaySymbol} while it trades below key averages`,
      s.resistance.length ? `Existing holders can use bounces toward ${fmt(s, s.resistance[0])} to lighten up` : 'Existing holders should tighten stop-losses',
      s.support.length ? `A close below ${fmt(s, s.support[0])} would confirm further downside` : 'Watch for stabilisation before re-entering'
    );
  } else {
    actionableAdvice.push(
      `Wait for a decisive trigger${s.resistance.length ? `: a close above ${fmt(s, s.resistance[0])} would turn the setup bullish` : ''}`,
      s.support.length ? `A break below ${fmt(s, s.support[0])} would invalidate the neutral stance` : 'Let price establish clear support first',
      `Re-run the analysis after the next 2–3 sessions or a fresh news catalyst`
    );
  }
  actionableAdvice.push(`Size the position so a stop-out costs no more than 1–2% of total capital (${riskLevel} risk name)`);

  return {
    finalDecision,
    overallConfidence,
    agentResults,
    fusionReasoning,
    riskLevel,
    actionableAdvice,
    explanation: {
      score: overallConfidence,
      reasons: reasons.length ? reasons : ['Multi-factor data analysis completed'],
      risks: risks.length ? risks : [`General market risk (${riskLevel.toLowerCase()} volatility profile)`],
    },
    tradePlan: plan,
  };
}

/** Compact, LLM-friendly digest of the real numbers behind a snapshot. */
export function snapshotDigest(s: StockSnapshot): string {
  const i = s.indicators;
  const n = (v: number | null | undefined, d = 2) => (v == null ? 'n/a' : v.toFixed(d));
  return [
    `${s.name} (${s.displaySymbol}, ${s.exchange})`,
    `Price ${s.currencySymbol}${n(s.price)} (${pct(s.changePercent)} today, prev close ${n(s.previousClose)})`,
    `52w range ${n(s.fiftyTwoWeekLow)}-${n(s.fiftyTwoWeekHigh)} (now at ${s.positionIn52wRange}% of range, ${n(s.drawdownFrom52wHighPct, 1)}% below high)`,
    `Returns: 1w ${pct(s.returns.r1w)}, 1m ${pct(s.returns.r1m)}, 3m ${pct(s.returns.r3m)}, 6m ${pct(s.returns.r6m)}, 1y ${pct(s.returns.r1y)}`,
    `RSI14 ${n(i.rsi14, 1)}, MACD ${n(i.macd)} vs signal ${n(i.macdSignal)} (hist ${n(i.macdHist)})`,
    `SMA20 ${n(i.sma20)}, SMA50 ${n(i.sma50)}, SMA200 ${n(i.sma200)}, ATR14 ${n(i.atr14)}`,
    `Bollinger ${n(i.bollLower)} / ${n(i.bollMiddle)} / ${n(i.bollUpper)}`,
    `Volume ${s.volume ?? 'n/a'} vs 20d avg ${s.avgVolume20 ?? 'n/a'} (ratio ${n(s.volumeRatio, 1)}x)`,
    `Support: ${s.support.map(v => n(v)).join(', ') || 'none found'} | Resistance: ${s.resistance.map(v => n(v)).join(', ') || 'none found'}`,
    s.news.length ? `Recent news: ${s.news.map(x => x.title).slice(0, 5).join(' | ')}` : 'Recent news: none found',
  ].join('\n');
}

export type { NewsItem };
