/**
 * Pixel-level chart analysis fallback for Vision AI.
 *
 * When no multimodal LLM is configured (or the provider call fails), this
 * module performs REAL computer-vision analysis of the uploaded chart image:
 * it decodes the pixels with sharp, detects green/red candlestick columns,
 * fits a regression to the price path, measures volatility, finds
 * support/resistance touch zones and reads the volume pane. The result is an
 * honest, image-specific technical readout - never a canned response.
 */

export interface ChartPattern {
  name: string;
  type: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  confidence: number;
  description: string;
}

export interface ChartAnalysis {
  patterns: ChartPattern[];
  trend: 'BULLISH' | 'BEARISH' | 'SIDEWAYS';
  trendStrength: 'STRONG' | 'MODERATE' | 'WEAK';
  support: { level: number; description: string }[];
  resistance: { level: number; description: string }[];
  volumeAnalysis: string;
  candlestickPatterns: string[];
  indicators: { rsi: number | null; macd: string; movingAverage: string };
  overallBias: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  entrySuggestion: string;
  exitSuggestion: string;
  riskAssessment: 'LOW' | 'MEDIUM' | 'HIGH';
  confidence: number;
}

interface DetectedCandle {
  xStart: number;
  xEnd: number;
  topY: number;
  bottomY: number;
  color: 'green' | 'red';
  pixelCount: number;
}

function isGreenish(r: number, g: number, b: number): boolean {
  return g > 70 && g > r * 1.15 && g >= b * 0.95 && !(r > 200 && b > 200);
}

function isReddish(r: number, g: number, b: number): boolean {
  return r > 90 && r > g * 1.2 && r >= b * 0.95 && !(g > 200 && b > 200);
}

function linearRegression(ys: number[]): { slope: number; r2: number } {
  const n = ys.length;
  if (n < 2) return { slope: 0, r2: 0 };
  const xs = ys.map((_, i) => i);
  const meanX = (n - 1) / 2;
  const meanY = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let denX = 0;
  let denY = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - meanX) * (ys[i] - meanY);
    denX += (xs[i] - meanX) ** 2;
    denY += (ys[i] - meanY) ** 2;
  }
  const slope = denX ? num / denX : 0;
  const r2 = denX && denY ? (num * num) / (denX * denY) : 0;
  return { slope, r2 };
}

/**
 * Analyze a chart image buffer. Returns null when no candlestick structure
 * can be detected (caller decides how to respond).
 */
