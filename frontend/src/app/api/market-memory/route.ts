import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { analyzeMarketMemory } from '@/lib/agents';

// GET - Get market memory for a symbol
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const symbol = searchParams.get('symbol');

    if (!symbol) {
      return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });
    }

    // Get or create memory record
    let memory = await db.marketMemory.findUnique({
      where: { id: `mem_${symbol}` },
    });

    // Get past trades for this symbol
    const pastTrades = await db.trade.findMany({
      where: { symbol },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    const closedTrades = pastTrades.filter(t => t.status === 'CLOSED');
    const winTrades = closedTrades.filter(t => (t.pnl || 0) > 0);

    // Update memory with latest stats
    if (memory) {
      await db.marketMemory.update({
        where: { id: `mem_${symbol}` },
        data: {
          tradeCount: pastTrades.length,
          winRate: closedTrades.length > 0 ? Math.round((winTrades.length / closedTrades.length) * 100) : null,
          lastTradedAt: pastTrades[0]?.createdAt || null,
        },
      });
    } else {
      memory = await db.marketMemory.create({
        data: {
          id: `mem_${symbol}`,
          symbol,
          tradeCount: pastTrades.length,
          winRate: closedTrades.length > 0 ? Math.round((winTrades.length / closedTrades.length) * 100) : null,
          lastTradedAt: pastTrades[0]?.createdAt || null,
        },
      });
    }

    // Run AI memory analysis if we have enough trades
    if (pastTrades.length >= 3) {
      const analysis = await analyzeMarketMemory(symbol, pastTrades);
      await db.marketMemory.update({
        where: { id: `mem_${symbol}` },
        data: {
          patterns: JSON.stringify(analysis.patterns),
          suggestion: analysis.suggestion,
          commonMistake: analysis.commonMistake,
        },
      });

      return NextResponse.json({
        success: true,
        data: {
          ...memory,
          ...analysis,
          tradeCount: pastTrades.length,
          winRate: closedTrades.length > 0 ? Math.round((winTrades.length / closedTrades.length) * 100) : 0,
          recentTrades: pastTrades.slice(0, 5),
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        ...memory,
        patterns: memory?.patterns ? JSON.parse(memory.patterns) : [],
        recentTrades: pastTrades.slice(0, 5),
      },
    });
  } catch (error) {
    console.error('Market memory error:', error);
    return NextResponse.json({ error: 'Failed to get market memory' }, { status: 500 });
  }
}