import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Get all portfolio holdings
export async function GET() {
  try {
    const holdings = await db.portfolioHolding.findMany({
      orderBy: { investedAmount: 'desc' },
    });

    // Calculate portfolio-level metrics
    const totalInvested = holdings.reduce((sum, h) => sum + h.investedAmount, 0);
    const totalCurrent = holdings.reduce((sum, h) => sum + h.currentValue, 0);
    const totalPnl = totalCurrent - totalInvested;

    // Sector allocation
    const sectorMap: Record<string, number> = {};
    holdings.forEach(h => {
      const sector = h.sector || 'Unknown';
      sectorMap[sector] = (sectorMap[sector] || 0) + h.currentValue;
    });

    const sectorAllocation = Object.entries(sectorMap).map(([sector, value]) => ({
      sector,
      value,
      percentage: Math.round((value / totalCurrent) * 100),
    }));

    return NextResponse.json({
      success: true,
      data: {
        holdings,
        summary: {
          totalInvested: Math.round(totalInvested),
          totalCurrent: Math.round(totalCurrent),
          totalPnl: Math.round(totalPnl),
          pnlPercent: totalInvested > 0 ? Math.round((totalPnl / totalInvested) * 100) : 0,
          holdingCount: holdings.length,
        },
        sectorAllocation,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch portfolio' }, { status: 500 });
  }
}

// POST - Add holding
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const holding = await db.portfolioHolding.create({
      data: body,
    });
    return NextResponse.json({ success: true, data: holding });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to add holding' }, { status: 500 });
  }
}

// DELETE - Remove holding
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    await db.portfolioHolding.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to remove holding' }, { status: 500 });
  }
}