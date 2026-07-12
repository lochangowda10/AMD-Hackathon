import { NextRequest, NextResponse } from 'next/server';
import { chatComplete, ChatMessageInput } from '@/lib/ai';
import { db } from '@/lib/db';
import { getCurrentUserId } from '@/lib/current-user';

export const maxDuration = 60;

const COPILOT_SYSTEM = `You are an AI Swing Trading Copilot - an institutional-grade AI research team running locally.
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
1. Give a clear initial assessment
2. Mention which agents would be relevant
3. Provide specific, actionable advice
4. Always mention risk
5. Suggest the next steps the user can take in the app

Be concise but thorough. Use Indian market context (NSE/BSE, ₹ currency, Indian companies).
Never give definitive financial advice - always frame as analysis/assessment.`;

export async function POST(req: NextRequest) {
  try {
    const { message, sessionId = 'default' } = await req.json();

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Get conversation history (non-fatal if the DB is unreachable)
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

    for (const msg of history) {
      if (msg.role === 'USER' || msg.role === 'ASSISTANT') {
        messages.push({
          role: msg.role === 'ASSISTANT' ? 'assistant' : 'user',
          content: msg.content,
        });
      }
    }

    messages.push({ role: 'user', content: message });

    const response =
      (await chatComplete(messages)) ||
      'I am your AI Trading Copilot. How can I help you today?';

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
