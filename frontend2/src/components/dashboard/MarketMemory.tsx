'use client';

import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Database, Search, Loader2, TrendingUp, AlertTriangle,
  Lightbulb, History, Award,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface MemoryData {
  symbol: string;
  tradeCount: number;
  winRate: number;
  avgHoldingDays: number | null;
  avgGain: number | null;
  avgLoss: number | null;
  commonMistake: string | null;
  suggestion: string | null;
  patterns: string[] | null;
  recentTrades: any[];
}

export function MarketMemory() {
  const [symbol, setSymbol] = useState('INFOSYS');
  const [memory, setMemory] = useState<MemoryData | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchMemory = useCallback(async (sym: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/market-memory?symbol=${sym}`);
      const data = await res.json();
      if (data.success) setMemory(data.data);
    } catch (e) { /* handle */ }
    setLoading(false);
  }, []);

  const handleSearch = () => {
    if (symbol.trim()) fetchMemory(symbol.trim().toUpperCase());
  };

  return (
    <div className="space-y-6">
      {/* Search */}
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <Input
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Enter symbol (e.g. INFOSYS, TCS, RELIANCE)"
              className="w-64 text-sm bg-muted/30 border-border"
            />
            <Button onClick={handleSearch} disabled={loading} className="bg-primary text-primary-foreground px-6">
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
              Recall
            </Button>
          </div>
          <div className="flex gap-2 mt-3">
            {['INFOSYS', 'TCS', 'RELIANCE'].map(s => (
              <button
                key={s}
                onClick={() => { setSymbol(s); fetchMemory(s); }}
                className="text-[10px] px-2 py-1 rounded-full bg-muted/30 border border-border/50 text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {loading && (
        <Card className="bg-card border-border">
          <CardContent className="p-8 flex items-center justify-center gap-3">
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
            <span className="text-sm text-muted-foreground">Searching memory...</span>
          </CardContent>
        </Card>
      )}

      {memory && !loading && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          {/* Stats Row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Card className="bg-card border-border">
              <CardContent className="p-4 text-center">
                <History className="w-5 h-5 text-primary mx-auto mb-1" />
                <p className="text-2xl font-bold">{memory.tradeCount}</p>
                <p className="text-[10px] text-muted-foreground">Total Trades</p>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="p-4 text-center">
                <Award className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
                <p className="text-2xl font-bold text-emerald-400">{memory.winRate}%</p>
                <p className="text-[10px] text-muted-foreground">Win Rate</p>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="p-4 text-center">
                <TrendingUp className="w-5 h-5 text-cyan-400 mx-auto mb-1" />
                <p className="text-2xl font-bold">{memory.avgHoldingDays || '—'}</p>
                <p className="text-[10px] text-muted-foreground">Avg Holding Days</p>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="p-4 text-center">
                <TrendingUp className="w-5 h-5 text-amber-400 mx-auto mb-1" />
                <p className="text-2xl font-bold">{memory.avgGain ? `${memory.avgGain}%` : '—'}</p>
                <p className="text-[10px] text-muted-foreground">Avg Gain</p>
              </CardContent>
            </Card>
          </div>

          {/* Insights */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="bg-card border-border">
              <CardHeader className="pb-2 pt-3 px-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-400" /> Common Mistake
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <p className="text-xs text-foreground leading-relaxed">{memory.commonMistake || 'Not enough data to identify patterns'}</p>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardHeader className="pb-2 pt-3 px-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-amber-400" /> AI Suggestion
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <p className="text-xs text-foreground leading-relaxed">{memory.suggestion || 'Continue trading to build pattern recognition'}</p>
              </CardContent>
            </Card>
          </div>

          {/* Detected Patterns */}
          {memory.patterns && memory.patterns.length > 0 && (
            <Card className="bg-card border-border">
              <CardHeader className="pb-2 pt-3 px-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Database className="w-4 h-4 text-primary" /> Detected Patterns
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="space-y-2">
                  {memory.patterns.map((p, i) => (
                    <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-muted/20">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                      <p className="text-xs text-foreground">{p}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Trades */}
          {memory.recentTrades && memory.recentTrades.length > 0 && (
            <Card className="bg-card border-border">
              <CardHeader className="pb-2 pt-3 px-4">
                <CardTitle className="text-sm font-semibold">Recent Trades</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="space-y-2">
                  {memory.recentTrades.map((t: any) => (
                    <div key={t.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/20">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={cn(
                          'text-[10px]',
                          t.direction === 'BUY' && 'border-emerald-400/40 text-emerald-400',
                          t.direction === 'SELL' && 'border-red-400/40 text-red-400',
                        )}>{t.direction}</Badge>
                        <span className="text-xs">₹{t.entryPrice}</span>
                      </div>
                      <div className="text-right">
                        <span className={cn('text-xs', (t.pnl || 0) >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                          {t.status === 'CLOSED' ? `₹${t.pnl}` : 'Open'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </motion.div>
      )}
    </div>
  );
}