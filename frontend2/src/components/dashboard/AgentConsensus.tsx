'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton, SkeletonText } from '@/components/ui/skeleton';
import { useTradingStore, type AgentResult, type OrchestratorResult } from '@/store/trading-store';
import {
  Bot, Search, Loader2, TrendingUp, TrendingDown, Clock,
  CheckCircle2, XCircle, AlertTriangle, Shield, Zap, Target,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { motionVariants } from '@/lib/motion-variants';

const AGENT_LABELS: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  marketScanner: { label: 'Market Scanner', icon: TrendingUp, color: 'text-emerald-400' },
  newsIntelligence: { label: 'News Intel', icon: Zap, color: 'text-amber-400' },
  technical: { label: 'Technical', icon: Target, color: 'text-cyan-400' },
  macro: { label: 'Macro', icon: TrendingDown, color: 'text-violet-400' },
  sentiment: { label: 'Sentiment', icon: Bot, color: 'text-pink-400' },
  risk: { label: 'Risk Mgmt', icon: Shield, color: 'text-orange-400' },
  portfolio: { label: 'Portfolio', icon: Target, color: 'text-teal-400' },
  tradePlanner: { label: 'Trade Planner', icon: Target, color: 'text-lime-400' },
};

function AgentCard({ result, index }: { result: AgentResult | null; index: number }) {
    // If result is null, show skeleton loader with 3D pulse
    if (!result) {
      return (
        <motion.div
          variants={[
            { opacity: 0, y: 10, scale: 0.95 },
            { opacity: 1, y: 0, scale: 1, transition: { delay: index * 0.05 } }
          ]}
          initial="initial"
          animate="animate"
          className="p-3 rounded-lg bg-muted/20 border border-border/50"
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4 rounded-full" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-3 w-16" />
            </div>
            <div className="flex items-center gap-2 mb-1.5">
              <Skeleton className="h-1.5 w-3/4" />
              <Skeleton className="h-2 w-8" />
            </div>
            <Skeleton className="h-3 w-full" />
          </div>
        </motion.div>
      );
    }

    const meta = AGENT_LABELS[result.agent] || { label: result.agent, icon: Bot, color: 'text-muted-foreground' };
    const Icon = meta.icon;

    return (
      <motion.div
        variants={motionVariants.cardHover}
        whileHover="hover"
        whileTap="tap"
        className="p-3 rounded-lg bg-muted/20 border border-border/50"
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Icon className={cn('w-4 h-4', meta.color)} />
            <span className="text-xs font-medium">{meta.label}</span>
          </div>
          <Badge className={cn(
            'text-[10px] font-bold px-2 py-0',
            result.decision === 'BUY' && 'bg-emerald-400/20 text-emerald-400 border-emerald-400/30',
            result.decision === 'SELL' && 'bg-red-400/20 text-red-400 border-red-400/30',
            result.decision === 'WAIT' && 'bg-amber-400/20 text-amber-400 border-amber-400/30',
          )} variant="outline">
            {result.decision}
          </Badge>
        </div>
        <div className="flex items-center gap-2 mb-1.5">
          <Progress value={result.confidence} className="h-1.5 flex-1" />
          <span className="text-[10px] text-muted-foreground w-8 text-right">{result.confidence}%</span>
        </div>
        <p className="text-[10px] text-muted-foreground line-clamp-2">{result.reasoning}</p>
      </motion.div>
    );
  }

function DecisionGauge({ decision, confidence }: { decision: string; confidence: number }) {
  const color = decision === 'BUY' ? 'emerald' : decision === 'SELL' ? 'red' : 'amber';
  const icon = decision === 'BUY' ? TrendingUp : decision === 'SELL' ? TrendingDown : Clock;
  const Icon = icon;

  return (
    <div className={cn(
      'flex flex-col items-center justify-center p-6 rounded-2xl border-2',
      decision === 'BUY' && 'bg-emerald-400/5 border-emerald-400/30 glow-green',
      decision === 'SELL' && 'bg-red-400/5 border-red-400/30 glow-red',
      decision === 'WAIT' && 'bg-amber-400/5 border-amber-400/30 glow-amber',
    )}>
      <Icon className={cn('w-10 h-10 mb-3', `text-${color}-400`)} />
      <span className={cn('text-3xl font-black', `text-${color}-400`)}>{decision}</span>
      <div className="mt-3 flex items-center gap-2">
        <div className="text-center">
          <p className="text-2xl font-bold text-foreground">{confidence}%</p>
          <p className="text-[10px] text-muted-foreground">Confidence</p>
        </div>
      </div>
    </div>
  );
}

