import { chatComplete, hasAIProvider, extractJSON } from '@/lib/ai';
import { getStockSnapshot, getBenchmarkSnapshot, type StockSnapshot } from '@/lib/market-data';
import { resolveStockFromQuery, isMarketLevelQuery, type ResolvedStock } from '@/lib/symbols';
import {
  runAnalysisEngine,
  snapshotDigest,
  type AgentDecision,
  type RiskLevel,
  type AgentResult,
  type EngineOutput,
} from '@/lib/analysis-engine';

export type { AgentDecision, RiskLevel, AgentResult };

export interface OrchestratorOutput {
  finalDecision: AgentDecision;
  overallConfidence: number;
  agentResults: AgentResult[];
  fusionReasoning: string;
  riskLevel: RiskLevel;
  actionableAdvice: string[];
  explanation: {
    score: number;
    reasons: string[];
    risks: string[];
  };
  // Extra grounding fields (additive - existing UI ignores them safely)
  symbol?: string;
  stockName?: string;
  marketData?: {
    price: number;
    currency: string;
    changePercent: number;
    fiftyTwoWeekHigh: number;
    fiftyTwoWeekLow: number;
    rsi14: number | null;
    asOf: number;
  };
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)),
  ]);
}

// ---------------------------------------------------------------------------
// LLM narrative enhancement (single call; decisions stay deterministic)
// ---------------------------------------------------------------------------

interface LLMEnhancement {
  fusionReasoning?: string;
  actionableAdvice?: string[];
  reasons?: string[];
  risks?: string[];
  agentNotes?: Record<string, string>;
}

const ENHANCE_PROMPT = `You are the narrative layer of a multi-agent stock analysis system for Indian retail swing traders.
You are given REAL, LIVE market data for one stock plus the deterministic verdicts of 8 specialist agents.
Your job is ONLY to write better prose around those verdicts. You MUST NOT change any decision, confidence, or number.
Ground every sentence in the provided data - cite the actual prices, RSI, moving averages, news headlines.
Never invent data. Frame everything as analysis, not financial advice.

Respond ONLY with valid JSON:
{
  "fusionReasoning": "one rich paragraph synthesising the agents using the real numbers",
  "actionableAdvice": ["3-4 specific, data-grounded action items"],
  "reasons": ["3-5 short bullish/supporting factors from the data"],
  "risks": ["2-4 short risk factors from the data"],
  "agentNotes": { "technical": "refined 1-2 sentence reasoning", "marketScanner": "...", "newsIntelligence": "...", "macro": "...", "sentiment": "...", "risk": "...", "portfolio": "...", "tradePlanner": "..." }
}`;

async function enhanceWithLLM(
  snapshot: StockSnapshot,
  engine: EngineOutput
): Promise<LLMEnhancement | null> {
  try {
    const digest = snapshotDigest(snapshot);
    const agentSummary = engine.agentResults
      .map(r => `${r.agent}: ${r.decision} (${r.confidence}%) - ${r.reasoning}`)
      .join('\n');

    const response = await withTimeout(
      chatComplete(
        [
          { role: 'system', content: ENHANCE_PROMPT },
          {
            role: 'user',
            content: `LIVE MARKET DATA:\n${digest}\n\nDETERMINISTIC AGENT VERDICTS:\n${agentSummary}\n\nFINAL: ${engine.finalDecision} @ ${engine.overallConfidence}% (${engine.riskLevel} risk)`,
          },
        ],
        { temperature: 0.3, maxTokens: 1600 }
      ),
      25_000,
      'LLM enhancement'
    );

    const parsed = extractJSON<LLMEnhancement>(response);
    if (!parsed) return null;
    return parsed;
  } catch (err) {
    console.error('LLM enhancement skipped:', err instanceof Error ? err.message : err);
    return null;
  }
}

function asStringArray(value: unknown, max: number): string[] | null {
  if (!Array.isArray(value)) return null;
  const out = value.filter((x): x is string => typeof x === 'string' && x.trim().length > 0).slice(0, max);
  return out.length ? out : null;
}

