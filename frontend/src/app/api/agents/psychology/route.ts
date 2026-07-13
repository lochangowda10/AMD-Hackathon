import { NextRequest, NextResponse } from 'next/server';
import { runPsychologyCoach } from '@/lib/agents';
import { db } from '@/lib/db';
import { getCurrentUserId } from '@/lib/current-user';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const message = typeof body?.message === 'string' ? body.message.trim() : '';
    const sessionId = typeof body?.sessionId === 'string' ? body.sessionId : undefined;

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }
    if (message.length > 2000) {
      return NextResponse.json({ error: 'Message is too long (max 2000 characters)' }, { status: 400 });
    }

    // Recent trades add context, but must never block the coach (non-fatal)
    let userId: string | null = null;
    let tradingHistory: string | undefined;
    try {
      userId = await getCurrentUserId();
      const recentTrades = await db.trade.findMany({
        where: { authorId: userId },
        orderBy: { createdAt: 'desc' },
        take: 10,
      });
      if (recentTrades.length > 0) {
        tradingHistory = `Recent trades: ${JSON.stringify(
          recentTrades.map(t => ({
            symbol: t.symbol,
            direction: t.direction,
            pnl: t.pnl,
            status: t.status,
          }))
        )}`;
      }
    } catch (dbError) {
      console.error('Psychology trade-context load failed (non-fatal):', dbError);
    }

    // runPsychologyCoach has its own rule-based fallback - it never throws
    const response = await runPsychologyCoach(message, tradingHistory);

    // Save chat messages (non-fatal)
    try {
      const authorId = userId ?? (await getCurrentUserId());
      const sid = sessionId || authorId;
      await db.chatMessage.createMany({
        data: [
          { sessionId: sid, role: 'USER', content: message, agentType: 'PSYCHOLOGY', authorId },
          { sessionId: sid, role: 'ASSISTANT', content: response, agentType: 'PSYCHOLOGY', authorId },
        ],
      });
    } catch (dbError) {
      console.error('Psychology chat save failed (non-fatal):', dbError);
    }

    return NextResponse.json({ success: true, response });
  } catch (error) {
    console.error('Psychology coach error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Psychology analysis failed' },
      { status: 500 }
    );
  }
}
