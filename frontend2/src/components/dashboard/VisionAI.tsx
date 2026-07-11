'use client';

import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTradingStore } from '@/store/trading-store';
import {
  Upload, Eye, Loader2, Image as ImageIcon, X, ZoomIn,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export function VisionAI() {
  const { visionLoading, setVisionLoading, visionResult, setVisionResult } = useTradingStore();
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string>('');
  const [mimeType, setMimeType] = useState('image/png');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setMimeType(file.type);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setImagePreview(dataUrl);
      setImageBase64(dataUrl.split(',')[1]);
      setVisionResult(null);
    };
    reader.readAsDataURL(file);
  };

  const handleAnalyze = async () => {
    if (!imageBase64) return;
    setVisionLoading(true);
    setVisionResult(null);
    try {
      const res = await fetch('/api/vision/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64, mimeType }),
      });
      const data = await res.json();
      if (data.success) setVisionResult(data.analysis);
    } catch (e) {
      setVisionResult('Analysis failed. Please try again with a clearer chart image.');
    }
    setVisionLoading(false);
  };

  const clearImage = () => {
    setImagePreview(null);
    setImageBase64('');
    setVisionResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-6">
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
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="border-2 border-dashed border-border rounded-xl p-12 text-center hover:border-primary/40 transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm font-medium text-foreground">Upload Chart Screenshot</p>
                <p className="text-xs text-muted-foreground mt-1">From any platform — TradingView, Zerodha, Groww, etc.</p>
                <p className="text-[10px] text-muted-foreground mt-3">Supports PNG, JPG, WebP</p>
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
                </div>
                <div className="flex justify-center mt-4">
                  <Button
                    onClick={handleAnalyze}
                    disabled={visionLoading}
                    className="bg-violet-500 hover:bg-violet-600 text-white px-8"
                  >
                    {visionLoading ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analyzing Chart...</>
                    ) : (
                      <><Eye className="w-4 h-4 mr-2" /> Analyze with Vision AI</>
                    )}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>

      {/* Analysis Pipeline */}
      {visionLoading && (
        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <div className="space-y-3">
              {[
                { label: 'Preprocessing Image', icon: ImageIcon },
                { label: 'Detecting Chart Patterns', icon: Eye },
                { label: 'Analyzing Trends', icon: ImageIcon },
                { label: 'Identifying Support/Resistance', icon: ImageIcon },
                { label: 'Volume Analysis', icon: ImageIcon },
                { label: 'Generating Recommendation', icon: Eye },
              ].map((step, i) => (
                <motion.div
                  key={step.label}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.3 }}
                  className="flex items-center gap-3"
                >
                  <div className="w-8 h-8 rounded-lg bg-violet-400/10 flex items-center justify-center">
                    <step.icon className="w-4 h-4 text-violet-400" />
                  </div>
                  <span className="text-xs text-muted-foreground">{step.label}</span>
                  {i < 5 && <Loader2 className="w-3 h-3 text-muted-foreground animate-spin ml-auto" />}
                  {i === 5 && <span className="text-[10px] text-violet-400 ml-auto">Processing...</span>}
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Vision Result */}
      {visionResult && !visionLoading && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-3 pt-4 px-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Eye className="w-4 h-4 text-violet-400" />
              Vision Analysis Result
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="prose prose-invert prose-sm max-w-none">
              <pre className="whitespace-pre-wrap text-xs text-foreground leading-relaxed bg-muted/20 p-4 rounded-lg overflow-x-auto custom-scrollbar">
                {visionResult}
              </pre>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}