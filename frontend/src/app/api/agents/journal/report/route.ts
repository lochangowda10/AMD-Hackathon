import { NextResponse } from 'next/server';
import { generateWeeklyReport } from '@/lib/agents';
import { db } from '@/lib/db';

export const maxDuration = 60;

export async function GET() {
  try {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);

    // Trades are loaded best-effort; the report generator handles empty lists
    let trades: Array<{ symbol: string; direction: string; pnl: number | null; status: string; createdAt: Date }> = [];
    try {
      trades = await db.trade.findMany({
        where: { createdAt: { gte: weekStart } },
        orderBy: { createdAt: 'desc' },
      });
    } catch (dbError) {
      console.error('Weekly report trade load failed (non-fatal):', dbError);
    }

    const closedTrades = trades.filter(t => t.status === 'CLOSED');
    const winTrades = closedTrades.filter(t => (t.pnl || 0) > 0);
    const winRate = closedTrades.length > 0 ? Math.round((winTrades.length / closedTrades.length) * 100) : 0;
    const avgGain =
      winTrades.length > 0 ? Math.round(winTrades.reduce((sum, t) => sum + (t.pnl || 0), 0) / winTrades.length) : 0;

    // generateWeeklyReport has a deterministic statistical fallback
    const report = await generateWeeklyReport(trades);

    // Persist the report if the DB is available; return it either way
    let weeklyReport: Record<string, unknown> = {
      weekStart,
      weekEnd: now,
      totalTrades: trades.length,
      winRate,
      avgGain,
      avgLoss: 0,
      recommendations: report,
      aiSummary: report.substring(0, 500),
    };
    try {
      weeklyReport = await db.weeklyReport.create({
        data: {
          weekStart,
          weekEnd: now,
          totalTrades: trades.length,
          winRate,
          avgGain,
          avgLoss: 0,
          recommendations: report,
          aiSummary: report.substring(0, 500),
        },
      });
    } catch (dbError) {
      console.error('Weekly report save failed (non-fatal):', dbError);
    }

    return NextResponse.json({ success: true, data: weeklyReport });
  } catch (error) {
    console.error('Weekly report error:', error);
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 });
  }
}
