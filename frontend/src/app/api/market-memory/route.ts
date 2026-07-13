import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { analyzeMarketMemory } from '@/lib/agents';

export const maxDuration = 60;

// GET - Get market memory for a symbol
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const symbol = searchParams.get('symbol')?.trim().toUpperCase();

    if (!symbol) {
      return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });
    }

    // All DB access is best-effort: memory still works from live analysis
    let pastTrades: Array<{
      symbol: string; direction: string; pnl: number | null; status: string;
      entryPrice: number; exitPrice: number | null; createdAt: Date;
    }> = [];
    try {
      pastTrades = await db.trade.findMany({
        where: { symbol },
        orderBy: { createdAt: 'desc' },
        take: 20,
      });
    } catch (dbError) {
      console.error('Market memory trade load failed (non-fatal):', dbError);
    }

    const closedTrades = pastTrades.filter(t => t.status === 'CLOSED');
    const winTrades = closedTrades.filter(t => (t.pnl || 0) > 0);
    const winRate = closedTrades.length > 0 ? Math.round((winTrades.length / closedTrades.length) * 100) : null;

    // Upsert the memory record (non-fatal)
    let memory: Record<string, unknown> | null = null;
    try {
      memory = await db.marketMemory.upsert({
        where: { id: `mem_${symbol}` },
        create: {
          id: `mem_${symbol}`,
          symbol,
          tradeCount: pastTrades.length,
          winRate,
          lastTradedAt: pastTrades[0]?.createdAt || null,
        },
        update: {
          tradeCount: pastTrades.length,
          winRate,
          lastTradedAt: pastTrades[0]?.createdAt || null,
        },
      });
    } catch (dbError) {
      console.error('Market memory upsert failed (non-fatal):', dbError);
    }

    // analyzeMarketMemory has a deterministic fallback - it never throws
    const analysis = await analyzeMarketMemory(symbol, pastTrades);

    if (pastTrades.length >= 3) {
      try {
        await db.marketMemory.update({
          where: { id: `mem_${symbol}` },
          data: {
            patterns: JSON.stringify(analysis.patterns),
            suggestion: analysis.suggestion,
            commonMistake: analysis.commonMistake,
          },
        });
      } catch (dbError) {
        console.error('Market memory pattern save failed (non-fatal):', dbError);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        ...(memory || { id: `mem_${symbol}`, symbol }),
        ...analysis,
        tradeCount: pastTrades.length,
        winRate: winRate ?? 0,
        recentTrades: pastTrades.slice(0, 5),
      },
    });
  } catch (error) {
    console.error('Market memory error:', error);
    return NextResponse.json({ error: 'Failed to get market memory' }, { status: 500 });
  }
}
