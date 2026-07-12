# AI Swing Trading Copilot - Frontend

## 🏗️ Project Structure

```
frontend1/
├── prisma/
│   └── schema.prisma          # Database schema (SQLite)
├── public/
│   └── robots.txt
├── src/
│   ├── app/
│   │   ├── layout.tsx         # Root layout (dark theme, Geist fonts)
│   │   ├── page.tsx           # Main page with sidebar + active panel routing
│   │   ├── globals.css        # Custom dark trading theme (OKLCH colors)
│   │   └── api/
│   │       ├── agents/
│   │       │   ├── analyze/route.ts      # Multi-agent analysis endpoint
│   │       │   ├── simulate/route.ts     # Monte Carlo simulation endpoint
│   │       │   ├── psychology/route.ts   # Psychology coach endpoint
│   │       │   └── journal/
│   │       │       ├── route.ts          # Trade journal CRUD
│   │       │       └── report/route.ts   # AI weekly report generator
│   │       ├── voice/
│   │       │   ├── asr/route.ts          # Speech-to-text (ASR)
│   │       │   └── tts/route.ts          # Text-to-speech (TTS)
│   │       ├── vision/
│   │       │   └── analyze/route.ts      # Chart vision AI analysis
│   │       ├── portfolio/
│   │       │   ├── route.ts              # Portfolio holdings
│   │       │   └── health/route.ts       # AI portfolio health analysis
│   │       ├── trades/route.ts           # Trade management
│   │       ├── market-memory/route.ts    # Market memory recall
│   │       ├── chat/route.ts             # AI copilot chat
│   │       └── route.ts                  # Health check
│   ├── components/
│   │   ├── dashboard/
│   │   │   ├── Sidebar.tsx              # Navigation sidebar with 11 panels
│   │   │   ├── DashboardHeader.tsx      # Top header with search & status
│   │   │   ├── DashboardOverview.tsx    # Command center with stats
│   │   │   ├── AgentConsensus.tsx       # Multi-agent analysis UI
│   │   │   ├── VoiceCopilot.tsx         # Voice/text input with TTS
│   │   │   ├── VisionAI.tsx             # Chart screenshot upload & AI analysis
│   │   │   ├── TradeSimulator.tsx       # Monte Carlo simulation with charts
│   │   │   ├── PortfolioPanel.tsx       # Holdings table + health score
│   │   │   ├── TradeJournal.tsx         # Journal entries + AI weekly report
│   │   │   ├── PsychologyCoach.tsx      # Chat-based psychology mentor
│   │   │   ├── WhatIfSimulator.tsx      # Multi-scenario comparison
│   │   │   ├── MarketMemory.tsx         # Per-symbol pattern recall
│   │   │   └── ExplainabilityPanel.tsx  # Agent documentation & transparency
│   │   └── ui/                          # shadcn/ui component library (50+ files)
│   ├── hooks/
│   │   ├── use-toast.ts                # Toast notification hook
│   │   └── use-mobile.ts               # Mobile breakpoint detection
│   ├── lib/
│   │   ├── agents.ts                   # 8 agents + fusion engine + psychology + simulation
│   │   ├── db.ts                       # Prisma client singleton
│   │   ├── seed.ts                     # Database seeder (8 stocks, 8 trades, 3 memories)
│   │   └── utils.ts                    # cn() utility
│   └── store/
│       └── trading-store.ts            # Zustand global state
├── package.json
├── next.config.ts
├── tsconfig.json
├── tailwind.config.ts
├── postcss.config.mjs
├── eslint.config.mjs
├── components.json
└── .env
```

## 🚀 Quick Start

```bash
# 1. Install dependencies
npm install
# or: bun install

# 2. Generate Prisma client
npx prisma generate
# or: bun run db:generate

# 3. Push schema to database
npx prisma db push
# or: bun run db:push

# 4. Seed the database with sample data
bun run src/lib/seed.ts
# or: npx tsx src/lib/seed.ts

# 5. Start development server
npm run dev
# or: bun run dev

# Open http://localhost:3000
```

## 📋 Features (10 Killer Features)

1. **Voice Copilot** - Voice/text input → Multi-agent analysis → TTS response
2. **Chart Vision AI** - Upload chart screenshots for AI pattern recognition
3. **Multi-Agent Consensus** - 8 specialized agents → Decision Fusion Engine → BUY/WAIT/SELL
4. **Monte Carlo Simulator** - 10,000 path simulations with probability distributions
5. **Explainability Engine** - Every decision explained with score, reasons, and risks
6. **Market Memory** - Per-symbol pattern recognition from historical trades
7. **Psychology Coach** - AI mentor for emotional trading management
8. **Portfolio Health** - AI-powered diversification scoring & rebalancing
9. **Trade Journal** - Structured journaling with mood tracking & AI weekly reports
10. **What-If Simulator** - Multi-scenario decision comparison

## 🎯 Development Phases Completed ✅

**Phase 1: Authentication & Foundation** - COMPLETED
- NextAuth.js authentication system with Credentials provider
- Protected routes and user profile management
- Responsive layout with error boundaries and loading states
- Database integration and secure API routes

**Phase 2: UI/UX & Technical Excellence** - COMPLETED
- Enhanced skeleton loaders, form validation, and empty states
- Improved error handling and loading states across all components
- TypeScript enhancements and performance optimizations
- Consistent design system and accessibility improvements

**Phase 3: AI Features Integration** - COMPLETED
- VoiceCopilot: Advanced audio visualization, conversation history, better error handling
- VisionAI: Multi-stage analysis pipeline visualization, detailed results breakdown
- AgentConsensus: Consensus meter visualization, enhanced agent cards, analysis history
- Professional feedback systems and improved user experience across all AI features

## 🏗️ Architecture

- **Frontend**: Next.js 16 + TypeScript + Tailwind CSS 4 + shadcn/ui + Framer Motion + Recharts
- **State**: Zustand (client) + Prisma/SQLite (server)
- **AI**: z-ai-web-dev-sdk (LLM, VLM, ASR, TTS)
- **Agents**: 8 specialized agents → Orchestrator → Decision Fusion Engine

## 🎨 Theme

Dark trading terminal theme with emerald green (profit) and red (loss) accents, optimized for readability in low-light environments.

## 📌 Notes

- Database uses SQLite (file: `./db/custom.db`)
- The `db/` directory must exist before running `prisma db push`
- AI features require the `z-ai-web-dev-sdk` with valid API configuration
- Voice features require microphone permissions in the browser