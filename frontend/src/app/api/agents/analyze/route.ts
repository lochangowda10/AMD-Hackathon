import { NextRequest, NextResponse } from 'next/server';
import { runMultiAgentAnalysis } from '@/lib/agents';
import { db } from '@/lib/db';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { query, symbol } = await req.json();

    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    const result = await runMultiAgentAnalysis(query);

    // Save analysis record
    await db.analysisRecord.create({
      data: {
        symbol: symbol || 'UNKNOWN',
        analysisType: 'MULTI_AGENT',
        agentResults: JSON.stringify(result.agentResults),
        finalDecision: result.finalDecision,
        confidence: result.overallConfidence,
        reasoning: result.fusionReasoning,
        inputData: JSON.stringify({ query }),
        authorId: session.user.id,
      },
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('Agent analysis error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Analysis failed' },
      { status: 500 }
    );
  }
}