// ---------------------------------------------------------------------------
// Per-symbol result cache: the analysis for a given stock barely changes
// second to second, but the LLM enhancement call alone costs several
// seconds. Under real traffic many users ask about the same hot stock
// within the same minute - without this, every one of those requests would
// pay for its own redundant LLM round trip. Coalescing also collapses
// concurrent requests for the same symbol into a single in-flight call.
// ---------------------------------------------------------------------------

const ANALYSIS_CACHE_TTL_MS = 45_000;
const analysisCache = new Map<string, { expires: number; value: OrchestratorOutput }>();
const analysisInFlight = new Map<string, Promise<OrchestratorOutput>>();

// ---------------------------------------------------------------------------
// Main entry: multi-agent analysis grounded in real market data
// ---------------------------------------------------------------------------

export async function runMultiAgentAnalysis(query: string, symbolHint?: string): Promise<OrchestratorOutput> {
  // 1) Figure out WHICH stock the user is asking about
  let resolved: ResolvedStock | null = null;
  try {
    resolved = await resolveStockFromQuery(query, symbolHint);
  } catch (err) {
    console.error('Symbol resolution error:', err);
  }
  if (!resolved && isMarketLevelQuery(query)) {
    resolved = { yahooSymbol: '^NSEI', displaySymbol: 'NIFTY 50', name: 'NIFTY 50', source: 'alias' };
  }

  if (!resolved) {
    // Honest, useful response instead of a hallucinated generic one
    return {
      finalDecision: 'WAIT',
      overallConfidence: 50,
      agentResults: [],
      fusionReasoning:
        `I couldn't match "${query.slice(0, 120)}" to a listed stock or index. ` +
        `Try a company name or NSE symbol - for example "Analyse Reliance", "Should I buy Tata Motors?", "TCS swing view" or "How is NIFTY today?".`,
      riskLevel: 'MEDIUM',
      actionableAdvice: [
        'Mention the company name or NSE ticker in your question',
        'Works for any NSE/BSE stock and global names like Apple or Tesla',
      ],
      explanation: {
        score: 50,
        reasons: [],
        risks: ['No stock identified in the query'],
      },
    };
  }

  // From here on, the result depends only on the resolved symbol, not the
  // exact wording of the query - so it's safe to cache/coalesce per symbol.
  const cacheKey = resolved.yahooSymbol;
  const cached = analysisCache.get(cacheKey);
  if (cached && cached.expires > Date.now()) {
    return cached.value;
  }
  const pending = analysisInFlight.get(cacheKey);
  if (pending) return pending;

  const task = (async (): Promise<OrchestratorOutput> => {
    // 2) Pull REAL market data (quote, 1y history, indicators, news, benchmark)
    let snapshot: StockSnapshot;
    try {
      snapshot = await getStockSnapshot(resolved.yahooSymbol, {
        includeNews: true,
        newsQuery: `${resolved.displaySymbol} ${resolved.name} stock`.slice(0, 60),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'market data unavailable';
      // Not cached - a transient data outage shouldn't be remembered for 45s
      return {
        finalDecision: 'WAIT',
        overallConfidence: 50,
        agentResults: [],
        fusionReasoning:
          `Live market data for ${resolved.name} (${resolved.displaySymbol}) could not be loaded right now (${msg}). ` +
          `Analysis without real data would be a guess, so no signal is issued. Please retry in a moment.`,
        riskLevel: 'MEDIUM',
        actionableAdvice: ['Retry the analysis shortly', 'Verify the symbol trades on NSE/BSE'],
        explanation: { score: 50, reasons: [], risks: ['Market data temporarily unavailable'] },
        symbol: resolved.displaySymbol,
        stockName: resolved.name,
      };
    }

    const benchmark = snapshot.isIndex ? null : await getBenchmarkSnapshot(snapshot.currency);

    // 3) Deterministic engine - ALWAYS runs, ALWAYS stock-specific
    const engine = runAnalysisEngine(snapshot, benchmark);

    // 4) Optional single LLM call to enrich the narrative (never the numbers)
    let enhanced: LLMEnhancement | null = null;
    if (hasAIProvider()) {
      enhanced = await enhanceWithLLM(snapshot, engine);
    }

    const agentResults = engine.agentResults.map(r => {
      const note = enhanced?.agentNotes?.[r.agent];
      return typeof note === 'string' && note.trim().length > 20 ? { ...r, reasoning: note.trim() } : r;
    });

    return {
      finalDecision: engine.finalDecision,
      overallConfidence: engine.overallConfidence,
      agentResults,
      fusionReasoning:
        typeof enhanced?.fusionReasoning === 'string' && enhanced.fusionReasoning.trim().length > 50
          ? enhanced.fusionReasoning.trim()
          : engine.fusionReasoning,
      riskLevel: engine.riskLevel,
      actionableAdvice: asStringArray(enhanced?.actionableAdvice, 5) ?? engine.actionableAdvice,
      explanation: {
        score: engine.explanation.score,
        reasons: asStringArray(enhanced?.reasons, 5) ?? engine.explanation.reasons,
        risks: asStringArray(enhanced?.risks, 5) ?? engine.explanation.risks,
      },
      symbol: snapshot.displaySymbol,
      stockName: snapshot.name,
      marketData: {
        price: snapshot.price,
        currency: snapshot.currency,
        changePercent: snapshot.changePercent,
        fiftyTwoWeekHigh: snapshot.fiftyTwoWeekHigh,
        fiftyTwoWeekLow: snapshot.fiftyTwoWeekLow,
        rsi14: snapshot.indicators.rsi14,
        asOf: snapshot.asOf,
      },
    };
  })();

  analysisInFlight.set(cacheKey, task);
  try {
    const result = await task;
    // Only cache genuine, data-backed results (agentResults present)
    if (result.agentResults.length > 0) {
      analysisCache.set(cacheKey, { expires: Date.now() + ANALYSIS_CACHE_TTL_MS, value: result });
    }
    return result;
  } finally {
    analysisInFlight.delete(cacheKey);
  }
}

// ---------------------------------------------------------------------------
// Psychology Coach (LLM with a real rule-based fallback - never throws)
// ---------------------------------------------------------------------------

const PSYCHOLOGY_PROMPT = `You are a Trading Psychology Coach - an empathetic but firm AI mentor for traders.
Your role is to:
1. Detect emotional trading patterns from the user's message
2. Provide calming, rational guidance
3. Reference their trading history and patterns
4. Suggest specific actions to avoid emotional mistakes
5. Recommend waiting periods or strategy reviews when needed

Be supportive but honest. Use trading psychology principles:
- Loss aversion bias, recency bias, confirmation bias
- Revenge trading, FOMO, panic selling
- Position sizing discipline
- Process over outcome thinking

Always respond in a calming, professional tone. Be specific and actionable.`;

const EMOTION_RULES: Array<{ pattern: RegExp; name: string; advice: string }> = [
  {
    pattern: /\b(revenge|get back|recover (my )?loss|win it back|double down)\b/i,
    name: 'revenge trading',
    advice:
      'That urge to "win it back" is revenge trading - the single fastest way to turn one loss into three. Step away from the terminal for the rest of the session. Your next trade must come from your written setup checklist, not from the last loss.',
  },
  {
    pattern: /\b(fomo|missing out|everyone (is )?buying|rocket|moon|can'?t miss)\b/i,
    name: 'FOMO',
    advice:
      'This reads like FOMO. A stock that has already run does not owe you an entry. Write down the level where the risk-reward becomes acceptable again and set an alert - if it never comes, there was no trade for you in it.',
  },
  {
    pattern: /\b(panic|scared|afraid|terrified|crash|everything (is )?falling|can'?t sleep)\b/i,
    name: 'panic / fear',
    advice:
      'Fear this strong usually means the position is too big, not that the market is wrong. Reduce size until you can think clearly - a position you can sleep with is a position you can manage rationally.',
  },
  {
    pattern: /\b(lost|loss|losing|down big|blew up|wiped)\b/i,
    name: 'loss processing',
    advice:
      'Losses are tuition, but only if you extract the lesson. Journal this one: what was the plan, where did you deviate, was the loss within your 1-2% risk budget? If it was within budget, it was a good trade with a bad outcome - those are survivable forever.',
  },
  {
    pattern: /\b(all.?in|entire (capital|savings)|borrow|loan|leverage everything)\b/i,
    name: 'over-sizing',
    advice:
      'Going all-in removes your ability to be wrong, and every trader is wrong regularly. Cap any single idea at a few percent of capital and never trade borrowed money - the market rewards the trader who is still solvent next year.',
  },
  {
    pattern: /\b(euphoric|unstoppable|genius|easy money|never lose|winning streak)\b/i,
    name: 'overconfidence',
    advice:
      'A winning streak is when discipline quietly dies. Keep position sizes identical to your rules, bank some profits, and treat the next trade as if your streak were 0-0.',
  },
];

function rulePsychologyResponse(userMessage: string, tradingHistory?: string): string {
  const matches = EMOTION_RULES.filter(r => r.pattern.test(userMessage));
  const lines: string[] = [];

  if (matches.length) {
    lines.push(`I hear you. What you're describing sounds like ${matches.map(m => m.name).join(' combined with ')}.`);
    for (const m of matches) lines.push(`\n• ${m.advice}`);
  } else {
    lines.push(
      "Thanks for sharing that. Whatever the market does, your edge comes from process: a written plan for every trade, a fixed 1-2% risk per position, and a journal entry after every exit."
    );
    lines.push(
      '\n• Before the next trade, write down: entry, stop-loss, target, and the reason. If you cannot fill in all four, there is no trade.'
    );
    lines.push('• Review your last 10 trades - patterns repeat, and the journal finds them faster than memory does.');
  }

  if (tradingHistory) {
    lines.push(
      '\nLooking at your recent trades, judge yourself only on plan-adherence, not P&L. One disciplined losing trade is worth more than a lucky win.'
    );
  }

  lines.push('\nProcess over outcome - always. What specifically triggered this feeling today?');
  return lines.join('\n');
}

export async function runPsychologyCoach(userMessage: string, tradingHistory?: string): Promise<string> {
  const context = tradingHistory ? `\n\nUser's recent trading context:\n${tradingHistory}` : '';

  if (hasAIProvider()) {
    try {
      const response = await withTimeout(
        chatComplete(
          [
            { role: 'system', content: PSYCHOLOGY_PROMPT },
            { role: 'user', content: `${userMessage}${context}` },
          ],
          // Reasoning-style models (e.g. gpt-oss-120b) can spend a chunk of
          // the budget on hidden reasoning before the visible answer - give
          // enough headroom that open-ended questions don't get truncated
          // down to an empty response.
          { maxTokens: 3000 }
        ),
        30_000,
        'Psychology coach'
      );
      if (response && response.trim().length > 20) return response;
      console.error('Psychology LLM returned an empty/too-short response, using rule-based coach');
    } catch (err) {
      console.error('Psychology LLM failed, using rule-based coach:', err instanceof Error ? err.message : err);
    }
  }

  return rulePsychologyResponse(userMessage, tradingHistory);
}

// ---------------------------------------------------------------------------
// Trade Simulator (Monte Carlo) - pure math, no external dependencies
// ---------------------------------------------------------------------------

export function runMonteCarloSimulation(params: {
  capital: number;
  riskPercent: number;
  tradeCount: number;
  winRate: number;
  rewardToRisk: number;
}): {
  expectedProfit: number;
  expectedLoss: number;
  bestCase: number;
  worstCase: number;
  expectedCAGR: number;
  maxDrawdown: number;
  riskOfRuin: number;
  distribution: { profit: number; probability: number }[];
} {
  // Clamp inputs so hostile/bad values can't produce NaN or hang the loop
  const capital = Math.min(Math.max(Number(params.capital) || 50000, 1000), 1_000_000_000);
  const riskPercent = Math.min(Math.max(Number(params.riskPercent) || 2, 0.1), 25);
  const tradeCount = Math.min(Math.max(Math.round(Number(params.tradeCount) || 50), 1), 1000);
  const winRate = Math.min(Math.max(Number(params.winRate) || 60, 1), 99);
  const rewardToRisk = Math.min(Math.max(Number(params.rewardToRisk) || 2, 0.1), 20);

  const riskAmount = capital * (riskPercent / 100);
  const winAmount = riskAmount * rewardToRisk;
  const lossAmount = riskAmount;
  const simulations = 10000;
  const finalValues: number[] = [];

  for (let sim = 0; sim < simulations; sim++) {
    let value = capital;

    for (let trade = 0; trade < tradeCount; trade++) {
      if (Math.random() < winRate / 100) {
        value += winAmount;
      } else {
        value -= lossAmount;
      }
    }
    finalValues.push(value);
  }

  finalValues.sort((a, b) => a - b);

  const expectedValue = finalValues.reduce((a, b) => a + b, 0) / simulations;
  const expectedProfit = expectedValue - capital;
  const bestCase = finalValues[Math.floor(simulations * 0.95)] - capital;
  const worstCase = finalValues[Math.floor(simulations * 0.05)] - capital;

  // Expected loss: average shortfall across the losing simulations (a real metric)
  const losers = finalValues.filter(v => v < capital);
  const expectedLoss = losers.length
    ? Math.abs(losers.reduce((a, b) => a + b, 0) / losers.length - capital)
    : 0;

  const expectedCAGR =
    Math.pow(Math.max((capital + expectedProfit) / capital, 0.01), 365 / (tradeCount * 18)) * 100 - 100; // ~18 day avg hold

  // Max drawdown (worst 10% of outcomes vs starting capital)
  const worstDrawdowns = finalValues.slice(0, Math.floor(simulations * 0.1));
  const maxDrawdown = worstDrawdowns.length > 0 ? (Math.abs(Math.min(worstDrawdowns[0] - capital, 0)) / capital) * 100 : 0;

  // Risk of ruin (chance of losing >50% of capital)
  const ruined = finalValues.filter(v => v < capital * 0.5).length;
  const riskOfRuin = (ruined / simulations) * 100;

  // Build distribution
  const bins = 20;
  const minVal = finalValues[0];
  const maxVal = finalValues[finalValues.length - 1];
  const binSize = (maxVal - minVal) / bins || 1;
  const distribution: { profit: number; probability: number }[] = [];

  for (let i = 0; i < bins; i++) {
    const lower = minVal + i * binSize;
    const upper = lower + binSize;
    const count = finalValues.filter(v => v >= lower && (i === bins - 1 ? v <= upper : v < upper)).length;
    distribution.push({
      profit: Math.round((lower + upper) / 2 - capital),
      probability: Math.round((count / simulations) * 100 * 10) / 10,
    });
  }

  return {
    expectedProfit: Math.round(expectedProfit),
    expectedLoss: Math.round(expectedLoss),
    bestCase: Math.round(bestCase),
    worstCase: Math.round(worstCase),
    expectedCAGR: Math.round(expectedCAGR * 10) / 10,
    maxDrawdown: Math.round(maxDrawdown * 10) / 10,
    riskOfRuin: Math.round(riskOfRuin * 10) / 10,
    distribution,
  };
}

// ---------------------------------------------------------------------------
// Weekly Report Generator (LLM with deterministic statistical fallback)
// ---------------------------------------------------------------------------

interface TradeLike {
  symbol?: string;
  direction?: string;
  pnl?: number | null;
  status?: string;
  entryPrice?: number;
  exitPrice?: number | null;
}

function ruleWeeklyReport(trades: TradeLike[]): string {
  if (!trades.length) {
    return [
      '## Weekly Trading Report',
      '',
      'No trades were recorded this week.',
      '',
      '**Suggestions:**',
      '- Use the Multi-Agent Analysis tab to research setups before entering',
      '- Paper-trade a written plan (entry, stop, target) to build the journaling habit',
    ].join('\n');
  }

  const closed = trades.filter(t => t.status === 'CLOSED');
  const wins = closed.filter(t => (t.pnl || 0) > 0);
  const losses = closed.filter(t => (t.pnl || 0) < 0);
  const totalPnl = closed.reduce((s, t) => s + (t.pnl || 0), 0);
  const winRate = closed.length ? Math.round((wins.length / closed.length) * 100) : 0;
  const avgWin = wins.length ? wins.reduce((s, t) => s + (t.pnl || 0), 0) / wins.length : 0;
  const avgLoss = losses.length ? Math.abs(losses.reduce((s, t) => s + (t.pnl || 0), 0) / losses.length) : 0;

  const bySymbol = new Map<string, number>();
  for (const t of closed) bySymbol.set(t.symbol || '?', (bySymbol.get(t.symbol || '?') || 0) + (t.pnl || 0));
  const ranked = [...bySymbol.entries()].sort((a, b) => b[1] - a[1]);

  const lines = [
    '## Weekly Trading Report',
    '',
    `**Overview:** ${trades.length} trades taken, ${closed.length} closed, ${trades.length - closed.length} still open.`,
    `**Net P&L (closed):** ₹${Math.round(totalPnl).toLocaleString('en-IN')}`,
    `**Win rate:** ${winRate}% (${wins.length}W / ${losses.length}L)`,
    `**Average win:** ₹${Math.round(avgWin).toLocaleString('en-IN')} · **Average loss:** ₹${Math.round(avgLoss).toLocaleString('en-IN')}`,
    '',
  ];

  if (ranked.length) {
    lines.push(`**Best symbol:** ${ranked[0][0]} (₹${Math.round(ranked[0][1]).toLocaleString('en-IN')})`);
    if (ranked.length > 1) {
      const worst = ranked[ranked.length - 1];
      lines.push(`**Worst symbol:** ${worst[0]} (₹${Math.round(worst[1]).toLocaleString('en-IN')})`);
    }
    lines.push('');
  }

  lines.push('**Recommendations:**');
  if (avgLoss > avgWin && wins.length && losses.length) {
    lines.push('- Your average loss exceeds your average win - tighten stop-losses or let winners run longer (aim for 2:1 reward-to-risk).');
  }
  if (winRate < 45 && closed.length >= 4) {
    lines.push('- Win rate below 45%: review entry criteria against the multi-agent analysis before taking trades.');
  }
  if (winRate >= 60) {
    lines.push('- Solid win rate - keep position sizing constant and avoid the temptation to over-size after wins.');
  }
  lines.push('- Journal the emotional state on every entry and exit; patterns repeat.');
  return lines.join('\n');
}

export async function generateWeeklyReport(trades: TradeLike[]): Promise<string> {
  if (hasAIProvider()) {
    try {
      const tradeSummary = JSON.stringify(
        trades.map(t => ({ symbol: t.symbol, direction: t.direction, pnl: t.pnl, status: t.status })),
        null,
        1
      );
      const response = await withTimeout(
        chatComplete([
          {
            role: 'system',
            content: `You are an expert trading analyst generating a weekly performance report.
Analyze the trades and provide:
1. Overall performance summary
2. Win rate analysis
3. Emotional pattern detection
4. Strategy effectiveness
5. Specific recommendations for improvement
6. Key lessons learned
Keep it concise but actionable. Use bullet points.`,
          },
          { role: 'user', content: `Here are this week's trades:\n${tradeSummary}` },
        ]),
        25_000,
        'Weekly report'
      );
      if (response && response.trim().length > 0) return response;
    } catch (err) {
      console.error('Weekly report LLM failed, using statistical report:', err instanceof Error ? err.message : err);
    }
  }
  return ruleWeeklyReport(trades);
}

// ---------------------------------------------------------------------------
// Market Memory Analysis (LLM with deterministic statistical fallback)
// ---------------------------------------------------------------------------

export async function analyzeMarketMemory(
  symbol: string,
  pastTrades: TradeLike[]
): Promise<{ patterns: string[]; suggestion: string; commonMistake: string }> {
  const closed = pastTrades.filter(t => t.status === 'CLOSED');
  const wins = closed.filter(t => (t.pnl || 0) > 0);
  const losses = closed.filter(t => (t.pnl || 0) < 0);

  if (hasAIProvider() && pastTrades.length) {
    try {
      const response = await withTimeout(
        chatComplete([
          {
            role: 'system',
            content: `You are a Market Memory Agent. Analyze a trader's historical trades for a specific symbol.
Identify patterns in: entry/exit timing, emotional decisions, repeated mistakes, profitable strategies.
Respond in JSON: { "patterns": ["string"], "suggestion": "string", "commonMistake": "string" }`,
          },
          {
            role: 'user',
            content: `Symbol: ${symbol}\nPast trades: ${JSON.stringify(pastTrades.map(t => ({ direction: t.direction, pnl: t.pnl, status: t.status, entryPrice: t.entryPrice, exitPrice: t.exitPrice })))}`,
          },
        ]),
        25_000,
        'Market memory'
      );
      const parsed = extractJSON<{ patterns?: string[]; suggestion?: string; commonMistake?: string }>(response);
      if (parsed?.patterns && parsed.suggestion) {
        return {
          patterns: parsed.patterns,
          suggestion: parsed.suggestion,
          commonMistake: parsed.commonMistake || 'None detected',
        };
      }
    } catch (err) {
      console.error('Market memory LLM failed, using statistics:', err instanceof Error ? err.message : err);
    }
  }

  // Deterministic fallback based on the actual trade history
  const patterns: string[] = [];
  if (closed.length) {
    const winRate = Math.round((wins.length / closed.length) * 100);
    patterns.push(`Win rate of ${winRate}% across ${closed.length} closed trades in ${symbol}`);
    const avgWin = wins.length ? wins.reduce((s, t) => s + (t.pnl || 0), 0) / wins.length : 0;
    const avgLoss = losses.length ? Math.abs(losses.reduce((s, t) => s + (t.pnl || 0), 0) / losses.length) : 0;
    if (avgWin && avgLoss) {
      patterns.push(`Average win ₹${Math.round(avgWin).toLocaleString('en-IN')} vs average loss ₹${Math.round(avgLoss).toLocaleString('en-IN')}`);
    }
  }
  if (pastTrades.length > closed.length) {
    patterns.push(`${pastTrades.length - closed.length} positions still open`);
  }
  if (!patterns.length) patterns.push('Not enough trade history in this symbol yet for pattern analysis');

  const avgWinAmt = wins.length ? wins.reduce((s, t) => s + (t.pnl || 0), 0) / wins.length : 0;
  const avgLossAmt = losses.length ? Math.abs(losses.reduce((s, t) => s + (t.pnl || 0), 0) / losses.length) : 0;

  return {
    patterns,
    suggestion:
      closed.length >= 3
        ? avgLossAmt > avgWinAmt
          ? `Your losses in ${symbol} run larger than your wins - predefine the stop-loss and honour it.`
          : `Your ${symbol} process is working - keep sizing consistent and avoid adding to losers.`
        : `Build at least 3-5 journaled trades in ${symbol} to unlock pattern detection.`,
    commonMistake:
      avgLossAmt > avgWinAmt && losses.length >= 2
        ? 'Letting losers run further than winners (inverted reward-to-risk)'
        : 'No recurring mistake detected yet',
  };
}

export { chatComplete };
