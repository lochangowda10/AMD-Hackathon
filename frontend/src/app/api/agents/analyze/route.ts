import { NextRequest, NextResponse } from 'next/server';
import { runMultiAgentAnalysis } from '@/lib/agents';
import { db } from '@/lib/db';
import { getCurrentUserId } from '@/lib/current-user';

export const maxDuration = 120;

export async function POST(req: NextRequest) {
  try {
    const { query, symbol } = await req.json();

    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    const result = await runMultiAgentAnalysis(query);

    // Save analysis record (uses logged-in user, or the shared demo account) - non-fatal
    try {
      const authorId = await getCurrentUserId();
      await db.analysisRecord.create({
        data: {
          symbol: symbol || 'UNKNOWN',
          analysisType: 'MULTI_AGENT',
          agentResults: JSON.stringify(result.agentResults),
          finalDecision: result.finalDecision,
          confidence: result.overallConfidence,
          reasoning: result.fusionReasoning,
          inputData: JSON.stringify({ query }),
          authorId,
        },
      });
    } catch (dbError) {
      console.error('Analysis record save failed (non-fatal):', dbError);
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('Agent analysis error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Analysis failed' },
      { status: 500 }
    );
  }
}
