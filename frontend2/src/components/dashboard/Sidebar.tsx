'use client';

import { useTradingStore, type PanelType } from '@/store/trading-store';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, Bot, Mic, Eye, FlaskConical, Briefcase,
  BookOpen, Brain, GitCompare, Database, Lightbulb, Cpu,
} from 'lucide-react';
import { motion } from 'framer-motion';

const NAV_ITEMS: { id: PanelType; label: string; icon: React.ElementType; group?: string }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, group: 'OVERVIEW' },
  { id: 'agents', label: 'Agent Analysis', icon: Bot, group: 'AI AGENTS' },
  { id: 'voice', label: 'Voice Copilot', icon: Mic },
  { id: 'vision', label: 'Vision AI', icon: Eye },
  { id: 'simulator', label: 'Trade Simulator', icon: FlaskConical, group: 'TOOLS' },
  { id: 'whatif', label: 'What-If Analysis', icon: GitCompare },
  { id: 'portfolio', label: 'Portfolio', icon: Briefcase, group: 'PORTFOLIO' },
  { id: 'journal', label: 'Trade Journal', icon: BookOpen },
  { id: 'psychology', label: 'Psychology Coach', icon: Brain, group: 'INTELLIGENCE' },
  { id: 'memory', label: 'Market Memory', icon: Database },
  { id: 'explainability', label: 'Explainability', icon: Lightbulb },
];

// Pre-process: determine which items show a group header
const navWithGroups = NAV_ITEMS.map((item, idx) => ({
  ...item,
  showGroup: !!item.group && (idx === 0 || NAV_ITEMS[idx - 1].group !== item.group),
}));

export function Sidebar() {
  const { activePanel, setActivePanel } = useTradingStore();

  return (
    <aside className="w-64 min-h-screen bg-sidebar border-r border-sidebar-border flex flex-col shrink-0">
      {/* Logo */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/20 flex items-center justify-center">
            <Cpu className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-foreground leading-tight">AI Trading</h1>
            <p className="text-[10px] text-muted-foreground leading-tight">Copilot v1.0</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 overflow-y-auto custom-scrollbar">
        {navWithGroups.map((item) => (
          <div key={item.id}>
            {item.showGroup && (
              <div className="mt-4 mb-2 px-2">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  {item.group}
                </span>
              </div>
            )}
            <button
              onClick={() => setActivePanel(item.id)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm mb-0.5 transition-all duration-200',
                activePanel === item.id
                  ? 'bg-primary/15 text-primary font-medium'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              )}
            >
              <item.icon className={cn(
                'w-4 h-4 shrink-0',
                activePanel === item.id ? 'text-primary' : 'text-muted-foreground'
              )} />
              <span>{item.label}</span>
              {activePanel === item.id && (
                <motion.div
                  layoutId="sidebar-active"
                  className="ml-auto w-1.5 h-1.5 rounded-full bg-primary"
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                />
              )}
            </button>
          </div>
        ))}
      </nav>

      {/* AMD Badge */}
      <div className="p-4 border-t border-sidebar-border">
        <div className="rounded-lg bg-card p-3 text-center">
          <p className="text-[10px] text-muted-foreground mb-1">Powered by</p>
          <p className="text-xs font-bold text-amber-400">AMD Ryzen AI</p>
          <p className="text-[9px] text-muted-foreground mt-0.5">NPU + CPU + GPU</p>
        </div>
      </div>
    </aside>
  );
}