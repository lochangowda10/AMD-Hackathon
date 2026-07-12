import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// GET - List journal entries
export async function GET(req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const entries = await db.journalEntry.findMany({
      where: {
        authorId: session.user.id
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
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
        authorId: session.user.id,
      },
    });

    return NextResponse.json({ success: true, data: entry });
  } catch (error) {
    console.error('Journal create error:', error);
    return NextResponse.json({ error: 'Failed to create journal entry' }, { status: 500 });
  }
}