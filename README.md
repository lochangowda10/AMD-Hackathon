# 📈 AI Swing Trading Copilot

An advanced, multi-agent AI-powered platform designed to assist swing traders in making data-driven, emotion-free trading decisions. The Copilot combines real-time market data, technical chart analysis, and psychological coaching to provide a comprehensive and immersive trading workspace.

## ✨ Key Features

- **🤖 Multi-Agent Consensus**: A system of specialized AI agents working together to analyze market trends, calculate risks, and identify optimal entry/exit points.
- **👁️ Vision AI**: Upload trading charts for instant, automated pattern recognition and technical analysis.
- **🎙️ Voice Copilot**: Interact with the platform hands-free using voice commands to query market data, execute simulated trades, or log journal entries.
- **🧠 Psychology Coach**: Get real-time feedback on your trading mindset to prevent emotional, impulsive, or revenge trading.
- **📊 Portfolio & Market Memory**: Track your holdings, monitor portfolio health, and review historical trades to continuously learn from past performance.
- **🕹️ Trade Simulator**: Run "What-If" scenarios to backtest your strategies and calculate potential PnL before risking real capital.

## 🛠️ Technology Stack

### Frontend
- **Framework**: [Next.js 16](https://nextjs.org/) (App Router)
- **UI Library**: [React](https://react.org/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Animations**: [Framer Motion](https://www.framer.com/motion/) for 3D and physics-based interactions
- **Components**: Shadcn UI & Radix UI primitives

### Backend
- **Framework**: [FastAPI](https://fastapi.tiangolo.com/) (Python)
- **AI Integration**: Custom Agentic workflows and multi-agent coordination

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- Python (3.9+)

### 1. Clone the Repository
```bash
git clone https://github.com/lochangowda10/AMD-Hackathon.git
cd AMD-Hackathon
```

### 2. Setup Backend (FastAPI)
```bash
cd backend
python -m venv venv
# On Windows: venv\Scripts\activate
# On Mac/Linux: source venv/bin/activate
pip install -r requirements.txt
python -m uvicorn app.main:app --reload
```

### 3. Setup Frontend (Next.js)
Open a new terminal window:
```bash
cd frontend
npm install
npm run dev
```

The application will be available at `http://localhost:3000`.

## 👥 Team Members

- **Hanamaraddi Kanakannavar** (Backend)
- **Lochan Gowda T M** (Frontend)
- **Govardhana B R** (Frontend)