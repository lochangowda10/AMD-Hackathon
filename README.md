<div align="center">
  <h1>🚀 NAVIA: AI Swing Trading Copilot</h1>
  <p><b>Institutional-Grade AI Intelligence for the Everyday Swing Trader</b></p>
  <p><i>Built for the AMD Developer Hackathon</i></p>
</div>

<br/>

## 🌟 The Problem
Retail swing traders face three massive hurdles:
1. **Information Overload & Speed**: Processing news, technicals, and fundamentals simultaneously is nearly impossible for a human.
2. **Emotional Bias**: Fear and Greed drive 80% of retail trading losses.
3. **Lack of Institutional Tools**: Retail traders lack access to the quantitative, multi-agent modeling systems used by top hedge funds.

## 💡 Our Solution
**NAVIA AI Swing Trading Copilot** levels the playing field. We have engineered a hyper-intelligent, multi-agent ecosystem that acts as your personal quantitative team. Instead of relying on a single LLM, our platform deploys a **Consensus Architecture** where specialized AI agents debate and synthesize market data, ensuring high-conviction, mathematically-backed trading decisions.

---

## 🔥 Groundbreaking Features

### 🤖 Multi-Agent Consensus Engine
We don't rely on a single prompt. Our backend coordinates multiple specialized AI agents:
- **Technical Analyst Agent**: Crunches RSI, MACD, and moving averages.
- **Fundamental Analyst Agent**: Parses macroeconomic data and company financials.
- **Risk Management Agent**: Enforces strict stop-loss and position sizing rules.
*The final trade signal is generated only when the agents reach a mathematical consensus, eliminating hallucinations and bias.*

### 👁️ Vision AI (Chart Pattern Recognition)
Upload any candlestick chart. Our Vision AI instantly runs a pixel-by-pixel analysis to detect support/resistance zones, harmonic patterns, and breakout structures that the human eye might miss. Powered by multimodal LLMs (Fireworks/Groq/OpenAI).

### 🎙️ Voice Copilot
Trading requires speed. Interact with your portfolio entirely hands-free. Using advanced speech-to-text (ASR) and text-to-speech (TTS), you can query market memory, request portfolio health checks, or simulate trades simply by speaking to the Copilot.
*(Features a browser Web Speech API fallback for zero-latency execution).*

### 🧠 Real-Time Psychology Coach
The Copilot monitors your trading frequency, win/loss streaks, and journal entries to detect emotional tilt. If you try to revenge-trade after a loss, the Psychology Agent intervenes with behavioral coaching to protect your capital.

### 🕹️ "What-If" Trade Simulator
Never risk real capital blindly. Input a hypothetical trade, and our multi-agent system will backtest the parameters against historical market memory and current volatility to calculate probability of success and expected PnL.

---

## 🏗️ System Architecture & Tech Stack

Our platform is engineered for speed, responsiveness, and scale.

### 💻 Frontend (Immersive UI/UX)
- **Framework**: Next.js 16 (App Router) deployed on Vercel
- **UI/Styling**: React, Tailwind CSS v4, Shadcn UI
- **Animations**: Framer Motion (Implementing 3D spatial UI, physics-based spring interactions, and dynamic depth via perspective mapping)
- **Auth**: NextAuth.js for secure session management

### ⚙️ Backend (High-Performance Engine)
- **Framework**: FastAPI (Python) deployed on Render
- **AI Orchestration**: Custom Python Agentic workflow pipelines powered by Fireworks AI
- **Database**: PostgreSQL (Supabase) via Prisma ORM for lightning-fast queries and robust relationships
- **Market Data**: Finnhub API for real-time stock ticks

---

## 🚀 Live Demo & Deployment
- **Frontend URL**: [https://navia-ai.vercel.app](https://navia-ai.vercel.app)
- **Backend API**: Deployed on Render

*(Note: The platform features a built-in Demo Account mode, allowing judges to explore the dashboard and run agent simulations without needing to sign up).*

---

## ⚙️ Environment Variables Setup

To run this project locally, you need the following environment variables configured.

### Frontend (`frontend/.env`)
| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | ✅ | Supabase PostgreSQL Connection Pooler URL (`port 6543`) |
| `NEXTAUTH_SECRET` | ✅ | Session encryption (`openssl rand -base64 32`) |
| `NEXTAUTH_URL` | ✅ | Local URL (`http://localhost:3000`) or Vercel URL |
| `NEXT_PUBLIC_API_URL` | ✅ | URL of the FastAPI backend |
| `FIREWORKS_API_KEY` | ✅ | Powers the Multimodal AI features in Next.js (Vision/Chat) |

### Backend (`backend/.env`)
| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | ✅ | Supabase PostgreSQL Direct Connection URL (`port 5432`) |
| `FINNHUB_API_KEY` | ✅ | Real-time market data access |
| `FIREWORKS_API_KEY` | ✅ | Backend AI Agent inference |
| `SECRET_KEY` | ✅ | JWT Secret for backend auth verification |

---

## 🔮 Future Roadmap
- **Live Broker Integration**: Direct execution via Alpaca or Interactive Brokers API.
- **AMD Hardware Acceleration**: Optimizing local LLM inference using **AMD ROCm** for zero-latency, on-device agent execution on AMD Ryzen AI processors.
- **Social Sentiment Agent**: Real-time Twitter/Reddit NLP sentiment scraping.

---

## 👥 Team NAVIA
- **Hanamaraddi Kanakannavar** - AI Orchestration & Backend Architecture
- **Lochan Gowda T M** - 3D Interface Design & Frontend Engineering
- **Govardhana B R** - UX Architecture & Full-Stack Integration