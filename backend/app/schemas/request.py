from typing import List, Optional, Literal

from pydantic import BaseModel, Field


# -------------------------
# Generic Chat
# -------------------------

class ChatRequest(BaseModel):
    query: str = Field(..., min_length=2, max_length=2000)
    user_id: Optional[str] = None


# -------------------------
# Trade Analysis
# -------------------------

class TradeRequest(BaseModel):
    symbol: str = Field(..., min_length=1, max_length=20)
    timeframe: str = "1d"
    investment_amount: float
    risk_percentage: float = Field(..., ge=0.1, le=100)


# -------------------------
# Portfolio Analysis
# -------------------------

class PortfolioRequest(BaseModel):
    user_id: str
    holdings: List[str]


# -------------------------
# Voice Assistant
# -------------------------

class VoiceRequest(BaseModel):
    transcript: str


# -------------------------
# Vision AI
# -------------------------

class VisionRequest(BaseModel):
    image_url: Optional[str] = None


# -------------------------
# Journal
# -------------------------

class JournalRequest(BaseModel):
    trade_symbol: str
    notes: str
    emotion: Optional[str] = None


# -------------------------
# Trade Simulator
# -------------------------

class SimulationRequest(BaseModel):
    capital: float
    risk_percentage: float
    win_rate: float
    reward_risk_ratio: float
    number_of_trades: int