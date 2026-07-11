import { NextResponse } from 'next/server';
import { generateWeeklyReport } from '@/lib/agents';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const trades = await db.trade.findMany({
      where: {
        createdAt: { gte: weekStart },
      },
      orderBy: { createdAt: 'desc' },
    });

    const closedTrades = trades.filter(t => t.status === 'CLOSED');
    const winTrades = closedTrades.filter(t => (t.pnl || 0) > 0);

    const report = await generateWeeklyReport(trades);

    const weeklyReport = await db.weeklyReport.create({
      data: {
        weekStart,
        weekEnd: now,
        totalTrades: trades.length,
        winRate: closedTrades.length > 0
          ? Math.round((winTrades.length / closedTrades.length) * 100)
          : 0,
        avgGain: winTrades.length > 0
          ? Math.round(winTrades.reduce((sum, t) => sum + (t.pnl || 0), 0) / winTrades.length)
          : 0,
        avgLoss: 0,
        recommendations: report,
        aiSummary: report.substring(0, 500),
      },
    });

    return NextResponse.json({ success: true, data: weeklyReport });
  } catch (error) {
    console.error('Weekly report error:', error);
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 });
  }
}