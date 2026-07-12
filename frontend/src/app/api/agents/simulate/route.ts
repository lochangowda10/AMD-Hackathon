import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { runMonteCarloSimulation } from '@/lib/agents';
import { db } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const params = await req.json();

    const result = runMonteCarloSimulation({
      capital: params.capital || 50000,
      riskPercent: params.riskPercent || 2,
      tradeCount: params.tradeCount || 50,
      winRate: params.winRate || 60,
      rewardToRisk: params.rewardToRisk || 2,
    });

    // Save simulation (user-specific)
    await db.simulationResult.create({
      data: {
        capital: params.capital || 50000,
        riskPercent: params.riskPercent || 2,
        tradeCount: params.tradeCount || 50,
        winRate: params.winRate || 60,
        rewardToRisk: params.rewardToRisk || 2,
        expectedProfit: result.expectedProfit,
        expectedLoss: result.expectedLoss,
        bestCase: result.bestCase,
        worstCase: result.worstCase,
        expectedCAGR: result.expectedCAGR,
        maxDrawdown: result.maxDrawdown,
        riskOfRuin: result.riskOfRuin,
        probabilityDist: JSON.stringify(result.distribution),
        authorId: session.user.id,
      },
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('Simulation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Simulation failed' },
      { status: 500 }
    );
  }
}