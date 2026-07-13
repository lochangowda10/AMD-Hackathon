import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUserId } from '@/lib/current-user';

// GET - List trades (graceful empty list when the DB is unavailable)
export async function GET() {
  try {
    const trades = await db.trade.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { journalEntries: true },
    });
    return NextResponse.json({ success: true, data: trades });
  } catch (error) {
    console.error('Trade list failed (returning empty list):', error);
    return NextResponse.json({ success: true, data: [] });
  }
}

// POST - Create trade
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const entryPrice = Number(body.entryPrice);
    const quantity = Math.round(Number(body.quantity));
    if (!Number.isFinite(entryPrice) || entryPrice <= 0) {
      return NextResponse.json({ error: 'A valid entryPrice is required' }, { status: 400 });
    }

    const authorId = await getCurrentUserId();
    const trade = await db.trade.create({
      data: {
        authorId,
        symbol: typeof body.symbol === 'string' && body.symbol.trim() ? body.symbol.trim().toUpperCase() : 'NIFTY',
        direction: ['BUY', 'SELL', 'WAIT'].includes(body.direction) ? body.direction : 'WAIT',
        entryPrice,
        quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1,
        stopLoss: Number.isFinite(Number(body.stopLoss)) ? Number(body.stopLoss) : null,
        takeProfit: Number.isFinite(Number(body.takeProfit)) ? Number(body.takeProfit) : null,
        confidence: Number.isFinite(Number(body.confidence)) ? Number(body.confidence) : null,
        riskLevel: ['LOW', 'MEDIUM', 'HIGH'].includes(body.riskLevel) ? body.riskLevel : null,
        agentDecision: body.agentDecision ? JSON.stringify(body.agentDecision) : null,
        reasoning: typeof body.reasoning === 'string' ? body.reasoning.slice(0, 5000) : null,
      },
    });
    return NextResponse.json({ success: true, data: trade });
  } catch (error) {
    console.error('Trade create error:', error);
    return NextResponse.json({ error: 'Failed to create trade (is the database configured?)' }, { status: 500 });
  }
}

// PUT - Update trade (only whitelisted fields reach the database)
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const id = body?.id;
    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'ID required' }, { status: 400 });
    }

    const data: Record<string, unknown> = {};
    if (Number.isFinite(Number(body.exitPrice))) data.exitPrice = Number(body.exitPrice);
    if (Number.isFinite(Number(body.pnl))) data.pnl = Number(body.pnl);
    if (Number.isFinite(Number(body.stopLoss))) data.stopLoss = Number(body.stopLoss);
    if (Number.isFinite(Number(body.takeProfit))) data.takeProfit = Number(body.takeProfit);
    if (['OPEN', 'CLOSED', 'CANCELLED'].includes(body.status)) {
      data.status = body.status;
      if (body.status === 'CLOSED') data.exitDate = new Date();
    }

    const trade = await db.trade.update({ where: { id }, data });
    return NextResponse.json({ success: true, data: trade });
  } catch (error) {
    console.error('Trade update error:', error);
    return NextResponse.json({ error: 'Failed to update trade' }, { status: 500 });
  }
}
