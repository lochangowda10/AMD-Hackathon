'use client';

import { useTradingStore, type PanelType } from '@/store/trading-store';
import {
  Search, Bell, Activity, Wifi,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

const PANEL_TITLES: Record<PanelType, string> = {
  dashboard: 'Command Center',
  agents: 'Multi-Agent Analysis',
  voice: 'Voice Trading Copilot',
  vision: 'Chart Vision AI',
  simulator: 'Monte Carlo Simulator',
  portfolio: 'Portfolio Intelligence',
  journal: 'Trade Journal',
  psychology: 'Psychology Coach',
  whatif: 'What-If Decision Engine',
  memory: 'Market Memory',
  explainability: 'Explainability Engine',
};

export function DashboardHeader() {
  const { activePanel } = useTradingStore();

  return (
    <header className="h-14 border-b border-border bg-card/50 backdrop-blur-sm flex items-center justify-between px-6 shrink-0">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">{PANEL_TITLES[activePanel]}</h2>
        </div>
        <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/30">
          LIVE
        </Badge>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative hidden md:block">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Search stocks, agents, features..."
            className="pl-8 w-64 h-8 text-xs bg-muted/50 border-border"
          />
        </div>
        <button className="relative p-2 rounded-lg hover:bg-accent transition-colors">
          <Bell className="w-4 h-4 text-muted-foreground" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-primary rounded-full" />
        </button>
        <div className="flex items-center gap-2 px-2 py-1 rounded-lg bg-muted/50">
          <Wifi className="w-3 h-3 text-primary" />
          <span className="text-[10px] text-muted-foreground">Ryzen AI Active</span>
        </div>
      </div>
    </header>
  );
}