import { NextRequest, NextResponse } from 'next/server';
import { visionComplete, extractJSON, hasAIProvider } from '@/lib/ai';
import { analyzeChartPixels, type ChartAnalysis } from '@/lib/chart-vision';

export const maxDuration = 60;

const ALLOWED_MIME = new Set(['image/png', 'image/jpeg', 'image/jpg', 'image/webp']);
const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8MB decoded

const CHART_ANALYSIS_PROMPT = `You are an expert Chart Vision Agent specializing in Indian stock market technical analysis.
Analyze this stock chart image and identify:
1. **Chart Patterns**: Head & Shoulders, Double Top/Bottom, Cup & Handle, Triangles, Flags, Channels
2. **Trend Analysis**: Current trend direction, trend strength, trendline connections
3. **Support & Resistance**: Key levels READ FROM THE PRICE AXIS in the image, breakouts, bounces
4. **Volume Analysis**: Volume trends, unusual volume, volume-price divergence
5. **Candlestick Patterns**: Doji, Hammer, Engulfing, Morning/Evening Star, etc.
6. **Technical Indicators visible**: RSI, MACD, Moving Averages, Bollinger Bands

Only report what is actually visible in THIS image. If something is not visible (e.g. no volume pane, unreadable axis), say so rather than inventing values.

Respond ONLY with valid JSON (no markdown fences, no commentary) in this exact format:
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

type VisionAnalysis = Partial<ChartAnalysis> & Record<string, unknown>;

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const n = Number(value.replace(/[₹$,\s]/g, ''));
    if (Number.isFinite(n)) return n;
  }
  return null;
}

/** Normalize whatever the model returned into the shape the UI expects. */
function sanitize(parsed: VisionAnalysis): VisionAnalysis {
  const levels = (arr: unknown) =>
    Array.isArray(arr)
      ? arr
          .map(item => {
            if (item && typeof item === 'object') {
              const rec = item as Record<string, unknown>;
              const level = toNumber(rec.level);
              if (level != null) return { level, description: String(rec.description ?? '') };
            }
            const level = toNumber(item);
            return level != null ? { level, description: '' } : null;
          })
          .filter((x): x is { level: number; description: string } => x !== null)
          .slice(0, 4)
      : [];

  const patterns: ChartAnalysis['patterns'] = Array.isArray(parsed.patterns)
    ? (parsed.patterns as unknown[])
        .filter((p): p is Record<string, unknown> => Boolean(p) && typeof p === 'object')
        .map(p => {
          const type = String(p.type);
          return {
            name: String(p.name ?? 'Unnamed pattern'),
            type: (type === 'BULLISH' || type === 'BEARISH' || type === 'NEUTRAL' ? type : 'NEUTRAL') as
              | 'BULLISH'
              | 'BEARISH'
              | 'NEUTRAL',
            confidence: Math.min(100, Math.max(0, toNumber(p.confidence) ?? 50)),
            description: String(p.description ?? ''),
          };
        })
        .slice(0, 5)
    : [];

  const indicatorsSrc = (parsed.indicators && typeof parsed.indicators === 'object' ? parsed.indicators : {}) as Record<string, unknown>;

  return {
    ...parsed,
    patterns,
    trend: ['BULLISH', 'BEARISH', 'SIDEWAYS'].includes(String(parsed.trend)) ? parsed.trend : 'SIDEWAYS',
    trendStrength: ['STRONG', 'MODERATE', 'WEAK'].includes(String(parsed.trendStrength)) ? parsed.trendStrength : 'WEAK',
    support: levels(parsed.support),
    resistance: levels(parsed.resistance),
    volumeAnalysis: typeof parsed.volumeAnalysis === 'string' ? parsed.volumeAnalysis : 'Volume not assessed',
    candlestickPatterns: Array.isArray(parsed.candlestickPatterns)
      ? parsed.candlestickPatterns.filter((x): x is string => typeof x === 'string').slice(0, 6)
      : [],
    indicators: {
      rsi: toNumber(indicatorsSrc.rsi),
      macd: typeof indicatorsSrc.macd === 'string' ? indicatorsSrc.macd : 'Not visible',
      movingAverage: typeof indicatorsSrc.movingAverage === 'string' ? indicatorsSrc.movingAverage : 'Not visible',
    },
    overallBias: ['BULLISH', 'BEARISH', 'NEUTRAL'].includes(String(parsed.overallBias)) ? parsed.overallBias : 'NEUTRAL',
    entrySuggestion: typeof parsed.entrySuggestion === 'string' ? parsed.entrySuggestion : 'See full analysis',
    exitSuggestion: typeof parsed.exitSuggestion === 'string' ? parsed.exitSuggestion : 'See full analysis',
    riskAssessment: ['LOW', 'MEDIUM', 'HIGH'].includes(String(parsed.riskAssessment)) ? parsed.riskAssessment : 'MEDIUM',
    confidence: Math.min(100, Math.max(0, toNumber(parsed.confidence) ?? 50)),
  };
}

function buildReadableSummary(a: VisionAnalysis, source: 'ai' | 'pixel'): string {
  const lines: string[] = [];
  if (a.trend) lines.push(`Trend: ${a.trend} (${a.trendStrength || 'strength unknown'})`);
  if (a.overallBias) lines.push(`Overall bias: ${a.overallBias}`);
  const patterns = a.patterns as ChartAnalysis['patterns'] | undefined;
  if (patterns?.length) {
    lines.push('', 'Patterns detected:');
    for (const p of patterns) {
      lines.push(`• ${p.name} [${p.type}, ${p.confidence}% confidence] — ${p.description}`);
    }
  }
  const support = a.support as ChartAnalysis['support'] | undefined;
  const resistance = a.resistance as ChartAnalysis['resistance'] | undefined;
  if (support?.length) lines.push('', `Support: ${support.map(s => `₹${s.level}`).join(', ')}`);
  if (resistance?.length) lines.push(`Resistance: ${resistance.map(r => `₹${r.level}`).join(', ')}`);
  const candles = a.candlestickPatterns as string[] | undefined;
  if (candles?.length) lines.push('', `Candlestick observations: ${candles.join('; ')}`);
  if (a.volumeAnalysis) lines.push('', `Volume: ${a.volumeAnalysis}`);
  if (a.entrySuggestion) lines.push('', `Entry: ${a.entrySuggestion}`);
  if (a.exitSuggestion) lines.push(`Exit: ${a.exitSuggestion}`);
  if (a.riskAssessment) lines.push(`Risk: ${a.riskAssessment}`);
  if (source === 'pixel') {
    lines.push('', 'Note: analyzed with the built-in pixel engine (candle detection + trend regression). Configure an AI vision key for pattern names, exact price levels and indicator reads.');
  }
  return lines.join('\n');
}

async function analyzeWithAI(dataUrl: string): Promise<VisionAnalysis | null> {
  if (!hasAIProvider()) return null;
  try {
    // Single attempt only: vision calls can take 20-40s on their own, and a
    // retry-on-parse-failure would risk blowing past this route's
    // maxDuration. If parsing fails here, the pixel engine below is a real,
    // image-specific fallback - not worth doubling the latency budget for.
    const content = await visionComplete(CHART_ANALYSIS_PROMPT, dataUrl);
    const parsed = extractJSON<VisionAnalysis>(content);
    return parsed ? sanitize(parsed) : null;
  } catch (err) {
    console.error('AI vision failed, falling back to pixel engine:', err instanceof Error ? err.message : err);
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body.imageBase64 !== 'string' || !body.imageBase64.trim()) {
      return NextResponse.json({ error: 'Image data is required' }, { status: 400 });
    }

    const mimeType = typeof body.mimeType === 'string' ? body.mimeType.toLowerCase() : 'image/png';
    if (!ALLOWED_MIME.has(mimeType)) {
      return NextResponse.json({ error: 'Unsupported image type. Use PNG, JPG or WebP.' }, { status: 400 });
    }

    // Accept both a bare base64 payload and a full data URL
    const base64 = body.imageBase64.replace(/^data:[^;]+;base64,/, '').replace(/\s/g, '');
    let imageBuffer: Buffer;
    try {
      imageBuffer = Buffer.from(base64, 'base64');
    } catch {
      return NextResponse.json({ error: 'Invalid base64 image data' }, { status: 400 });
    }
    if (imageBuffer.length < 100) {
      return NextResponse.json({ error: 'Image data is empty or corrupted' }, { status: 400 });
    }
    if (imageBuffer.length > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: 'Image is too large (max 8MB)' }, { status: 400 });
    }

    const dataUrl = `data:${mimeType};base64,${base64}`;

    // 1) Multimodal LLM (when configured), 2) real pixel-level analysis
    let parsed = await analyzeWithAI(dataUrl);
    let source: 'ai' | 'pixel' = 'ai';
    if (!parsed) {
      source = 'pixel';
      parsed = (await analyzeChartPixels(imageBuffer)) as VisionAnalysis | null;
    }

    if (!parsed) {
      // Not detectable as a candlestick chart - honest result, not a 500
      parsed = sanitize({
        patterns: [],
        trend: 'SIDEWAYS',
        trendStrength: 'WEAK',
        volumeAnalysis: 'No candlestick structure was detected in this image.',
        candlestickPatterns: [],
        overallBias: 'NEUTRAL',
        entrySuggestion: 'Upload a clearer candlestick chart screenshot (TradingView, Zerodha, Groww etc.) for a full analysis.',
        exitSuggestion: 'No chart structure detected to derive exits from.',
        riskAssessment: 'MEDIUM',
        confidence: 25,
      });
      const analysisText =
        'Could not detect candlestick structure in this image.\n\n' +
        'Tips for best results:\n' +
        '• Screenshot the chart area itself (green/red candles visible)\n' +
        '• Use PNG or JPG at a reasonable resolution\n' +
        '• Daily or hourly timeframes work best';
      return NextResponse.json({ success: true, analysis: analysisText, parsed });
    }

    const analysisText = buildReadableSummary(parsed, source);

    // Save analysis (non-fatal)
    try {
      const { db } = await import('@/lib/db');
      const { getCurrentUserId } = await import('@/lib/current-user');
      const authorId = await getCurrentUserId();
      await db.analysisRecord.create({
        data: {
          symbol: 'CHART_UPLOAD',
          analysisType: 'VISION',
          agentResults: JSON.stringify(parsed).slice(0, 10000),
          finalDecision: parsed.overallBias === 'BULLISH' ? 'BUY' : parsed.overallBias === 'BEARISH' ? 'SELL' : 'WAIT',
          confidence: (parsed.confidence as number) ?? 50,
          reasoning: analysisText.slice(0, 5000) || 'Chart analysis via Vision AI',
          inputData: JSON.stringify({ source: `chart_upload_${source}` }),
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
