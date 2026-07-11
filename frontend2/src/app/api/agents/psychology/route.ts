import { NextRequest, NextResponse } from 'next/server';
import { runPsychologyCoach } from '@/lib/agents';
import { db } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const { message, sessionId } = await req.json();

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Get recent trades for context
    const recentTrades = await db.trade.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    const tradingHistory = recentTrades.length > 0
      ? `Recent trades: ${JSON.stringify(recentTrades.map(t => ({
          symbol: t.symbol, direction: t.direction, pnl: t.pnl, status: t.status
        })))}`
      : undefined;

    const response = await runPsychologyCoach(message, tradingHistory);

    // Save chat messages
    const sid = sessionId || 'default';
    await db.chatMessage.createMany({
      data: [
        { sessionId: sid, role: 'USER', content: message, agentType: 'PSYCHOLOGY' },
        { sessionId: sid, role: 'ASSISTANT', content: response, agentType: 'PSYCHOLOGY' },
      ],
    });

    return NextResponse.json({ success: true, response });
  } catch (error) {
    console.error('Psychology coach error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Psychology analysis failed' },
      { status: 500 }
    );
  }
}