export function AgentConsensus() {
  const { analysisQuery, setAnalysisQuery, analysisLoading, analysisResult, setAnalysisLoading, setAnalysisResult } = useTradingStore();
  const [symbol, setSymbol] = useState('TCS');

  const handleAnalyze = async () => {
    if (!analysisQuery.trim()) return;
    setAnalysisLoading(true);
    try {
      const res = await fetch('/api/agents/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: analysisQuery, symbol }),
      });
      const data = await res.json();
      if (data.success) setAnalysisResult(data.data);
    } catch (e) { /* handle error */ }
    setAnalysisLoading(false);
  };

  const buyAgents = analysisResult?.agentResults.filter(a => a.decision === 'BUY').length || 0;
  const waitAgents = analysisResult?.agentResults.filter(a => a.decision === 'WAIT').length || 0;
  const sellAgents = analysisResult?.agentResults.filter(a => a.decision === 'SELL').length || 0;

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <Input
              placeholder="e.g. Should I buy Infosys tomorrow? Analyze TCS swing trade setup..."
              value={analysisQuery}
              onChange={(e) => setAnalysisQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
              className="flex-1 text-sm bg-muted/30 border-border"
            />
            <Button
              onClick={handleAnalyze}
              disabled={analysisLoading || !analysisQuery.trim()}
              className="bg-primary text-primary-foreground hover:bg-primary/90 px-6"
            >
              {analysisLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
              {analysisLoading ? 'Analyzing...' : 'Run Agents'}
            </Button>
          </div>
          <div className="flex gap-2 mt-3">
            {['Should I buy TCS?', 'Analyze Reliance for swing trade', 'Is it safe to enter INFY?'].map(q => (
              <button
                key={q}
                onClick={() => { setAnalysisQuery(q); setSymbol(q.includes('TCS') ? 'TCS' : q.includes('Reliance') ? 'RELIANCE' : 'INFY'); }}
                className="text-[10px] px-2 py-1 rounded-full bg-muted/30 border border-border/50 text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {analysisLoading && (
        <Card className="bg-card border-border">
          <CardContent className="p-8 flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <div className="text-center">
              <p className="text-sm font-medium">Running 8 Specialized Agents</p>
              <p className="text-xs text-muted-foreground mt-1">Analyzing from market, news, technical, macro, sentiment, risk, portfolio, and planning perspectives...</p>
            </div>
            <div className="w-full max-w-md space-y-2">
              {Object.entries(AGENT_LABELS).map(([key, meta]) => (
                <div key={key} className="flex items-center gap-2">
                  <meta.icon className={cn('w-3 h-3', meta.color)} />
                  <span className="text-[10px] text-muted-foreground w-24">{meta.label}</span>
                  <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-primary rounded-full"
                      initial={{ width: '0%' }}
                      animate={{ width: `${30 + Math.random() * 70}%` }}
                      transition={{ duration: 1.5 + Math.random(), ease: 'easeOut' }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {analysisResult && !analysisLoading && (
        <AnimatePresence>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            {/* Final Decision + Agent Consensus */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <DecisionGauge decision={analysisResult.finalDecision} confidence={analysisResult.overallConfidence} />

              <div className="lg:col-span-2">
                <Card className="bg-card border-border h-full">
                  <CardHeader className="pb-3 pt-4 px-4">
                    <CardTitle className="text-sm font-semibold">Multi-Agent Consensus</CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      <div className="text-center p-2 rounded-lg bg-emerald-400/5 border border-emerald-400/20">
                        <p className="text-lg font-bold text-emerald-400">{buyAgents}</p>
                        <p className="text-[10px] text-muted-foreground">BUY</p>
                      </div>
                      <div className="text-center p-2 rounded-lg bg-amber-400/5 border border-amber-400/20">
                        <p className="text-lg font-bold text-amber-400">{waitAgents}</p>
                        <p className="text-[10px] text-muted-foreground">WAIT</p>
                      </div>
                      <div className="text-center p-2 rounded-lg bg-red-400/5 border border-red-400/20">
                        <p className="text-lg font-bold text-red-400">{sellAgents}</p>
                        <p className="text-[10px] text-muted-foreground">SELL</p>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{analysisResult.fusionReasoning}</p>
                    {analysisResult.actionableAdvice.length > 0 && (
                      <div className="mt-3 space-y-1">
                        {analysisResult.actionableAdvice.map((advice, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <CheckCircle2 className="w-3 h-3 text-primary mt-0.5 shrink-0" />
                            <p className="text-[10px] text-muted-foreground">{advice}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Individual Agent Results */}
            <Card className="bg-card border-border">
              <CardHeader className="pb-3 pt-4 px-4">
                <CardTitle className="text-sm font-semibold">Individual Agent Analysis</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="[perspective:600px] grid grid-cols-1 md:grid-cols-2 gap-3">
                  {analysisResult.agentResults.map((agent, i) => (
                    <AgentCard key={agent.agent} result={agent} index={i} />
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Explanation */}
            {analysisResult.explanation && (
              <Card className="bg-card border-border">
                <CardHeader className="pb-3 pt-4 px-4">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    Explainability Engine
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="text-center">
                      <p className="text-3xl font-black text-primary">{analysisResult.explanation.score}</p>
                      <p className="text-[10px] text-muted-foreground">Decision Score</p>
                    </div>
                    <div className="flex-1">
                      <p className="text-[10px] text-muted-foreground mb-1">Risk Level</p>
                      <Badge variant="outline" className={cn(
                        'text-xs',
                        analysisResult.riskLevel === 'LOW' && 'border-emerald-400/40 text-emerald-400',
                        analysisResult.riskLevel === 'MEDIUM' && 'border-amber-400/40 text-amber-400',
                        analysisResult.riskLevel === 'HIGH' && 'border-red-400/40 text-red-400',
                      )}>
                        {analysisResult.riskLevel}
                      </Badge>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-medium text-emerald-400 mb-2 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Reasons
                      </p>
                      <div className="space-y-1">
                        {analysisResult.explanation.reasons.map((r, i) => (
                          <p key={i} className="text-[10px] text-muted-foreground flex items-start gap-1.5">
                            <span className="text-emerald-400 mt-0.5">+</span> {r}
                          </p>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-red-400 mb-2 flex items-center gap-1">
                        <XCircle className="w-3 h-3" /> Risks
                      </p>
                      <div className="space-y-1">
                        {analysisResult.explanation.risks.map((r, i) => (
                          <p key={i} className="text-[10px] text-muted-foreground flex items-start gap-1.5">
                            <span className="text-red-400 mt-0.5">!</span> {r}
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}