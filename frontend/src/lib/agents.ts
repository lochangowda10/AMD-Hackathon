import { chatComplete } from '@/lib/ai';

// Agent types
export type AgentDecision = 'BUY' | 'SELL' | 'WAIT';
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export interface AgentResult {
  agent: string;
  decision: AgentDecision;
  confidence: number;
  reasoning: string;
  keyFactors: string[];
}

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
}

// Individual Agent Prompts
const AGENT_PROMPTS: Record<string, string> = {
  marketScanner: `You are the Market Scanner Agent. Analyze the given stock/sector and provide a trading signal.
Consider: overall market trend, sector performance, relative strength, volume patterns.
Respond in JSON format: { "decision": "BUY"|"SELL"|"WAIT", "confidence": 0-100, "reasoning": "string", "keyFactors": ["string"] }`,

  newsIntelligence: `You are the News Intelligence Agent. Analyze recent news sentiment for the given stock.
Consider: earnings reports, sector news, regulatory changes, global events, insider activity.
Respond in JSON format: { "decision": "BUY"|"SELL"|"WAIT", "confidence": 0-100, "reasoning": "string", "keyFactors": ["string"] }`,

  technical: `You are the Technical Indicator Agent. Analyze technical indicators for the given stock.
Consider: RSI, MACD, Bollinger Bands, Moving Averages (SMA/EMA), Volume, Stochastic, ADX.
Respond in JSON format: { "decision": "BUY"|"SELL"|"WAIT", "confidence": 0-100, "reasoning": "string", "keyFactors": ["string"] }`,

  macro: `You are the Macro Economy Agent. Analyze macro-economic factors affecting the stock.
Consider: interest rates, inflation, GDP, currency, commodity prices, geopolitical events.
Respond in JSON format: { "decision": "BUY"|"SELL"|"WAIT", "confidence": 0-100, "reasoning": "string", "keyFactors": ["string"] }`,

  sentiment: `You are the Sentiment Agent. Analyze market sentiment for the given stock.
Consider: social media buzz, retail interest, institutional flows, put/call ratios, fear/greed index.
Respond in JSON format: { "decision": "BUY"|"SELL"|"WAIT", "confidence": 0-100, "reasoning": "string", "keyFactors": ["string"] }`,

  risk: `You are the Risk Management Agent. Evaluate risk for the proposed trade.
Consider: volatility, downside risk, correlation with portfolio, position sizing, stop-loss placement.
Respond in JSON format: { "decision": "BUY"|"SELL"|"WAIT", "confidence": 0-100, "reasoning": "string", "keyFactors": ["string"] }`,

  portfolio: `You are the Portfolio Agent. Evaluate how this stock fits the current portfolio.
Consider: diversification, sector allocation, correlation, position sizing, rebalancing needs.
Respond in JSON format: { "decision": "BUY"|"SELL"|"WAIT", "confidence": 0-100, "reasoning": "string", "keyFactors": ["string"] }`,

  tradePlanner: `You are the Trade Planner Agent. Create an optimal entry/exit plan.
Consider: entry price, stop-loss, take-profit targets, holding period, position size, risk-reward ratio.
Respond in JSON format: { "decision": "BUY"|"SELL"|"WAIT", "confidence": 0-100, "reasoning": "string", "keyFactors": ["string"] }`,
};

function parseAgentResponse(response: string, agentName: string): AgentResult {
  try {
    // Try to extract JSON from the response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        agent: agentName,
        decision: ['BUY', 'SELL', 'WAIT'].includes(parsed.decision) ? parsed.decision : 'WAIT',
        confidence: Math.min(100, Math.max(0, Number(parsed.confidence) || 50)),
        reasoning: parsed.reasoning || 'Analysis complete',
        keyFactors: Array.isArray(parsed.keyFactors) ? parsed.keyFactors : [],
      };
    }
  } catch (e) {
    // Fall through to default
  }
  return {
    agent: agentName,
    decision: 'WAIT',
    confidence: 50,
    reasoning: response.substring(0, 200),
    keyFactors: [],
  };
}

