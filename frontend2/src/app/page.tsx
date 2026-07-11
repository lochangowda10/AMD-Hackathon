'use client';

import { Sidebar } from '@/components/dashboard/Sidebar';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { DashboardOverview } from '@/components/dashboard/DashboardOverview';
import { AgentConsensus } from '@/components/dashboard/AgentConsensus';
import { VoiceCopilot } from '@/components/dashboard/VoiceCopilot';
import { VisionAI } from '@/components/dashboard/VisionAI';
import { TradeSimulator } from '@/components/dashboard/TradeSimulator';
import { PortfolioPanel } from '@/components/dashboard/PortfolioPanel';
import { TradeJournal } from '@/components/dashboard/TradeJournal';
import { PsychologyCoach } from '@/components/dashboard/PsychologyCoach';
import { WhatIfSimulator } from '@/components/dashboard/WhatIfSimulator';
import { MarketMemory } from '@/components/dashboard/MarketMemory';
import { ExplainabilityPanel } from '@/components/dashboard/ExplainabilityPanel';
import { useTradingStore } from '@/store/trading-store';

function ActivePanel() {
  const { activePanel } = useTradingStore();

  switch (activePanel) {
    case 'dashboard': return <DashboardOverview />;
    case 'agents': return <AgentConsensus />;
    case 'voice': return <VoiceCopilot />;
    case 'vision': return <VisionAI />;
    case 'simulator': return <TradeSimulator />;
    case 'portfolio': return <PortfolioPanel />;
    case 'journal': return <TradeJournal />;
    case 'psychology': return <PsychologyCoach />;
    case 'whatif': return <WhatIfSimulator />;
    case 'memory': return <MarketMemory />;
    case 'explainability': return <ExplainabilityPanel />;
    default: return <DashboardOverview />;
  }
}

export default function Home() {
  return (
    <div className="flex min-h-screen bg-trading-bg">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <DashboardHeader />
        <main className="flex-1 p-6 overflow-y-auto custom-scrollbar">
          <ActivePanel />
        </main>
        <footer className="border-t border-border bg-card/30 px-6 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <span className="text-[10px] text-muted-foreground">AI Swing Trading Copilot v1.0</span>
            <span className="text-[10px] text-muted-foreground">•</span>
            <span className="text-[10px] text-muted-foreground">Hybrid Edge + Cloud Architecture</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-[10px] text-amber-400">AMD Ryzen AI</span>
            <span className="text-[10px] text-muted-foreground">•</span>
            <span className="text-[10px] text-primary">Fireworks AI</span>
            <span className="text-[10px] text-muted-foreground">•</span>
            <span className="text-[10px] text-muted-foreground">8 Active Agents</span>
          </div>
        </footer>
      </div>
    </div>
  );
}