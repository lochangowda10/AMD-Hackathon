import { NextRequest, NextResponse } from 'next/server';
import { db } from "@/lib/db";
import { getCurrentUserId } from "@/lib/current-user";

// GET - List journal entries
export async function GET(req: NextRequest) {
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
    console.error('Failed to fetch journal entries:', error);
    return NextResponse.json({ error: 'Failed to fetch journal entries' }, { status: 500 });
  }
}

// POST - Create journal entry
export async function POST(req: NextRequest) {
  try {
    const userId = await getCurrentUserId();

    const { tradeId, entryType, content, mood, followedPlan } = await req.json();

    if (!content) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    const entry = await db.journalEntry.create({
      data: {
        tradeId: tradeId || '',
        entryType: entryType || 'REVIEW',
        content,
        mood: mood || 'CALM',
        followedPlan: followedPlan !== false,
        authorId: userId,
      },
    });

    return NextResponse.json({ success: true, data: entry });
  } catch (error) {
    console.error('Journal create error:', error);
    return NextResponse.json({ error: 'Failed to create journal entry' }, { status: 500 });
  }
}