async function runAgent(agentName: string, prompt: string, userQuery: string): Promise<AgentResult> {
  const agentPrompt = AGENT_PROMPTS[agentName];
  if (!agentPrompt) {
    return { agent: agentName, decision: 'WAIT', confidence: 0, reasoning: 'Unknown agent', keyFactors: [] };
  }

  try {
    const response = await chatComplete([
      { role: 'system', content: agentPrompt },
      { role: 'user', content: userQuery },
    ]);
    return parseAgentResponse(response, agentName);
  } catch (error) {
    return {
      agent: agentName,
      decision: 'WAIT',
      confidence: 0,
      reasoning: `Agent error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      keyFactors: [],
    };
  }
}

const FUSION_PROMPT = `You are the Decision Fusion Engine - the final arbiter in a multi-agent AI trading system.
You receive analysis from multiple specialized agents and must produce a final consensus decision.

Given agent results, produce a FINAL decision with:
1. Weighted confidence score (consider each agent's confidence and expertise relevance)
2. Clear reasoning that synthesizes all agent inputs
3. Risk assessment
4. Actionable advice
5. Explanation score (0-100)

Respond ONLY in valid JSON:
{
  "finalDecision": "BUY"|"SELL"|"WAIT",
  "overallConfidence": 0-100,
  "fusionReasoning": "string - detailed reasoning combining all agents",
  "riskLevel": "LOW"|"MEDIUM"|"HIGH",
  "actionableAdvice": ["string"],
  "explanation": {
    "score": 0-100,
    "reasons": ["string"],
    "risks": ["string"]
  }
}`;

export async function runMultiAgentAnalysis(query: string): Promise<OrchestratorOutput> {
  const agents = [
    'marketScanner', 'newsIntelligence', 'technical', 'macro',
    'sentiment', 'risk', 'portfolio', 'tradePlanner',
  ];

  // Run all agents in parallel
  const agentPromises = agents.map(agent => runAgent(agent, AGENT_PROMPTS[agent], query));
  const agentResults = await Promise.all(agentPromises);

  // Run fusion engine
  const agentSummary = agentResults.map(r =>
    `${r.agent}: ${r.decision} (${r.confidence}%) - ${r.reasoning}`
  ).join('\n');

  let fusionResponse = '';
  try {
    fusionResponse = await chatComplete([
      { role: 'system', content: FUSION_PROMPT },
      { role: 'user', content: `Stock query: ${query}\n\nAgent Results:\n${agentSummary}` },
    ]);
  } catch (e) {
    console.error('Fusion engine error:', e);
  }

  let fusionParsed: any = {};
  try {
    const jsonMatch = fusionResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      fusionParsed = JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    // Default
  }

  return {
    finalDecision: fusionParsed.finalDecision || 'WAIT',
    overallConfidence: fusionParsed.overallConfidence || 50,
    agentResults,
    fusionReasoning: fusionParsed.fusionReasoning || 'Multi-agent analysis complete',
    riskLevel: fusionParsed.riskLevel || 'MEDIUM',
    actionableAdvice: fusionParsed.actionableAdvice || ['Proceed with caution'],
    explanation: {
      score: fusionParsed.explanation?.score || 50,
      reasons: fusionParsed.explanation?.reasons || [],
      risks: fusionParsed.explanation?.risks || [],
    },
  };
}

// Psychology Coach
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

export async function runPsychologyCoach(userMessage: string, tradingHistory?: string): Promise<string> {
  const context = tradingHistory
    ? `\n\nUser's recent trading context:\n${tradingHistory}`
    : '';

  const response = await chatComplete([
    { role: 'system', content: PSYCHOLOGY_PROMPT },
    { role: 'user', content: `${userMessage}${context}` },
  ]);

  return response || 'I am here to help you with your trading psychology. Please share what is on your mind.';
}

// Trade Simulator (Monte Carlo)
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
  const { capital, riskPercent, tradeCount, winRate, rewardToRisk } = params;
  const riskAmount = capital * (riskPercent / 100);
  const winAmount = riskAmount * rewardToRisk;
  const lossAmount = riskAmount;
  const simulations = 10000;
  const finalValues: number[] = [];

  for (let sim = 0; sim < simulations; sim++) {
    let value = capital;
    let peak = capital;
    let maxDD = 0;

    for (let trade = 0; trade < tradeCount; trade++) {
      if (Math.random() < winRate / 100) {
        value += winAmount;
      } else {
        value -= lossAmount;
      }
      peak = Math.max(peak, value);
      const dd = (peak - value) / peak * 100;
      maxDD = Math.max(maxDD, dd);
    }
    finalValues.push(value);
  }

  finalValues.sort((a, b) => a - b);

  const expectedValue = finalValues.reduce((a, b) => a + b, 0) / simulations;
  const expectedProfit = expectedValue - capital;
  const bestCase = finalValues[Math.floor(simulations * 0.95)] - capital;
  const worstCase = finalValues[Math.floor(simulations * 0.05)] - capital;

  // Expected per-trade return
  const expectedPerTrade = (winRate / 100) * winAmount - ((100 - winRate) / 100) * lossAmount;
  const expectedCAGR = Math.pow((capital + expectedProfit) / capital, 365 / (tradeCount * 18)) * 100 - 100; // ~18 day avg hold

  // Max drawdown (average of worst 10%)
  const worstDrawdowns = finalValues.slice(0, Math.floor(simulations * 0.1));
  const maxDrawdown = worstDrawdowns.length > 0
    ? Math.abs(worstDrawdowns[0] - capital) / capital * 100
    : 0;

  // Risk of ruin (chance of losing >50% of capital)
  const ruined = finalValues.filter(v => v < capital * 0.5).length;
  const riskOfRuin = (ruined / simulations) * 100;

  // Build distribution
  const bins = 20;
  const minVal = finalValues[0];
  const maxVal = finalValues[finalValues.length - 1];
  const binSize = (maxVal - minVal) / bins;
  const distribution: { profit: number; probability: number }[] = [];

  for (let i = 0; i < bins; i++) {
    const lower = minVal + i * binSize;
    const upper = lower + binSize;
    const count = finalValues.filter(v => v >= lower && v < upper).length;
    distribution.push({
      profit: Math.round((lower + upper) / 2 - capital),
      probability: Math.round((count / simulations) * 100 * 10) / 10,
    });
  }

  return {
    expectedProfit: Math.round(expectedProfit),
    expectedLoss: Math.round(Math.abs(expectedProfit > 0 ? lossAmount * (1 - winRate / 100) * tradeCount * 0.3 : expectedProfit)),
    bestCase: Math.round(bestCase),
    worstCase: Math.round(worstCase),
    expectedCAGR: Math.round(expectedCAGR * 10) / 10,
    maxDrawdown: Math.round(maxDrawdown * 10) / 10,
    riskOfRuin: Math.round(riskOfRuin * 10) / 10,
    distribution,
  };
}

// Weekly Report Generator
export async function generateWeeklyReport(trades: any[]): Promise<string> {
  const tradeSummary = JSON.stringify(trades, null, 2);

  const response = await chatComplete([
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
  ]);

  return response || 'Unable to generate report.';
}

// Market Memory Analysis
export async function analyzeMarketMemory(symbol: string, pastTrades: any[]): Promise<{
  patterns: string[];
  suggestion: string;
  commonMistake: string;
}> {
  const response = await chatComplete([
      {
        role: 'system',
        content: `You are a Market Memory Agent. Analyze a trader's historical trades for a specific symbol.
Identify patterns in: entry/exit timing, emotional decisions, repeated mistakes, profitable strategies.
Respond in JSON: { "patterns": ["string"], "suggestion": "string", "commonMistake": "string" }`,
      },
      { role: 'user', content: `Symbol: ${symbol}\nPast trades: ${JSON.stringify(pastTrades)}` },
  ]);

  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
  } catch (e) { /* fallback */ }

  return {
    patterns: ['Insufficient data for pattern analysis'],
    suggestion: 'Continue trading to build pattern recognition',
    commonMistake: 'Not enough data',
  };
}

export { chatComplete };