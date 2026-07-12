import { NextRequest, NextResponse } from 'next/server';
import { runPsychologyCoach } from '@/lib/agents';
import { db } from '@/lib/db';
import { getCurrentUserId } from '@/lib/current-user';

export async function POST(req: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    const { message, sessionId } = await req.json();

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Get recent trades for context (user-specific)
    const recentTrades = await db.trade.findMany({
      where: {
        authorId: userId
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    const tradingHistory = recentTrades.length > 0
      ? `Recent trades: ${JSON.stringify(recentTrades.map(t => ({
          symbol: t.symbol,
          direction: t.direction,
          pnl: t.pnl,
          status: t.status
        })))}`
      : undefined;

    const response = await runPsychologyCoach(message, tradingHistory);

    // Save chat messages (user-specific session)
    const sid = sessionId || userId;
    await db.chatMessage.createMany({
      data: [
        { sessionId: sid, role: 'USER', content: message, agentType: 'PSYCHOLOGY', authorId: userId },
        { sessionId: sid, role: 'ASSISTANT', content: response, agentType: 'PSYCHOLOGY', authorId: userId },
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