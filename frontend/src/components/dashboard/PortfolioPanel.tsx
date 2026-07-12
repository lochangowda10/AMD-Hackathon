'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import {
  Briefcase, TrendingUp, TrendingDown, PieChart, AlertTriangle,
  CheckCircle2, Heart, Activity, Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  PieChart as RPieChart, Pie, Cell, ResponsiveContainer, Tooltip,
} from 'recharts';

interface Holding {
  id: string;
  symbol: string;
  name: string;
  sector: string;
  quantity: number;
  avgPrice: number;
  currentPrice: number;
  investedAmount: number;
  currentValue: number;
  pnl: number;
  pnlPercent: number;
  weight: number;
}

interface HealthData {
  diversificationScore: number;
  riskLevel: string;
  overallHealth: string;
  suggestions: string[];
  correlationConcerns: string[];
  sectorConcentration: number;
  cashAllocation: number;
  holdingCount: number;
  sectorCount: number;
  sectorAllocation: { sector: string; value: number; percentage: number }[];
}

const SECTOR_COLORS = ['#34d399', '#fbbf24', '#f87171', '#a78bfa', '#22d3ee', '#fb923c', '#f472b6', '#84cc16'];

export function PortfolioPanel() {
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [summary, setSummary] = useState<{ totalInvested: number; totalCurrent: number; totalPnl: number; pnlPercent: number } | null>(null);
  const [health, setHealth] = useState<HealthData | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);

  const fetchHealth = () => {
    setHealthLoading(true);
    fetch('/api/portfolio/health').then(r => r.json()).then(d => {
      if (d.success) setHealth(d.data);
    }).catch(() => {}).finally(() => setHealthLoading(false));
  };

  useEffect(() => {
    fetch('/api/portfolio').then(r => r.json()).then(d => {
      if (d.success) {
        setHoldings(d.data.holdings);
        setSummary(d.data.summary);
      }
    }).catch(() => {});
  }, []);

  const healthColor = health?.overallHealth === 'EXCELLENT' || health?.overallHealth === 'GOOD'
    ? 'text-emerald-400' : health?.overallHealth === 'FAIR' ? 'text-amber-400' : 'text-red-400';
  const riskColor = health?.riskLevel === 'LOW' ? 'text-emerald-400' : health?.riskLevel === 'MEDIUM' ? 'text-amber-400' : 'text-red-400';

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <p className="text-[10px] text-muted-foreground">Total Invested</p>
              <p className="text-lg font-bold mt-1">₹{summary.totalInvested.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <p className="text-[10px] text-muted-foreground">Current Value</p>
              <p className="text-lg font-bold mt-1">₹{summary.totalCurrent.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <p className="text-[10px] text-muted-foreground">Total P&L</p>
              <p className={cn('text-lg font-bold mt-1', summary.totalPnl >= 0 ? 'text-profit' : 'text-loss')}>
                {summary.totalPnl >= 0 ? '+' : ''}₹{summary.totalPnl.toLocaleString()}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <p className="text-[10px] text-muted-foreground">Return</p>
              <p className={cn('text-lg font-bold mt-1', summary.pnlPercent >= 0 ? 'text-profit' : 'text-loss')}>
                {summary.pnlPercent >= 0 ? '+' : ''}{summary.pnlPercent}%
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Holdings Table */}
        <Card className="bg-card border-border lg:col-span-2">
          <CardHeader className="pb-3 pt-4 px-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-primary" /> Holdings
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="max-h-96 overflow-y-auto custom-scrollbar">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left text-[10px] text-muted-foreground font-medium pb-2">Symbol</th>
                    <th className="text-right text-[10px] text-muted-foreground font-medium pb-2">Qty</th>
                    <th className="text-right text-[10px] text-muted-foreground font-medium pb-2">Avg Price</th>
                    <th className="text-right text-[10px] text-muted-foreground font-medium pb-2">Current</th>
                    <th className="text-right text-[10px] text-muted-foreground font-medium pb-2">P&L</th>
                  </tr>
                </thead>
                <tbody>
                  {holdings.map((h) => (
                    <tr key={h.id} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                      <td className="py-2.5">
                        <div>
                          <p className="text-xs font-medium">{h.symbol}</p>
                          <p className="text-[10px] text-muted-foreground">{h.sector}</p>
                        </div>
                      </td>
                      <td className="text-right text-xs">{h.quantity}</td>
                      <td className="text-right text-xs">₹{h.avgPrice.toLocaleString()}</td>
                      <td className="text-right text-xs">₹{h.currentPrice.toLocaleString()}</td>
                      <td className="text-right">
                        <span className={cn('text-xs font-medium', h.pnl >= 0 ? 'text-profit' : 'text-loss')}>
                          {h.pnl >= 0 ? '+' : ''}₹{h.pnl.toLocaleString()}
                          <span className="text-[10px] ml-1">({h.pnlPercent}%)</span>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Portfolio Health */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3 pt-4 px-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Heart className="w-4 h-4 text-pink-400" /> Health
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={fetchHealth} disabled={healthLoading} className="h-6 text-[10px]">
                {healthLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Activity className="w-3 h-3" />}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-4">
            {health ? (
              <>
                <div className="text-center p-3 rounded-lg bg-muted/20">
                  <p className={cn('text-3xl font-black', healthColor)}>{health.diversificationScore}</p>
                  <p className="text-[10px] text-muted-foreground">Diversification Score</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="text-center p-2 rounded-lg bg-muted/20">
                    <p className={cn('text-sm font-bold', riskColor)}>{health.riskLevel}</p>
                    <p className="text-[10px] text-muted-foreground">Risk</p>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-muted/20">
                    <p className="text-sm font-bold">{health.holdingCount}</p>
                    <p className="text-[10px] text-muted-foreground">Holdings</p>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground mb-2 flex items-center gap-1">
                    <PieChart className="w-3 h-3" /> Sector Allocation
                  </p>
                  <div className="space-y-1.5">
                    {health.sectorAllocation.slice(0, 4).map((s, i) => (
                      <div key={s.sector}>
                        <div className="flex justify-between text-[10px] mb-0.5">
                          <span className="text-muted-foreground">{s.sector}</span>
                          <span className="text-foreground">{s.percentage}%</span>
                        </div>
                        <Progress value={s.percentage} className="h-1" />
                      </div>
                    ))}
                  </div>
                </div>
                {health.suggestions.length > 0 && (
                  <div>
                    <p className="text-[10px] text-primary font-semibold mb-1 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Suggestions
                    </p>
                    <div className="space-y-1">
                      {health.suggestions.slice(0, 3).map((s, i) => (
                        <p key={i} className="text-[10px] text-muted-foreground">• {s}</p>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8">
                <Loader2 className="w-5 h-5 text-muted-foreground animate-spin mx-auto" />
                <p className="text-xs text-muted-foreground mt-2">Analyzing portfolio...</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}