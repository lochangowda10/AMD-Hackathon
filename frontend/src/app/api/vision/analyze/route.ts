import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { imageBase64, mimeType = 'image/png' } = await req.json();

    if (!imageBase64) {
      return NextResponse.json({ error: 'Image data is required' }, { status: 400 });
    }

    const ZAI = (await import('z-ai-web-dev-sdk')).default;
    const zai = await ZAI.create();

    const chartAnalysisPrompt = `You are an expert Chart Vision Agent specializing in Indian stock market technical analysis.
Analyze this stock chart image and identify:
1. **Chart Patterns**: Head & Shoulders, Double Top/Bottom, Cup & Handle, Triangles, Flags, Channels
2. **Trend Analysis**: Current trend direction, trend strength, trendline connections
3. **Support & Resistance**: Key levels, breakouts, bounces
4. **Volume Analysis**: Volume trends, unusual volume, volume-price divergence
5. **Candlestick Patterns**: Doji, Hammer, Engulfing, Morning/Evening Star, etc.
6. **Technical Indicators visible**: RSI, MACD, Moving Averages, Bollinger Bands

Provide a comprehensive analysis with:
- Detected patterns and their implications
- Support and resistance levels
- Overall bullish/bearish/bearish bias
- Specific entry/exit suggestions
- Risk assessment

Respond in JSON format:
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
  "riskAssessment": "LOW"|"MEDIUM"|"HIGH"
}`;

    const dataUrl = `data:${mimeType};base64,${imageBase64}`;

    const response = await zai.chat.completions.createVision({
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: chartAnalysisPrompt },
            { type: 'image_url', image_url: { url: dataUrl } },
          ],
        },
      ],
      thinking: { type: 'disabled' },
    });

    const content = response.choices[0]?.message?.content || '';

    // Save analysis
    const { db } = await import('@/lib/db');
    await db.analysisRecord.create({
      data: {
        symbol: 'CHART_UPLOAD',
        analysisType: 'VISION',
        agentResults: content,
        finalDecision: 'WAIT',
        confidence: 50,
        reasoning: 'Chart analysis via Vision AI',
        inputData: JSON.stringify({ source: 'chart_upload' }),
      },
    });

    return NextResponse.json({ success: true, analysis: content });
  } catch (error) {
    console.error('Vision analysis error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Vision analysis failed' },
      { status: 500 }
    );
  }
}