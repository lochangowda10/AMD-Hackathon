'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { useTradingStore, type SimulationResult } from '@/store/trading-store';
import { Badge } from '@/components/ui/badge';
import {
  FlaskConical, Loader2, TrendingUp, TrendingDown, AlertTriangle,
  DollarSign, BarChart3, Target, Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';

export function TradeSimulator() {
  const { simLoading, setSimLoading, simResult, setSimResult } = useTradingStore();
  const [params, setParams] = useState({
    capital: 50000,
    riskPercent: 2,
    tradeCount: 50,
    winRate: 65,
    rewardToRisk: 3,
  });

  const runSimulation = async () => {
    setSimLoading(true);
    try {
      const res = await fetch('/api/agents/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      const data = await res.json();
      if (data.success) setSimResult(data.data);
    } catch (e) { /* handle */ }
    setSimLoading(false);
  };

  const updateParam = (key: string, value: number) => {
    setParams(prev => ({ ...prev, [key]: value }));
  };

  const statCards = simResult ? [
    { label: 'Expected Profit', value: `₹${simResult.expectedProfit.toLocaleString()}`, icon: TrendingUp, color: simResult.expectedProfit >= 0 ? 'text-emerald-400' : 'text-red-400', bg: simResult.expectedProfit >= 0 ? 'bg-emerald-400/10' : 'bg-red-400/10' },
    { label: 'Best Case (P95)', value: `₹${simResult.bestCase.toLocaleString()}`, icon: Target, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
    { label: 'Worst Case (P5)', value: `₹${simResult.worstCase.toLocaleString()}`, icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-400/10' },
    { label: 'Max Drawdown', value: `${simResult.maxDrawdown}%`, icon: Shield, color: 'text-amber-400', bg: 'bg-amber-400/10' },
    { label: 'Expected CAGR', value: `${simResult.expectedCAGR}%`, icon: BarChart3, color: 'text-cyan-400', bg: 'bg-cyan-400/10' },
    { label: 'Risk of Ruin', value: `${simResult.riskOfRuin}%`, icon: AlertTriangle, color: simResult.riskOfRuin > 5 ? 'text-red-400' : 'text-emerald-400', bg: simResult.riskOfRuin > 5 ? 'bg-red-400/10' : 'bg-emerald-400/10' },
  ] : [];

  return (
    <div className="space-y-6">
      {/* Parameters */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3 pt-4 px-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <FlaskConical className="w-4 h-4 text-cyan-400" />
            Monte Carlo Simulation Parameters
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <DollarSign className="w-3 h-3" /> Capital (₹)
              </Label>
              <Input
                type="number"
                value={params.capital}
                onChange={(e) => updateParam('capital', Number(e.target.value))}
                className="bg-muted/30 border-border text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Risk per Trade (%)</Label>
              <Slider
                value={[params.riskPercent]}
                onValueChange={([v]) => updateParam('riskPercent', v)}
                min={0.5}
                max={10}
                step={0.5}
                className="mt-2"
              />
              <p className="text-xs text-center font-mono text-foreground">{params.riskPercent}%</p>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Number of Trades</Label>
              <Input
                type="number"
                value={params.tradeCount}
                onChange={(e) => updateParam('tradeCount', Number(e.target.value))}
                className="bg-muted/30 border-border text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Win Rate (%)</Label>
              <Slider
                value={[params.winRate]}
                onValueChange={([v]) => updateParam('winRate', v)}
                min={10}
                max={90}
                step={5}
                className="mt-2"
              />
              <p className="text-xs text-center font-mono text-foreground">{params.winRate}%</p>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Reward : Risk Ratio</Label>
              <Slider
                value={[params.rewardToRisk]}
                onValueChange={([v]) => updateParam('rewardToRisk', v)}
                min={0.5}
                max={10}
                step={0.5}
                className="mt-2"
              />
              <p className="text-xs text-center font-mono text-foreground">{params.rewardToRisk} : 1</p>
            </div>
            <div className="flex items-end">
              <Button
                onClick={runSimulation}
                disabled={simLoading}
                className="w-full bg-cyan-500 hover:bg-cyan-600 text-white"
              >
                {simLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FlaskConical className="w-4 h-4 mr-2" />}
                {simLoading ? 'Simulating 10,000 paths...' : 'Run Simulation'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {simResult && !simLoading && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          {/* Stat Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {statCards.map((stat) => (
              <Card key={stat.label} className="bg-card border-border">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center', stat.bg)}>
                      <stat.icon className={cn('w-3.5 h-3.5', stat.color)} />
                    </div>
                    <span className="text-[10px] text-muted-foreground">{stat.label}</span>
                  </div>
                  <p className={cn('text-lg font-bold', stat.color)}>{stat.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Probability Distribution */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-3 pt-4 px-4">
              <CardTitle className="text-sm font-semibold">Probability Distribution (10,000 Simulations)</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={simResult.distribution}>
                    <XAxis
                      dataKey="profit"
                      tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                      tick={{ fontSize: 10, fill: 'oklch(0.65 0 0)' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tickFormatter={(v) => `${v}%`}
                      tick={{ fontSize: 10, fill: 'oklch(0.65 0 0)' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      formatter={(value: number) => [`${value}%`, 'Probability']}
                      labelFormatter={(label) => `Profit: ₹${Number(label).toLocaleString()}`}
                      contentStyle={{ background: 'oklch(0.18 0 0)', border: '1px solid oklch(0.28 0 0)', borderRadius: '8px', fontSize: '12px' }}
                    />
                    <Bar dataKey="probability" radius={[2, 2, 0, 0]}>
                      {simResult.distribution.map((entry, index) => (
                        <Cell key={index} fill={entry.profit >= 0 ? 'oklch(0.72 0.19 163)' : 'oklch(0.65 0.22 25)'} fillOpacity={0.8} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Expected Edge */}
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Expected Edge per Trade</p>
                  <p className={cn('text-xl font-bold mt-1',
                    params.winRate / 100 * params.rewardToRisk - (1 - params.winRate / 100) > 0
                      ? 'text-emerald-400' : 'text-red-400'
                  )}>
                    ₹{Math.round(params.capital * (params.riskPercent / 100) * (
                      params.winRate / 100 * params.rewardToRisk - (1 - params.winRate / 100)
                    )).toLocaleString()}
                  </p>
                </div>
                <Badge variant="outline" className={cn(
                  params.winRate / 100 * params.rewardToRisk - (1 - params.winRate / 100) > 0
                    ? 'border-emerald-400/40 text-emerald-400' : 'border-red-400/40 text-red-400'
                )}>
                  {params.winRate / 100 * params.rewardToRisk - (1 - params.winRate / 100) > 0 ? 'POSITIVE EDGE' : 'NEGATIVE EDGE'}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}