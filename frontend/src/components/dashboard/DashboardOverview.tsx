'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useTradingStore } from '@/store/trading-store';
import {
  TrendingUp, TrendingDown, Briefcase, Activity, Bot, Mic, Eye,
  ArrowUpRight, ArrowDownRight, Clock, AlertTriangle, CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { SkeletonText } from '@/components/ui/skeleton-text';
import { EmptyState } from '@/components/ui/empty-state';

interface PortfolioSummary {
  totalInvested: number;
  totalCurrent: number;
  totalPnl: number;
  pnlPercent: number;
  holdingCount: number;
}

interface Trade {
  id: string;
  symbol: string;
  direction: string;
  entryPrice: number;
  quantity: number;
  pnl: number | null;
  status: string;
  confidence: number | null;
  riskLevel: string | null;
  reasoning: string | null;
  entryDate: string;
}

export function DashboardOverview() {
  const { setActivePanel } = useTradingStore();
  const [portfolio, setPortfolio] = useState<PortfolioSummary | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [portfolioRes, tradesRes] = await Promise.all([
          fetch('/api/portfolio'),
          fetch('/api/trades')
        ]);

        const portfolioData = await portfolioRes.json();
        const tradesData = await tradesRes.json();

        if (portfolioData.success) setPortfolio(portfolioData.summary);
        if (tradesData.success) setTrades(tradesData.data.slice(0, 8));
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();

    // Refresh data every 30 seconds
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  const openTrades = trades.filter(t => t.status === 'OPEN');
  const closedTrades = trades.filter(t => t.status === 'CLOSED');
  const winTrades = closedTrades.filter(t => (t.pnl || 0) > 0);

  const quickActions = [
    { label: 'Analyze Stock', icon: Bot, panel: 'agents' as const, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
    { label: 'Voice Ask', icon: Mic, panel: 'voice' as const, color: 'text-amber-400', bg: 'bg-amber-400/10' },
    { label: 'Scan Chart', icon: Eye, panel: 'vision' as const, color: 'text-violet-400', bg: 'bg-violet-400/10' },
    { label: 'Simulate Trade', icon: TrendingUp, panel: 'simulator' as const, color: 'text-cyan-400', bg: 'bg-cyan-400/10' },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Skeleton loading state */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Skeleton className="h-48 lg:col-span-2" />
          <Skeleton className="h-32" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  // Handle empty states when data is loaded but empty
  if (!portfolio) {
    return (
      <div className="space-y-6">
        <EmptyState
          title="No portfolio data"
          description="Your portfolio data will appear here once you start trading or connect your brokerage account."
          icon={<Briefcase className="h-6 w-6 text-primary mx-auto mb-4" />}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hero Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">Portfolio Value</span>
              <Briefcase className="w-3.5 h-3.5 text-primary" />
            </div>
            <p className="text-xl font-bold text-foreground">
              ₹{portfolio?.totalCurrent?.toLocaleString() || '0'}
            </p>
            <div className="flex items-center gap-1 mt-1">
              {portfolio && portfolio.totalPnl >= 0 ? (
                <ArrowUpRight className="w-3 h-3 text-profit" />
              ) : (
                <ArrowDownRight className="w-3 h-3 text-loss" />
              )}
              <span className={cn('text-xs font-medium', portfolio && portfolio.totalPnl >= 0 ? 'text-profit' : 'text-loss')}>
                {portfolio ? `₹${Math.abs(portfolio.totalPnl).toLocaleString()} (${portfolio.pnlPercent?.toFixed(2)}%)` : '$0 (0%)'}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">Open Positions</span>
              <Activity className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <p className="text-xl font-bold text-foreground">{openTrades.length}</p>
            <p className="text-xs text-muted-foreground mt-1">{portfolio?.holdingCount || 0} holdings</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">Win Rate</span>
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <p className="text-xl font-bold text-foreground">
              {closedTrades.length > 0 ? `${Math.round((winTrades.length / closedTrades.length) * 100)}%` : '0%'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {winTrades.length}W / {Math.max(0, closedTrades.length - winTrades.length)}L
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">Active Agents</span>
              <Bot className="w-3.5 h-3.5 text-primary" />
            </div>
            <p className="text-xl font-bold text-foreground">8</p>
            <p className="text-xs text-primary mt-1">All systems operational</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3 pt-4 px-4">
          <CardTitle className="text-sm font-semibold">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {quickActions.map((action) => (
              <button
                key={action.label}
                onClick={() => setActivePanel(action.panel)}
                className="flex flex-col items-center gap-2 p-4 rounded-xl bg-muted/30 border border-border hover:border-primary/40 hover:bg-primary/5 transition-all duration-200 group"
              >
                <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', action.bg)}>
                  <action.icon className={cn('w-5 h-5', action.color)} />
                </div>
                <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                  {action.label}
                </span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Active Trades + Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Active Trades */}
        <Card className="bg-card border-border lg:col-span-2">
          <CardHeader className="pb-3 pt-4 px-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Active Trades</CardTitle>
              <Badge variant="outline" className="text-[10px]">{openTrades.length} open</Badge>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="space-y-2 max-h-72 overflow-y-auto custom-scrollbar">
              {openTrades.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-xs text-muted-foreground">No active trades</p>
                </div>
              ) : (
                openTrades.map((trade) => (
                  <div key={trade.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/50 hover:border-border transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold',
                        trade.direction === 'BUY' ? 'bg-emerald-400/10 text-emerald-400' : 'bg-red-400/10 text-red-400'
                      )}>
                        {trade.symbol.substring(0, 2)}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{trade.symbol}</p>
                        <p className="text-[10px] text-muted-foreground">{trade.direction} @ ₹{trade.entryPrice} × {trade.quantity}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1">
                        {trade.riskLevel === 'LOW' && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                        {trade.riskLevel === 'MEDIUM' && <AlertTriangle className="w-3 h-3 text-amber-400" />}
                        {trade.riskLevel === 'HIGH' && <AlertTriangle className="w-3 h-3 text-red-400" />}
                        <Badge variant="outline" className={cn(
                          'text-[10px]',
                          trade.riskLevel === 'LOW' && 'border-emerald-400/40 text-emerald-400',
                          trade.riskLevel === 'MEDIUM' && 'border-amber-400/40 text-amber-400',
                          trade.riskLevel === 'HIGH' && 'border-red-400/40 text-red-400',
                        )}>
                          {trade.riskLevel} RISK
                        </Badge>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1">Confidence: {trade.confidence || 0}%</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* System Architecture */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3 pt-4 px-4">
            <CardTitle className="text-sm font-semibold">System Architecture</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                  <span className="text-[10px] font-semibold text-primary">ORCHESTRATOR</span>
                </div>
                <p className="text-[10px] text-muted-foreground">Multi-agent fusion engine</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {['Market Scanner', 'News Intel', 'Technical', 'Macro'].map(agent => (
                  <div key={agent} className="p-2 rounded-md bg-muted/30 border border-border/50 text-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mx-auto mb-1" />
                    <p className="text-[9px] text-muted-foreground">{agent}</p>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {['Sentiment', 'Risk Mgmt', 'Portfolio', 'Trade Plan'].map(agent => (
                  <div key={agent} className="p-2 rounded-md bg-muted/30 border border-border/50 text-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mx-auto mb-1" />
                    <p className="text-[9px] text-muted-foreground">{agent}</p>
                  </div>
                ))}
              </div>
              <div className="p-3 rounded-lg bg-amber-400/5 border border-amber-400/20">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="w-3 h-3 text-amber-400" />
                  <span className="text-[10px] font-semibold text-amber-400">EDGE + CLOUD</span>
                </div>
                <p className="text-[10px] text-muted-foreground">Ryzen AI NPU + Fireworks AI</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}