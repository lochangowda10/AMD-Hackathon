import { NextRequest, NextResponse } from 'next/server';
import { visionComplete, extractJSON } from '@/lib/ai';

export const maxDuration = 60;

interface VisionAnalysis {
  patterns?: { name: string; type: string; confidence: number; description: string }[];
  trend?: string;
  trendStrength?: string;
  support?: { level: number; description: string }[];
  resistance?: { level: number; description: string }[];
  volumeAnalysis?: string;
  candlestickPatterns?: string[];
  indicators?: { rsi?: number | null; macd?: string; movingAverage?: string };
  overallBias?: string;
  entrySuggestion?: string;
  exitSuggestion?: string;
  riskAssessment?: string;
  confidence?: number;
}

const CHART_ANALYSIS_PROMPT = `You are an expert Chart Vision Agent specializing in Indian stock market technical analysis.
Analyze this stock chart image and identify:
1. **Chart Patterns**: Head & Shoulders, Double Top/Bottom, Cup & Handle, Triangles, Flags, Channels
2. **Trend Analysis**: Current trend direction, trend strength, trendline connections
3. **Support & Resistance**: Key levels, breakouts, bounces
4. **Volume Analysis**: Volume trends, unusual volume, volume-price divergence
5. **Candlestick Patterns**: Doji, Hammer, Engulfing, Morning/Evening Star, etc.
6. **Technical Indicators visible**: RSI, MACD, Moving Averages, Bollinger Bands

Respond ONLY with valid JSON (no markdown, no commentary) in this exact format:
{
  "patterns": [{"name": "string", "type": "BULLISH"|"BEARISH"|"NEUTRAL", "confidence": 0-100, "description": "string"}],
  "trend": "BULLISH"|"BEARISH"|"SIDEWAYS",
  "trendStrength": "STRONG"|"MODERATE"|"WEAK",
  "support": [{"level": number, "description": "string"}],
  "resistance": [{"level": number, "description": "string"}],
  "volumeAnalysis": "string",
  "candlestickPatterns": ["string"],
  "indicators": {"rsi": number|null, "macd": "string", "movingAverage": "string"},
  "overallBias": "BULLISH"|"BEARISH"|"NEUTRAL",
  "entrySuggestion": "string",
  "exitSuggestion": "string",
  "riskAssessment": "LOW"|"MEDIUM"|"HIGH",
  "confidence": 0-100
}`;

function buildReadableSummary(a: VisionAnalysis): string {
  const lines: string[] = [];
  if (a.trend) lines.push(`Trend: ${a.trend} (${a.trendStrength || 'strength unknown'})`);
  if (a.overallBias) lines.push(`Overall bias: ${a.overallBias}`);
  if (a.patterns?.length) {
    lines.push('', 'Patterns detected:');
    for (const p of a.patterns) {
      lines.push(`• ${p.name} [${p.type}, ${p.confidence}% confidence] — ${p.description}`);
    }
  }
  if (a.support?.length) {
    lines.push('', `Support: ${a.support.map(s => `₹${s.level}`).join(', ')}`);
  }
  if (a.resistance?.length) {
    lines.push(`Resistance: ${a.resistance.map(r => `₹${r.level}`).join(', ')}`);
  }
  if (a.candlestickPatterns?.length) {
    lines.push('', `Candlestick patterns: ${a.candlestickPatterns.join(', ')}`);
  }
  if (a.volumeAnalysis) lines.push('', `Volume: ${a.volumeAnalysis}`);
  if (a.entrySuggestion) lines.push('', `Entry: ${a.entrySuggestion}`);
  if (a.exitSuggestion) lines.push(`Exit: ${a.exitSuggestion}`);
  if (a.riskAssessment) lines.push(`Risk: ${a.riskAssessment}`);
  return lines.join('\n');
}

export async function POST(req: NextRequest) {
  try {
    const { imageBase64, mimeType = 'image/png' } = await req.json();

    if (!imageBase64) {
      return NextResponse.json({ error: 'Image data is required' }, { status: 400 });
    }

    const dataUrl = `data:${mimeType};base64,${imageBase64}`;
    const content = await visionComplete(CHART_ANALYSIS_PROMPT, dataUrl);

    const parsed = extractJSON<VisionAnalysis>(content);
    const analysisText = parsed ? buildReadableSummary(parsed) : content;

    // Save analysis (non-fatal)
    try {
      const { db } = await import('@/lib/db');
      const { getCurrentUserId } = await import('@/lib/current-user');
      const authorId = await getCurrentUserId();
      await db.analysisRecord.create({
        data: {
          symbol: 'CHART_UPLOAD',
          analysisType: 'VISION',
          agentResults: content,
          finalDecision: parsed?.overallBias === 'BULLISH' ? 'BUY' : parsed?.overallBias === 'BEARISH' ? 'SELL' : 'WAIT',
          confidence: parsed?.confidence ?? 50,
          reasoning: analysisText.slice(0, 5000) || 'Chart analysis via Vision AI',
          inputData: JSON.stringify({ source: 'chart_upload' }),
          authorId,
        },
      });
    } catch (dbError) {
      console.error('Vision record save failed (non-fatal):', dbError);
    }

    return NextResponse.json({ success: true, analysis: analysisText, parsed });
  } catch (error) {
    console.error('Vision analysis error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Vision analysis failed' },
      { status: 500 }
    );
  }
}
