import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { chatComplete, hasAIProvider, extractJSON } from '@/lib/ai';
import { getStockSnapshot } from '@/lib/market-data';

export const maxDuration = 60;

interface HoldingLike {
  symbol: string;
  name: string;
  sector: string | null;
  quantity: number;
  avgPrice: number;
  currentPrice: number;
  investedAmount: number;
  currentValue: number;
}

/** Refresh holding prices from live market data (best-effort, parallel). */
async function refreshPrices(holdings: HoldingLike[]): Promise<HoldingLike[]> {
  const results = await Promise.allSettled(
    holdings.slice(0, 20).map(async h => {
      const yahooSymbol = /[.^]/.test(h.symbol) ? h.symbol : `${h.symbol}.NS`;
      const snap = await getStockSnapshot(yahooSymbol);
      return { ...h, currentPrice: snap.price, currentValue: snap.price * h.quantity };
    })
  );
  return results.map((r, i) => (r.status === 'fulfilled' ? r.value : holdings[i]));
}

export async function GET() {
  try {
    // Load portfolio (non-fatal - empty portfolio still gets a valid response)
    let holdings: HoldingLike[] = [];
    try {
      holdings = await db.portfolioHolding.findMany();
    } catch (dbError) {
      console.error('Portfolio load failed (non-fatal):', dbError);
    }

    // Ground the analysis in LIVE prices, not stale DB values
    if (holdings.length) {
      holdings = await refreshPrices(holdings);
    }

    const totalInvested = holdings.reduce((s, h) => s + h.investedAmount, 0);
    const totalCurrent = holdings.reduce((s, h) => s + h.currentValue, 0);

    // Sector concentration
    const sectors: Record<string, number> = {};
    holdings.forEach(h => {
      const s = h.sector || 'Unknown';
      sectors[s] = (sectors[s] || 0) + h.currentValue;
    });
    const sectorCount = Object.keys(sectors).length;
    const maxSectorPct = totalCurrent > 0 ? (Math.max(...Object.values(sectors)) / totalCurrent) * 100 : 0;

    // Herfindahl index over holdings for real concentration measurement
    const hhi = totalCurrent > 0
      ? holdings.reduce((s, h) => s + Math.pow(h.currentValue / totalCurrent, 2), 0)
      : 1;

    const cashAllocation = Math.max(0, 30 - holdings.length * 5);

    // Deterministic health scoring from the real numbers
    let diversificationScore: number;
    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    let overallHealth: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
    const suggestions: string[] = [];
    const correlationConcerns: string[] = [];

    if (!holdings.length) {
      diversificationScore = 0;
      riskLevel = 'LOW';
      overallHealth = 'FAIR';
      suggestions.push(
        'No holdings recorded yet - add your positions to get a real health assessment',
        'Aim for 8-15 holdings across at least 4-5 sectors when you build the portfolio'
      );
    } else {
      diversificationScore = Math.round(
        Math.min(
          95,
          Math.max(
            5,
            Math.min(55, holdings.length * 7) + Math.min(25, sectorCount * 6) - Math.max(0, (hhi - 0.2) * 100)
          )
        )
      );
      riskLevel = maxSectorPct > 50 || holdings.length < 3 ? 'HIGH' : maxSectorPct > 35 || holdings.length < 5 ? 'MEDIUM' : 'LOW';
      overallHealth =
        diversificationScore >= 75 ? 'EXCELLENT' : diversificationScore >= 55 ? 'GOOD' : diversificationScore >= 35 ? 'FAIR' : 'POOR';

      if (holdings.length < 5) suggestions.push(`Only ${holdings.length} holding(s) - adding quality names across sectors reduces single-stock risk`);
      if (maxSectorPct > 40) {
        const topSector = Object.entries(sectors).sort((a, b) => b[1] - a[1])[0][0];
        suggestions.push(`${topSector} is ${Math.round(maxSectorPct)}% of the portfolio - trim or diversify away from this concentration`);
        correlationConcerns.push(`High intra-sector correlation risk in ${topSector}`);
      }
      if (hhi > 0.3) suggestions.push('Position sizes are lopsided - rebalance so no single holding dominates returns');
      const losers = holdings.filter(h => h.currentValue < h.investedAmount * 0.85);
      if (losers.length) {
        suggestions.push(`${losers.length} holding(s) are down more than 15% - review the original thesis for ${losers.map(l => l.symbol).slice(0, 3).join(', ')}`);
      }
      if (!suggestions.length) suggestions.push('Allocation looks balanced - keep reviewing quarterly and after large market moves');
    }

    // Optional LLM enrichment (adds suggestions; deterministic scores stay)
    if (hasAIProvider() && holdings.length) {
      try {
        const content = await chatComplete([
          {
            role: 'system',
            content: `You are a Portfolio Health Analyst for Indian retail investors. Given real portfolio data, respond ONLY in JSON: { "suggestions": ["2-3 specific suggestions"], "correlationConcerns": ["0-2 concerns"] }`,
          },
          {
            role: 'user',
            content: JSON.stringify({
              holdings: holdings.map(h => ({ symbol: h.symbol, sector: h.sector, value: Math.round(h.currentValue), pnlPct: h.investedAmount ? Math.round(((h.currentValue - h.investedAmount) / h.investedAmount) * 100) : 0 })),
              totalInvested: Math.round(totalInvested),
              totalCurrent: Math.round(totalCurrent),
              maxSectorConcentrationPct: Math.round(maxSectorPct),
            }),
          },
        ]);
        const parsed = extractJSON<{ suggestions?: string[]; correlationConcerns?: string[] }>(content);
        if (Array.isArray(parsed?.suggestions)) {
          for (const s of parsed.suggestions.slice(0, 3)) {
            if (typeof s === 'string' && s && !suggestions.includes(s)) suggestions.push(s);
          }
        }
        if (Array.isArray(parsed?.correlationConcerns)) {
          for (const c of parsed.correlationConcerns.slice(0, 2)) {
            if (typeof c === 'string' && c && !correlationConcerns.includes(c)) correlationConcerns.push(c);
          }
        }
      } catch (aiError) {
        console.error('Portfolio health AI enrichment skipped:', aiError instanceof Error ? aiError.message : aiError);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        diversificationScore,
        riskLevel,
        overallHealth,
        suggestions: suggestions.slice(0, 5),
        correlationConcerns,
        sectorConcentration: Math.round(maxSectorPct),
        cashAllocation,
        holdingCount: holdings.length,
        sectorCount,
        totalInvested: Math.round(totalInvested),
        totalCurrent: Math.round(totalCurrent),
        pnl: Math.round(totalCurrent - totalInvested),
        sectorAllocation: Object.entries(sectors).map(([sector, value]) => ({
          sector,
          value: Math.round(value),
          percentage: totalCurrent > 0 ? Math.round((value / totalCurrent) * 100) : 0,
        })),
      },
    });
  } catch (error) {
    console.error('Portfolio health error:', error);
    return NextResponse.json({ error: 'Portfolio health analysis failed' }, { status: 500 });
  }
}
