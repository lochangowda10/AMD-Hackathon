import { NextRequest, NextResponse } from 'next/server';
import { db } from "@/lib/db";
import { getCurrentUserId } from "@/lib/current-user";

// GET - List journal entries (graceful empty list when the DB is unavailable)
export async function GET() {
  try {
    const userId = await getCurrentUserId();

    const entries = await db.journalEntry.findMany({
      where: {
        authorId: userId
      },
      orderBy: { createdAt: 'desc' },
      include: {
        trade: {
          select: {
            symbol: true,
            direction: true,
            pnl: true
          }
        }
      },
      take: 50,
    });
    return NextResponse.json({ success: true, data: entries });
  } catch (error) {
    console.error('Failed to fetch journal entries (returning empty list):', error);
    return NextResponse.json({ success: true, data: [] });
  }
}

/**
 * The schema requires every JournalEntry to belong to a Trade, but the
 * journal UI lets users write standalone notes. Anchor those to a single
 * per-user "JOURNAL" trade so saves succeed instead of crashing on the
 * foreign key.
 */
async function resolveTradeId(userId: string, requestedTradeId: unknown): Promise<string> {
  if (typeof requestedTradeId === 'string' && requestedTradeId.trim()) {
    const existing = await db.trade.findUnique({ where: { id: requestedTradeId.trim() } });
    if (existing) return existing.id;
  }

  const anchor = await db.trade.findFirst({
    where: { authorId: userId, symbol: 'JOURNAL', direction: 'WAIT' },
    select: { id: true },
  });
  if (anchor) return anchor.id;

  const created = await db.trade.create({
    data: {
      authorId: userId,
      symbol: 'JOURNAL',
      direction: 'WAIT',
      entryPrice: 0,
      quantity: 1,
      status: 'CANCELLED', // never shows up as a real open position
      reasoning: 'Anchor record for standalone journal entries',
    },
    select: { id: true },
  });
  return created.id;
}

// POST - Create journal entry
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const content = typeof body?.content === 'string' ? body.content.trim() : '';

    if (!content) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }
    if (content.length > 10_000) {
      return NextResponse.json({ error: 'Content is too long (max 10000 characters)' }, { status: 400 });
    }

    const userId = await getCurrentUserId();
    const tradeId = await resolveTradeId(userId, body.tradeId);

    const VALID_TYPES = ['PLAN', 'EXECUTION', 'REVIEW', 'EMOTION', 'LESSON'];
    const VALID_MOODS = ['CONFIDENT', 'ANXIOUS', 'FOMO', 'CALM', 'FEARFUL', 'GREEDY'];

    const entry = await db.journalEntry.create({
      data: {
        tradeId,
        entryType: VALID_TYPES.includes(body.entryType) ? body.entryType : 'REVIEW',
        content,
        mood: VALID_MOODS.includes(body.mood) ? body.mood : 'CALM',
        followedPlan: body.followedPlan !== false,
        authorId: userId,
      },
      include: {
        trade: { select: { symbol: true, direction: true, pnl: true } },
      },
    });

    return NextResponse.json({ success: true, data: entry });
  } catch (error) {
    console.error('Journal create error:', error);
    return NextResponse.json(
      { error: 'Failed to create journal entry (is the database configured?)' },
      { status: 500 }
    );
  }
}
