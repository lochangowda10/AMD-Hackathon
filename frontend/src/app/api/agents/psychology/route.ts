import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { runPsychologyCoach } from '@/lib/agents';
import { db } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { message, sessionId } = await req.json();

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Get recent trades for context (user-specific)
    const recentTrades = await db.trade.findMany({
      where: {
        authorId: session.user.id
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
    const sid = sessionId || session.user.id;
    await db.chatMessage.createMany({
      data: [
        { sessionId: sid, role: 'USER', content: message, agentType: 'PSYCHOLOGY', authorId: session.user.id },
        { sessionId: sid, role: 'ASSISTANT', content: response, agentType: 'PSYCHOLOGY', authorId: session.user.id },
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