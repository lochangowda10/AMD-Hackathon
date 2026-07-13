import { NextRequest, NextResponse } from 'next/server';
import { chatComplete, hasAIProvider, ChatMessageInput } from '@/lib/ai';
import { db } from '@/lib/db';
import { getCurrentUserId } from '@/lib/current-user';
import { resolveStockFromQuery, isMarketLevelQuery } from '@/lib/symbols';
import { getStockSnapshot, getBenchmarkSnapshot, type StockSnapshot } from '@/lib/market-data';
import { runAnalysisEngine, snapshotDigest } from '@/lib/analysis-engine';

export const maxDuration = 60;

const COPILOT_SYSTEM = `You are an AI Swing Trading Copilot - an institutional-grade AI research team.
You help Indian retail traders make informed decisions about swing trading.

Your capabilities:
- Multi-agent analysis (8 specialized agents analyze from different angles)
- Chart pattern recognition via Vision AI
- Monte Carlo trade simulation
- Trading psychology coaching
- Portfolio health analysis
- Market memory and personalized learning
- Explainable AI with reasoning for every decision

When a user asks about a stock:
1. Give a clear initial assessment grounded ONLY in the live market data provided to you
2. Cite the actual numbers (price, RSI, moving averages, 52-week range)
3. Provide specific, actionable advice
4. Always mention risk
5. Suggest the next steps the user can take in the app

Be concise but thorough. Use Indian market context (NSE/BSE, ₹ currency, Indian companies).
Never invent prices or data - if data for something wasn't provided, say so.
Never give definitive financial advice - always frame as analysis/assessment.`;

/** Live-data context for any stock mentioned in the message (best-effort). */
async function buildMarketContext(message: string): Promise<{ context: string; snapshot: StockSnapshot | null }> {
  try {
    let resolved = await resolveStockFromQuery(message);
    if (!resolved && isMarketLevelQuery(message)) {
      resolved = { yahooSymbol: '^NSEI', displaySymbol: 'NIFTY 50', name: 'NIFTY 50', source: 'alias' };
    }
    if (!resolved) return { context: '', snapshot: null };

    const snapshot = await getStockSnapshot(resolved.yahooSymbol, {
      includeNews: true,
      newsQuery: `${resolved.displaySymbol} ${resolved.name} stock`.slice(0, 60),
    });
    return {
      context: `LIVE MARKET DATA (fetched just now - use these real numbers in your answer):\n${snapshotDigest(snapshot)}`,
      snapshot,
    };
  } catch (err) {
    console.error('Chat market context unavailable:', err instanceof Error ? err.message : err);
    return { context: '', snapshot: null };
  }
}

/** Grounded reply when no LLM key is configured - built from the real data. */
async function ruleBasedReply(message: string, snapshot: StockSnapshot | null): Promise<string> {
  if (snapshot) {
    const benchmark = snapshot.isIndex ? null : await getBenchmarkSnapshot(snapshot.currency);
    const engine = runAnalysisEngine(snapshot, benchmark);
    const advice = engine.actionableAdvice.map(a => `• ${a}`).join('\n');
    return (
      `${engine.fusionReasoning}\n\n` +
      `Suggested next steps:\n${advice}\n\n` +
      `For the full 8-agent breakdown, run this stock through the Multi-Agent Analysis tab.`
    );
  }

  return (
    "I'm your AI Trading Copilot. Ask me about any NSE/BSE stock or index and I'll analyze it with live market data - for example:\n\n" +
    '• "How is Reliance looking for a swing trade?"\n' +
    '• "Analyse Tata Motors"\n' +
    '• "Is NIFTY bullish right now?"\n\n' +
    'You can also upload a chart in Vision AI, stress-test a strategy in the Simulator, or talk to the Psychology Coach.'
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const message = typeof body?.message === 'string' ? body.message.trim() : '';
    const sessionId = typeof body?.sessionId === 'string' ? body.sessionId : 'default';

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }
    if (message.length > 2000) {
      return NextResponse.json({ error: 'Message is too long (max 2000 characters)' }, { status: 400 });
    }

    // Ground the copilot in real market data for whatever stock is mentioned
    const { context: marketContext, snapshot } = await buildMarketContext(message);

    let response = '';
    if (hasAIProvider()) {
      try {
        // Conversation history (non-fatal if the DB is unreachable)
        let history: { role: string; content: string }[] = [];
        try {
          history = await db.chatMessage.findMany({
            where: { sessionId },
            orderBy: { createdAt: 'asc' },
            take: 20,
          });
        } catch (dbError) {
          console.error('Chat history load failed (non-fatal):', dbError);
        }

        const messages: ChatMessageInput[] = [{ role: 'system', content: COPILOT_SYSTEM }];
        if (marketContext) messages.push({ role: 'system', content: marketContext });

        for (const msg of history) {
          if (msg.role === 'USER' || msg.role === 'ASSISTANT') {
            messages.push({
              role: msg.role === 'ASSISTANT' ? 'assistant' : 'user',
              content: msg.content,
            });
          }
        }
        messages.push({ role: 'user', content: message });

        // Reasoning-style models can spend part of the budget on hidden
        // reasoning before the visible answer - extra headroom avoids an
        // open-ended question getting truncated down to an empty response.
        response = await chatComplete(messages, { maxTokens: 3000 });
      } catch (aiError) {
        console.error('Chat LLM failed, using grounded fallback:', aiError instanceof Error ? aiError.message : aiError);
      }
    }

    if (!response) {
      response = await ruleBasedReply(message, snapshot);
    }

    // Save messages (non-fatal)
    try {
      const authorId = await getCurrentUserId();
      await db.chatMessage.createMany({
        data: [
          { sessionId, role: 'USER', content: message, agentType: 'COPILOT', authorId },
          { sessionId, role: 'ASSISTANT', content: response, agentType: 'COPILOT', authorId },
        ],
      });
    } catch (dbError) {
      console.error('Chat save failed (non-fatal):', dbError);
    }

    return NextResponse.json({ success: true, response });
  } catch (error) {
    console.error('Chat error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Chat failed' },
      { status: 500 }
    );
  }
}
