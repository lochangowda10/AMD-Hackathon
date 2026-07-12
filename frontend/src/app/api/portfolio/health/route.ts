import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { chatComplete } from '@/lib/ai';

export async function GET() {
  try {
    const holdings = await db.portfolioHolding.findMany();
    const trades = await db.trade.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    const totalInvested = holdings.reduce((s, h) => s + h.investedAmount, 0);
    const totalCurrent = holdings.reduce((s, h) => s + h.currentValue, 0);

    // Sector concentration
    const sectors: Record<string, number> = {};
    holdings.forEach(h => {
      const s = h.sector || 'Unknown';
      sectors[s] = (sectors[s] || 0) + h.currentValue;
    });
    const maxSectorPct = totalCurrent > 0
      ? Math.max(...Object.values(sectors)) / totalCurrent * 100
      : 0;

    // Cash allocation estimate
    const cashAllocation = Math.max(0, 30 - holdings.length * 5); // Simulated

    // Generate AI health analysis
    const portfolioContext = JSON.stringify({
      holdings: holdings.length,
      totalInvested,
      totalCurrent,
      pnl: totalCurrent - totalInvested,
      sectorCount: Object.keys(sectors).length,
      maxSectorConcentration: Math.round(maxSectorPct),
      cashAllocation,
    });

    let healthContent = '';
    try {
      healthContent = await chatComplete([
        {
          role: 'system',
          content: `You are a Portfolio Health Analyst. Given portfolio data, provide:
1. Diversification score (0-100)
2. Risk assessment
3. Rebalancing suggestions
4. Correlation concerns
Respond in JSON: { "diversificationScore": 0-100, "riskLevel": "LOW"|"MEDIUM"|"HIGH", "suggestions": ["string"], "correlationConcerns": ["string"], "overallHealth": "EXCELLENT"|"GOOD"|"FAIR"|"POOR" }`,
        },
        { role: 'user', content: portfolioContext },
      ]);
    } catch (aiError) {
      console.error('Portfolio health AI analysis failed (using defaults):', aiError);
    }
    let healthAnalysis: any = {
      diversificationScore: 50,
      riskLevel: 'MEDIUM',
      suggestions: ['Add more holdings for diversification'],
      correlationConcerns: [],
      overallHealth: 'FAIR',
    };

    try {
      const jsonMatch = healthContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) healthAnalysis = JSON.parse(jsonMatch[0]);
    } catch (e) { /* use default */ }

    return NextResponse.json({
      success: true,
      data: {
        diversificationScore: healthAnalysis.diversificationScore,
        riskLevel: healthAnalysis.riskLevel,
        overallHealth: healthAnalysis.overallHealth,
        suggestions: healthAnalysis.suggestions,
        correlationConcerns: healthAnalysis.correlationConcerns,
        sectorConcentration: Math.round(maxSectorPct),
        cashAllocation,
        holdingCount: holdings.length,
        sectorCount: Object.keys(sectors).length,
        sectorAllocation: Object.entries(sectors).map(([sector, value]) => ({
          sector,
          value: Math.round(value),
          percentage: totalCurrent > 0 ? Math.round(value / totalCurrent * 100) : 0,
        })),
      },
    });
  } catch (error) {
    console.error('Portfolio health error:', error);
    return NextResponse.json({ error: 'Portfolio health analysis failed' }, { status: 500 });
  }
}