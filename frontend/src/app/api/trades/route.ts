import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUserId } from '@/lib/current-user';

// GET - List trades
export async function GET() {
  try {
    const trades = await db.trade.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { journalEntries: true },
    });
    return NextResponse.json({ success: true, data: trades });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch trades' }, { status: 500 });
  }
}

// POST - Create trade
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const authorId = await getCurrentUserId();
    const trade = await db.trade.create({
      data: {
        authorId,
        symbol: body.symbol || 'NIFTY',
        direction: body.direction || 'WAIT',
        entryPrice: body.entryPrice || 0,
        quantity: body.quantity || 1,
        stopLoss: body.stopLoss,
        takeProfit: body.takeProfit,
        confidence: body.confidence,
        riskLevel: body.riskLevel,
        agentDecision: body.agentDecision ? JSON.stringify(body.agentDecision) : null,
        reasoning: body.reasoning,
      },
    });
    return NextResponse.json({ success: true, data: trade });
  } catch (error) {
    console.error('Trade create error:', error);
    return NextResponse.json({ error: 'Failed to create trade' }, { status: 500 });
  }
}

// PUT - Update trade
export async function PUT(req: NextRequest) {
  try {
    const { id, ...data } = await req.json();
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    const trade = await db.trade.update({
      where: { id },
      data: {
        ...data,
        exitDate: data.status === 'CLOSED' ? new Date() : undefined,
      },
    });
    return NextResponse.json({ success: true, data: trade });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update trade' }, { status: 500 });
  }
}