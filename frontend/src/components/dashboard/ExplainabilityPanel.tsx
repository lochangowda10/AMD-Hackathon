'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Lightbulb, CheckCircle2, XCircle, TrendingUp, TrendingDown, Clock,
  Shield, BarChart3, Brain, Target, Eye, Mic, Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTradingStore } from '@/store/trading-store';
import { motion } from 'framer-motion';
import { motionVariants } from '@/lib/motion-variants';

export function ExplainabilityPanel() {
  const { analysisResult, setActivePanel } = useTradingStore();
  interface AnalysisItem {
    id: string;
    agent: string;
    timestamp: Date;
    summary: string;
    score: number;
  }

  const [recentAnalyses, setRecentAnalyses] = useState<AnalysisItem[]>([]);

  useEffect(() => {
    // The analyses are stored in the analysisResult from the agent panel
    // This panel provides a structured explainability view
  }, [analysisResult]);

  const agents = [
    { name: 'Market Scanner', icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-400/10', desc: 'Trend, relative strength, volume patterns, sector performance' },
    { name: 'News Intelligence', icon: Zap, color: 'text-amber-400', bg: 'bg-amber-400/10', desc: 'Earnings, sector news, regulatory changes, insider activity' },
    { name: 'Technical Indicators', icon: Target, color: 'text-cyan-400', bg: 'bg-cyan-400/10', desc: 'RSI, MACD, Bollinger Bands, Moving Averages, Stochastic' },
    { name: 'Macro Economy', icon: BarChart3, color: 'text-violet-400', bg: 'bg-violet-400/10', desc: 'Interest rates, inflation, GDP, currency, geopolitical events' },
    { name: 'Sentiment', icon: Brain, color: 'text-pink-400', bg: 'bg-pink-400/10', desc: 'Social media, retail interest, institutional flows, put/call ratios' },
    { name: 'Risk Management', icon: Shield, color: 'text-orange-400', bg: 'bg-orange-400/10', desc: 'Volatility, downside risk, correlation, position sizing' },
    { name: 'Portfolio Agent', icon: BarChart3, color: 'text-teal-400', bg: 'bg-teal-400/10', desc: 'Diversification, sector allocation, rebalancing needs' },
    { name: 'Trade Planner', icon: Target, color: 'text-lime-400', bg: 'bg-lime-400/10', desc: 'Entry/exit points, stop-loss, take-profit, holding period' },
  ];

  const specialAgents = [
    { name: 'Chart Vision', icon: Eye, color: 'text-violet-400', bg: 'bg-violet-400/10', desc: 'AMD Ryzen AI NPU accelerated chart pattern recognition' },
    { name: 'Voice Copilot', icon: Mic, color: 'text-amber-400', bg: 'bg-amber-400/10', desc: 'On-device voice recognition via Ryzen AI NPU' },
    { name: 'Psychology Coach', icon: Brain, color: 'text-pink-400', bg: 'bg-pink-400/10', desc: 'Emotional state detection, bias identification' },
    { name: 'Simulation Engine', icon: BarChart3, color: 'text-cyan-400', bg: 'bg-cyan-400/10', desc: 'Monte Carlo simulation with 10,000+ paths' },
    { name: 'Market Memory', icon: BarChart3, color: 'text-lime-400', bg: 'bg-lime-400/10', desc: 'Personalized pattern recognition across past trades' },
    { name: 'Journal Agent', icon: Target, color: 'text-teal-400', bg: 'bg-teal-400/10', desc: 'Trade journal analysis, weekly performance reports' },
  ];

  return (
    <div className="space-y-6">
      {/* How it works */}
      <Card className="bg-card border-border border-primary/20">
        <CardHeader className="pb-3 pt-4 px-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-primary" />
            How Explainability Works
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="[perspective:600px] grid grid-cols-1 md:grid-cols-3 gap-4">
            <motion.div
              variants={motionVariants.pop3d}
              whileHover="hover"
              whileTap="tap"
              className="text-center p-4 rounded-xl bg-muted/20"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-2">
                <Brain className="w-5 h-5 text-primary" />
              </div>
              <p className="text-xs font-medium mb-1">Multi-Agent Analysis</p>
              <p className="text-[10px] text-muted-foreground">8 specialized agents analyze from different perspectives independently</p>
            </motion.div>
            <motion.div
              variants={motionVariants.pop3d}
              whileHover="hover"
              whileTap="tap"
              className="text-center p-4 rounded-xl bg-muted/20"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-2">
                <BarChart3 className="w-5 h-5 text-primary" />
              </div>
              <p className="text-xs font-medium mb-1">Decision Fusion</p>
              <p className="text-[10px] text-muted-foreground">Weighted consensus engine combines all agent outputs into one decision</p>
            </motion.div>
            <motion.div
              variants={motionVariants.pop3d}
              whileHover="hover"
              whileTap="tap"
              className="text-center p-4 rounded-xl bg-muted/20"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-2">
                <Lightbulb className="w-5 h-5 text-primary" />
              </div>
              <p className="text-xs font-medium mb-1">Transparent Reasoning</p>
              <p className="text-[10px] text-muted-foreground">Every recommendation comes with score, reasons, and risk factors</p>
            </motion.div>
          </div>
        </CardContent>
      </Card>

      {/* Core Agents */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3 pt-4 px-4">
          <CardTitle className="text-sm font-semibold">Core Analysis Agents (8)</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="[perspective:600px] grid grid-cols-1 md:grid-cols-2 gap-3">
            {agents.map((agent) => (
              <motion.div
                key={agent.name}
                variants={motionVariants.pop3d}
                whileHover="hover"
                whileTap="tap"
                className="flex items-start gap-3 p-3 rounded-lg bg-muted/20 border border-border/50"
              >
                <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0', agent.bg)}>
                  <agent.icon className={cn('w-4 h-4', agent.color)} />
                </div>
                <div>
                  <p className="text-xs font-medium">{agent.name}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{agent.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Specialized Agents */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3 pt-4 px-4">
          <CardTitle className="text-sm font-semibold">Specialized Capabilities (6)</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="[perspective:600px] grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {specialAgents.map((agent) => (
              <motion.div
                key={agent.name}
                variants={motionVariants.pop3d}
                whileHover="hover"
                whileTap="tap"
                className="flex items-start gap-3 p-3 rounded-lg bg-muted/20 border border-border/50"
              >
                <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0', agent.bg)}>
                  <agent.icon className={cn('w-4 h-4', agent.color)} />
                </div>
                <div>
                  <p className="text-xs font-medium">{agent.name}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{agent.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Example Decision */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3 pt-4 px-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-primary" />
            Example: How a Decision is Explained
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Black-Box (Other Apps)</p>
              <div className="p-4 rounded-lg bg-red-400/5 border border-red-400/20">
                <p className="text-sm text-foreground font-medium">BUY TCS</p>
                <p className="text-[10px] text-muted-foreground mt-1">No reasoning provided. Trust us.</p>
              </div>
            </div>
            <div>
              <p className="text-[10px] text-primary uppercase tracking-wider mb-2">Explainable (Our System)</p>
              <div className="p-4 rounded-lg bg-emerald-400/5 border border-emerald-400/20">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-bold text-emerald-400">BUY TCS</span>
                  <Badge className="text-[10px] bg-emerald-400/20 text-emerald-400 border-emerald-400/30">87/100</Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] text-foreground flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Breakout confirmed above ₹4,050
                  </p>
                  <p className="text-[10px] text-foreground flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" /> RSI = 58 (healthy momentum)
                  </p>
                  <p className="text-[10px] text-foreground flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" /> MACD bullish crossover
                  </p>
                  <p className="text-[10px] text-foreground flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Institutional buying detected
                  </p>
                  <p className="text-[10px] text-foreground flex items-center gap-1">
                    <XCircle className="w-3 h-3 text-amber-400" /> Earnings next week adds uncertainty
                  </p>
                  <p className="text-[10px] text-foreground flex items-center gap-1">
                    <XCircle className="w-3 h-3 text-amber-400" /> IT sector facing headwinds
                  </p>
                </div>
                <div className="mt-2 flex gap-3">
                  <Badge variant="outline" className="text-[10px] border-amber-400/40 text-amber-400">MEDIUM RISK</Badge>
                  <Badge variant="outline" className="text-[10px] border-cyan-400/40 text-cyan-400">83% CONFIDENCE</Badge>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Try it */}
      {!analysisResult && (
        <div className="text-center">
          <Button
            onClick={() => setActivePanel('agents')}
            className="bg-primary text-primary-foreground"
          >
            Try an Analysis to See Explainability in Action
          </Button>
        </div>
      )}
    </div>
  );
}