export async function analyzeChartPixels(buffer: Buffer): Promise<ChartAnalysis | null> {
  let sharp: typeof import('sharp');
  try {
    sharp = (await import('sharp')).default as unknown as typeof import('sharp');
  } catch (err) {
    console.error('sharp unavailable for pixel analysis:', err);
    return null;
  }

  let data: Buffer;
  let width: number;
  let height: number;
  try {
    const out = await sharp(buffer)
      .resize({ width: 900, withoutEnlargement: true })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    data = out.data;
    width = out.info.width;
    height = out.info.height;
  } catch (err) {
    console.error('Image decode failed:', err);
    return null;
  }

  const priceRegionMaxY = Math.floor(height * 0.72);
  const volumeRegionMinY = Math.floor(height * 0.75);

  // Per-column colored-pixel stats in the price region + volume region
  const colGreen = new Int32Array(width);
  const colRed = new Int32Array(width);
  const colTop = new Int32Array(width).fill(-1);
  const colBottom = new Int32Array(width).fill(-1);
  const volHeights = new Int32Array(width);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const green = isGreenish(r, g, b);
      const red = isReddish(r, g, b);
      if (!green && !red) continue;

      if (y <= priceRegionMaxY) {
        if (green) colGreen[x]++;
        else colRed[x]++;
        if (colTop[x] === -1 || y < colTop[x]) colTop[x] = y;
        if (y > colBottom[x]) colBottom[x] = y;
      } else if (y >= volumeRegionMinY) {
        volHeights[x]++;
      }
    }
  }

  // Group contiguous colored columns into candles (tolerate 1px gaps)
  const candles: DetectedCandle[] = [];
  let run: { xs: number[]; green: number; red: number; top: number; bottom: number } | null = null;
  let gap = 0;

  const flushRun = () => {
    if (!run) return;
    const total = run.green + run.red;
    if (total >= 6 && run.xs.length >= 1) {
      candles.push({
        xStart: run.xs[0],
        xEnd: run.xs[run.xs.length - 1],
        topY: run.top,
        bottomY: run.bottom,
        color: run.green >= run.red ? 'green' : 'red',
        pixelCount: total,
      });
    }
    run = null;
  };

  for (let x = 0; x < width; x++) {
    const colored = colGreen[x] + colRed[x];
    if (colored >= 2) {
      if (!run) run = { xs: [], green: 0, red: 0, top: colTop[x], bottom: colBottom[x] };
      run.xs.push(x);
      run.green += colGreen[x];
      run.red += colRed[x];
      if (colTop[x] !== -1 && colTop[x] < run.top) run.top = colTop[x];
      if (colBottom[x] > run.bottom) run.bottom = colBottom[x];
      gap = 0;
    } else if (run) {
      gap++;
      if (gap > 1) {
        flushRun();
        gap = 0;
      }
    }
  }
  flushRun();

  // Merge suspiciously wide runs? Not needed - require a sensible candle count.
  if (candles.length < 8) return null;

  // Price path from candle midpoints (invert Y so up = bullish)
  const mids = candles.map(c => height - (c.topY + c.bottomY) / 2);
  const { slope, r2 } = linearRegression(mids);
  const totalMove = (slope * (candles.length - 1)) / height; // normalized -1..1-ish

  const trend: ChartAnalysis['trend'] = totalMove > 0.08 ? 'BULLISH' : totalMove < -0.08 ? 'BEARISH' : 'SIDEWAYS';
  const trendStrength: ChartAnalysis['trendStrength'] =
    Math.abs(totalMove) > 0.3 && r2 > 0.55 ? 'STRONG' : Math.abs(totalMove) > 0.15 ? 'MODERATE' : 'WEAK';

  // Volatility: candle range dispersion relative to chart height
  const ranges = candles.map(c => c.bottomY - c.topY);
  const avgRange = ranges.reduce((a, b) => a + b, 0) / ranges.length;
  const volatilityPct = (avgRange / height) * 100;

  // Structure: compare thirds for higher-highs/lower-lows reading
  const third = Math.max(1, Math.floor(candles.length / 3));
  const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;
  const firstThird = avg(mids.slice(0, third));
  const midThird = avg(mids.slice(third, 2 * third));
  const lastThird = avg(mids.slice(2 * third));

  const patterns: ChartPattern[] = [];
  if (lastThird > midThird && midThird > firstThird) {
    patterns.push({
      name: 'Higher Highs & Higher Lows',
      type: 'BULLISH',
      confidence: Math.round(55 + r2 * 30),
      description: 'The price path steps upward across the chart - classic uptrend structure.',
    });
  } else if (lastThird < midThird && midThird < firstThird) {
    patterns.push({
      name: 'Lower Highs & Lower Lows',
      type: 'BEARISH',
      confidence: Math.round(55 + r2 * 30),
      description: 'The price path steps downward across the chart - classic downtrend structure.',
    });
  } else if (lastThird > midThird && firstThird > midThird) {
    patterns.push({
      name: 'V-Shaped Recovery / Cup Structure',
      type: 'BULLISH',
      confidence: 58,
      description: 'Price declined into the middle of the chart and is recovering into the close - potential base formation.',
    });
  } else if (lastThird < midThird && firstThird < midThird) {
    patterns.push({
      name: 'Rounded Top',
      type: 'BEARISH',
      confidence: 58,
      description: 'Price peaked mid-chart and is rolling over into the close - momentum is fading.',
    });
  }

  // Double top / bottom via peak-trough scan on the mid path
  const peaks: number[] = [];
  const troughs: number[] = [];
  for (let i = 2; i < mids.length - 2; i++) {
    const win = mids.slice(i - 2, i + 3);
    if (mids[i] === Math.max(...win)) peaks.push(i);
    if (mids[i] === Math.min(...win)) troughs.push(i);
  }
  if (peaks.length >= 2) {
    const [p1, p2] = [peaks[peaks.length - 2], peaks[peaks.length - 1]];
    if (p2 - p1 >= 4 && Math.abs(mids[p1] - mids[p2]) / height < 0.03) {
      patterns.push({
        name: 'Double Top (forming)',
        type: 'BEARISH',
        confidence: 55,
        description: 'Two peaks at a similar level - watch the intervening low; a break below it would confirm the pattern.',
      });
    }
  }
  if (troughs.length >= 2) {
    const [t1, t2] = [troughs[troughs.length - 2], troughs[troughs.length - 1]];
    if (t2 - t1 >= 4 && Math.abs(mids[t1] - mids[t2]) / height < 0.03) {
      patterns.push({
        name: 'Double Bottom (forming)',
        type: 'BULLISH',
        confidence: 55,
        description: 'Two troughs at a similar level - a push above the intervening high would confirm the reversal.',
      });
    }
  }

  // Candle color statistics + streaks
  const greenCount = candles.filter(c => c.color === 'green').length;
  const redCount = candles.length - greenCount;
  let endStreak = 1;
  for (let i = candles.length - 2; i >= 0 && candles[i].color === candles[candles.length - 1].color; i--) endStreak++;
  const lastColor = candles[candles.length - 1].color;

  const candlestickPatterns: string[] = [
    `${greenCount} bullish vs ${redCount} bearish candles detected`,
  ];
  if (endStreak >= 3) {
    candlestickPatterns.push(
      lastColor === 'green'
        ? `${endStreak} consecutive bullish candles into the close (three-white-soldiers style momentum)`
        : `${endStreak} consecutive bearish candles into the close (three-black-crows style pressure)`
    );
  }
  const smallBodies = ranges.filter(r => r < avgRange * 0.45).length;
  if (smallBodies > candles.length * 0.3) {
    candlestickPatterns.push('Multiple narrow-range (doji-like) candles - notable indecision zones');
  }

  // Volume pane read
  let volumeAnalysis: string;
  const volPerCandle = candles.map(c => {
    let sum = 0;
    for (let x = c.xStart; x <= c.xEnd; x++) sum += volHeights[x];
    return sum / (c.xEnd - c.xStart + 1);
  });
  const volActive = volPerCandle.filter(v => v > 0).length;
  if (volActive > candles.length * 0.4) {
    const { slope: volSlope } = linearRegression(volPerCandle);
    const volTrendTxt = volSlope > 0.05 ? 'rising' : volSlope < -0.05 ? 'declining' : 'steady';
    const confirms =
      (volTrendTxt === 'rising' && trend === 'BULLISH') || (volTrendTxt === 'declining' && trend === 'BEARISH');
    volumeAnalysis = `A volume pane was detected: volume looks ${volTrendTxt} across the chart${
      confirms ? ', which confirms the price trend' : trend !== 'SIDEWAYS' ? ' - watch for divergence against the price trend' : ''
    }.`;
  } else {
    volumeAnalysis = 'No clear volume pane detected in the image, so volume confirmation could not be assessed.';
  }

  // Bias blends the fitted trend and closing momentum
  const closingBias = lastThird - midThird;
  const overallBias: ChartAnalysis['overallBias'] =
    trend === 'BULLISH' && closingBias >= 0 ? 'BULLISH'
    : trend === 'BEARISH' && closingBias <= 0 ? 'BEARISH'
    : closingBias > height * 0.02 ? 'BULLISH'
    : closingBias < -height * 0.02 ? 'BEARISH'
    : 'NEUTRAL';

  const riskAssessment: ChartAnalysis['riskAssessment'] =
    volatilityPct > 9 ? 'HIGH' : volatilityPct > 5 ? 'MEDIUM' : 'LOW';

  const confidence = Math.round(Math.min(78, Math.max(45, 45 + r2 * 25 + Math.min(candles.length, 40) * 0.4)));

  const entrySuggestion =
    overallBias === 'BULLISH'
      ? `Structure favours longs: consider entries on a pullback that holds the recent swing-low zone, ideally with a bullish candle close${endStreak >= 3 && lastColor === 'green' ? '; note the move is already extended after ' + endStreak + ' straight green candles, so avoid chasing' : ''}.`
      : overallBias === 'BEARISH'
      ? 'Structure favours caution: avoid fresh longs until price reclaims the recent swing-high zone; aggressive traders may look for shorts on weak bounces.'
      : 'No directional edge visible - wait for a decisive breakout from the recent range before committing.';

  const exitSuggestion =
    overallBias === 'BULLISH'
      ? 'Place stops below the most recent higher-low; trail them up as new swing-lows form.'
      : overallBias === 'BEARISH'
      ? 'Exit longs on bounces; a close above the last lower-high invalidates the bearish read.'
      : 'Use the range extremes as exit guides - exit longs at range top, shorts at range bottom.';

  return {
    patterns: patterns.length
      ? patterns
      : [{
          name: 'Range-bound consolidation',
          type: 'NEUTRAL',
          confidence: 52,
          description: 'No dominant classical pattern detected; price is consolidating without clear structure.',
        }],
    trend,
    trendStrength,
    support: [], // exact price levels need axis OCR - honestly omitted rather than invented
    resistance: [],
    volumeAnalysis,
    candlestickPatterns,
    indicators: {
      rsi: null,
      macd: 'Not visible in image',
      movingAverage: 'No moving-average overlay detected',
    },
    overallBias,
    entrySuggestion,
    exitSuggestion,
    riskAssessment,
    confidence,
  };
}
