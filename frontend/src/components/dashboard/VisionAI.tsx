'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTradingStore } from '@/store/trading-store';
import {
  Upload, Eye, Loader2, Image as ImageIcon, X, ZoomIn,
  CheckCircle2, AlertTriangle, Info, BarChart3, TrendingUp, TrendingDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { motionVariants } from '@/lib/motion-variants';
import { Skeleton, SkeletonText } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';

/**
 * Draws a realistic sample candlestick chart on a canvas so the
 * "Try Sample" button always produces real image data to analyze.
 */
function generateSampleChart(): string {
  const w = 800;
  const h = 480;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  // Background
  ctx.fillStyle = '#0b0f14';
  ctx.fillRect(0, 0, w, h);

  // Grid
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 1;
  for (let y = 40; y < h - 80; y += 45) {
    ctx.beginPath();
    ctx.moveTo(50, y);
    ctx.lineTo(w - 20, y);
    ctx.stroke();
  }

  // Title + axis labels
  ctx.fillStyle = '#e2e8f0';
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText('NIFTY 50 — Daily', 50, 26);
  ctx.font = '11px sans-serif';
  ctx.fillStyle = '#94a3b8';
  const priceTop = 22600;
  for (let i = 0; i <= 6; i++) {
    ctx.fillText(String(priceTop - i * 150), 6, 44 + i * 45);
  }

  // Deterministic uptrend with a pullback (cup-ish shape)
  let price = 21800;
  const candles = 36;
  const cw = (w - 90) / candles;
  const toY = (pr: number) => 40 + ((priceTop - pr) / 900) * (h - 130);

  for (let i = 0; i < candles; i++) {
    const phase = i / candles;
    const drift = phase < 0.3 ? -14 : phase < 0.55 ? 6 : 22;
    const noise = Math.sin(i * 2.7) * 28 + Math.cos(i * 1.3) * 18;
    const open = price;
    const close = price + drift + noise;
    const high = Math.max(open, close) + 20 + Math.abs(Math.sin(i * 3.1)) * 25;
    const low = Math.min(open, close) - 20 - Math.abs(Math.cos(i * 2.2)) * 25;
    price = close;

    const x = 55 + i * cw + cw / 2;
    const up = close >= open;
    ctx.strokeStyle = up ? '#34d399' : '#f87171';
    ctx.fillStyle = up ? '#34d399' : '#f87171';

    // Wick
    ctx.beginPath();
    ctx.moveTo(x, toY(high));
    ctx.lineTo(x, toY(low));
    ctx.stroke();

    // Body
    const bodyTop = toY(Math.max(open, close));
    const bodyH = Math.max(2, Math.abs(toY(open) - toY(close)));
    ctx.fillRect(x - cw * 0.3, bodyTop, cw * 0.6, bodyH);

    // Volume bars
    const vol = 20 + Math.abs(noise) * 0.9 + (phase > 0.55 ? 18 : 0);
    ctx.fillStyle = up ? 'rgba(52,211,153,0.45)' : 'rgba(248,113,113,0.45)';
    ctx.fillRect(x - cw * 0.3, h - 25 - vol, cw * 0.6, vol);
  }

  // Support / resistance lines
  ctx.setLineDash([6, 4]);
  ctx.strokeStyle = 'rgba(96,165,250,0.7)';
  ctx.beginPath();
  ctx.moveTo(50, toY(21750));
  ctx.lineTo(w - 20, toY(21750));
  ctx.stroke();
  ctx.strokeStyle = 'rgba(251,191,36,0.7)';
  ctx.beginPath();
  ctx.moveTo(50, toY(22450));
  ctx.lineTo(w - 20, toY(22450));
  ctx.stroke();
  ctx.setLineDash([]);

  return canvas.toDataURL('image/png');
}

export function VisionAI() {
  const { visionLoading, setVisionLoading, visionResult, setVisionResult } = useTradingStore();
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string>('');
  const [mimeType, setMimeType] = useState('image/png');
  const [analysisStage, setAnalysisStage] = useState<'idle' | 'uploading' | 'processing' | 'analyzing' | 'complete' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [analysisDetails, setAnalysisDetails] = useState<{
    pattern: string;
    trend: string;
    supportResistance: string;
    volume: string;
    recommendation: string;
    confidence: number;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [analysisHistory, setAnalysisHistory] = useState<Array<{
    id: number;
    timestamp: number;
    preview: string | null;
    result: string;
  }>>([]);

  // Auto-clear status banners
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError(null);
        setSuccess(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  useEffect(() => {
    if (visionLoading && analysisStage !== 'processing') {
      setAnalysisStage('processing');
    } else if (!visionLoading && analysisStage === 'processing') {
      setAnalysisStage('analyzing');
    }
  }, [visionLoading]);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setError('Please upload a valid image file (JPG, PNG, WebP)');
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB');
      return;
    }

    setMimeType(file.type);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setImagePreview(dataUrl);
      setImageBase64(dataUrl.split(',')[1]);
      setVisionResult(null);
      setAnalysisDetails(null);
      setAnalysisStage('uploading');
    };
    reader.onerror = () => {
      setError('Failed to read image file');
    };
    reader.readAsDataURL(file);
  }, []);

  const handleAnalyze = useCallback(async () => {
    if (!imageBase64) {
      setError('Please upload an image first');
      return;
    }

    setError(null);
    setVisionLoading(true);
    setAnalysisStage('analyzing');
    setVisionResult(null);

    try {
      const res = await fetch('/api/vision/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64, mimeType }),
      });

      if (!res.ok) {
        throw new Error(`Analysis failed: ${res.status}`);
      }

      const data = await res.json();

      if (data.success) {
        setVisionResult(data.analysis);

        // Build the breakdown from the model's actual analysis
        const parsed = data.parsed || null;
        const supportLevels = (parsed?.support || []).map((sp: any) => `₹${sp.level}`).join(', ');
        const resistanceLevels = (parsed?.resistance || []).map((r: any) => `₹${r.level}`).join(', ');
        setAnalysisDetails({
          pattern: parsed?.patterns?.length
            ? parsed.patterns.map((pt: any) => pt.name).join(', ')
            : 'No clear pattern detected',
          trend: parsed?.trend
            ? `${parsed.trend}${parsed.trendStrength ? ` (${parsed.trendStrength})` : ''}`
            : 'Trend unclear',
          supportResistance: supportLevels || resistanceLevels
            ? `Support: ${supportLevels || 'n/a'} · Resistance: ${resistanceLevels || 'n/a'}`
            : 'No clear levels identified',
          volume: parsed?.volumeAnalysis || 'Volume data not visible in chart',
          recommendation: parsed?.entrySuggestion || 'See full analysis below',
          confidence: typeof parsed?.confidence === 'number'
            ? parsed.confidence
            : (parsed?.patterns?.[0]?.confidence ?? 50),
        });
        setAnalysisStage('complete');

        // Add to history (keep last 10)
        setAnalysisHistory(prev => [
          ...prev,
          {
            id: Date.now(),
            timestamp: Date.now(),
            preview: imagePreview,
            result: data.analysis
          }
        ].slice(-10));

        setSuccess('Chart analysis completed successfully!');
      } else {
        throw new Error(data.error || 'Analysis failed');
      }
    } catch (e: any) {
      setError(e.message || 'Analysis failed. Please try again with a clearer chart image.');
      setAnalysisStage('error');
    } finally {
      setVisionLoading(false);
    }
  }, [imageBase64, mimeType]);

  const clearImage = () => {
    setImagePreview(null);
    setImageBase64('');
    setVisionResult(null);
    setAnalysisDetails(null);
    setAnalysisStage('idle');
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const downloadResult = () => {
    if (!visionResult) return;
    const blob = new Blob([visionResult], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chart-analysis-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    setSuccess('Analysis downloaded successfully!');
  };

  return (
    <div className="space-y-6">
      {/* Status Indicators */}
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Success Message */}
      {success && (
        <Alert variant="success" className="mb-4">
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {/* Upload Area */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3 pt-4 px-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Eye className="w-4 h-4 text-violet-400" />
            Chart Vision AI
            <span className="text-[10px] text-muted-foreground font-normal ml-2">Powered by AMD Ryzen AI NPU</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <AnimatePresence mode="wait">
            {!imagePreview ? (
              <motion.div
                key="upload"
                variants={motionVariants.pop3d}
                whileHover="hover"
                whileTap="tap"
                className="border-2 border-dashed border-border rounded-xl p-12 text-center hover:border-primary/40 transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm font-medium text-foreground">Upload Chart Screenshot</p>
                <p className="text-xs text-muted-foreground mt-1">From any platform — TradingView, Zerodha, Groww, etc.</p>
                <p className="text-[10px] text-muted-foreground mt-3">Supports PNG, JPG, WebP</p>
                <div className="flex items-center gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      // Generate a sample candlestick chart locally so the demo
                      // always has real image data to analyze
                      const dataUrl = generateSampleChart();
                      setImagePreview(dataUrl);
                      setImageBase64(dataUrl.split(',')[1]);
                      setMimeType('image/png');
                      setVisionResult(null);
                      setAnalysisDetails(null);
                      setAnalysisStage('uploading');
                    }}
                    className="text-[10px] px-3 py-1"
                  >
                    Try Sample
                  </Button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </motion.div>
            ) : (
              <motion.div
                key="preview"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                variants={motionVariants.tilt}
                whileHover="hover"
                whileTap="tap"
                className="relative rounded-xl overflow-hidden border border-border"
              >
                <div className="relative rounded-xl overflow-hidden border border-border">
                  <img src={imagePreview} alt="Chart" className="w-full max-h-80 object-contain bg-muted/20" />
                  <button
                    onClick={clearImage}
                    className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/60 px-2 py-1 rounded">
                    <ZoomIn className="w-3 h-3 text-white" />
                    <span className="text-[10px] text-white">Chart uploaded</span>
                  </div>
                  {/* Image analysis visualization */}
                  {(analysisStage === 'processing' || analysisStage === 'analyzing') && (
                    <div className="absolute top-0 left-0 right-0 bottom-0 bg-black/50 flex flex-col items-center justify-center">
                      <div className="space-y-4">
                        <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center animate-pulse">
                          <Loader2 className="w-8 h-8 text-primary" />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {analysisStage === 'processing' ? 'Processing image...' : 'Analyzing chart patterns...'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex justify-center mt-4">
                  <motion.div
                    variants={motionVariants.pop3d}
                    whileHover="hover"
                    whileTap="tap"
                  >
                    <Button
                      onClick={handleAnalyze}
                      disabled={visionLoading || analysisStage === 'processing' || analysisStage === 'analyzing'}
                      className="bg-violet-500 hover:bg-violet-600 text-white px-8 py-2"
                    >
                      {visionLoading || analysisStage === 'processing' || analysisStage === 'analyzing' ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Analyzing Chart...
                        </>
                      ) : (
                        <>
                          <Eye className="w-4 h-4 mr-2" />
                          Analyze with Vision AI
                        </>
                      )}
                    </Button>
                  </motion.div>
                  <Button
                    onClick={downloadResult}
                    disabled={!visionResult}
                    className="ml-4 btn btn-outline"
                  >
                    Download Analysis
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>

      {/* Analysis Pipeline */}
      {(visionLoading || analysisStage === 'processing' || analysisStage === 'analyzing') && (
        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <div className="space-y-3">
              {[
                { label: 'Preprocessing Image', icon: ImageIcon, stage: 'uploading' },
                { label: 'Detecting Chart Patterns', icon: Eye, stage: 'processing' },
                { label: 'Analyzing Trends', icon: TrendingUp, stage: 'analyzing' },
                { label: 'Identifying Support/Resistance', icon: BarChart3, stage: 'analyzing' },
                { label: 'Volume Analysis', icon: ImageIcon, stage: 'analyzing' },
                { label: 'Generating Recommendation', icon: CheckCircle2, stage: 'analyzing' },
              ].map((step, i) => (
                <motion.div
                  key={step.label}
                  initial={{
                    opacity: 0,
                    x: -10,
                    scale: 0.9,
                    rotateY: motionVariants.flipY.hidden.rotateY
                  }}
                  animate={{
                    opacity: (analysisStage === step.stage || (analysisStage === 'analyzing' && i >= 2) || (analysisStage === 'complete')) ? 1 : 0,
                    x: 0,
                    scale: 1,
                    rotateY: motionVariants.flipY.visible.rotateY
                  }}
                  transition={{
                    delay: i * 0.2,
                    duration: 0.5,
                    type: "spring",
                    stiffness: 300,
                    damping: 20
                  }}
                  className="flex items-center gap-3"
                >
                  <div className="w-8 h-8 rounded-lg bg-violet-400/10 flex items-center justify-center">
                    <step.icon className="w-4 h-4 text-violet-400" />
                  </div>
                  <span className="text-xs text-muted-foreground">{step.label}</span>
                  {(['processing', 'analyzing'].includes(analysisStage) || analysisStage === 'complete') && (
                    <>
                      {i < 2 && analysisStage === 'uploading' && <Loader2 className="w-3 h-3 text-muted-foreground animate-spin ml-auto" />}
                      {i >= 2 && analysisStage === 'analyzing' && <Loader2 className="w-3 h-3 text-muted-foreground animate-spin ml-auto" />}
                      {analysisStage === 'complete' && <CheckCircle2 className="w-3 h-3 text-violet-400 ml-auto" />}
                    </>
                  )}
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detailed Analysis Breakdown */}
      {analysisDetails && analysisStage === 'complete' && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-3 pt-4 px-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Info className="w-4 h-4 text-primary" />
              Analysis Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-muted/20 p-3 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Pattern Detected</p>
                  <p className="text-sm font-medium text-foreground">{analysisDetails.pattern}</p>
                </div>
                <div className="bg-muted/20 p-3 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Trend Analysis</p>
                  <p className="text-sm font-medium text-foreground">{analysisDetails.trend}</p>
                </div>
                <div className="bg-muted/20 p-3 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Support/Resistance</p>
                  <p className="text-sm font-medium text-foreground">{analysisDetails.supportResistance}</p>
                </div>
                <div className="bg-muted/20 p-3 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Volume Analysis</p>
                  <p className="text-sm font-medium text-foreground">{analysisDetails.volume}</p>
                </div>
                <div className="bg-muted/20 p-3 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Recommendation</p>
                  <p className="text-sm font-medium text-foreground">{analysisDetails.recommendation}</p>
                </div>
                <div className="bg-muted/20 p-3 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Confidence Score</p>
                  <div className="flex items-center">
                    <div className="w-10 h-2 bg-muted rounded-full overflow-hidden">
                      <div className={cn('h-full', analysisDetails.confidence >= 80 ? 'bg-emerald-400' : analysisDetails.confidence >= 60 ? 'bg-amber-400' : 'bg-red-400')} style={{ width: `${analysisDetails.confidence}%` }}></div>
                    </div>
                    <span className="ml-2 text-xs font-medium">{analysisDetails.confidence}%</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Vision Result */}
      {visionResult && !visionLoading && analysisStage === 'complete' && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-3 pt-4 px-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Eye className="w-4 h-4 text-violet-400" />
              Vision Analysis Result
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="prose prose-invert prose-sm max-w-none">
              <div className="space-y-4">
                <div className="bg-muted/20 p-4 rounded-lg">
                  <p className="text-[10px] text-muted-foreground mb-2">Technical Analysis Summary</p>
                  <pre className="whitespace-pre-wrap text-xs text-foreground leading-relaxed">{visionResult}</pre>
                </div>
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setVisionResult('');
                      setAnalysisDetails(null);
                      setAnalysisStage('idle');
                    }}
                  >
                    Clear Result
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Analysis History */}
      {analysisHistory.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-3 pt-4 px-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Info className="w-4 h-4 text-primary" />
              Recent Analyses
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="space-y-3">
              {analysisHistory.slice().reverse().map((item, index) => (
                <div key={item.id} className="p-3 bg-muted/20 rounded-lg border border-border/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-muted-foreground">Analysis #{item.id}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(item.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  {item.preview && (
                    <div className="mt-2">
                      <img src={item.preview} alt="Chart preview" className="w-full h-24 object-cover rounded" />
                    </div>
                  )}
                  <p className="text-xs text-foreground mt-2 line-clamp-2">{item.result}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}