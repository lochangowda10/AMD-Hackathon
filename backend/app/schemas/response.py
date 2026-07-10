from typing import Any, Dict, List, Optional

from pydantic import BaseModel

from app.schemas.base import BaseResponse


class APIResponse(BaseResponse):
    """Standard API response."""
    pass


class AgentResponse(BaseModel):
    """
    Standard output of every AI Agent.
    """

    agent_name: str
    success: bool
    confidence: float

    decision: Optional[str] = None

    summary: str

    execution_time_ms: float

    sources: List[str] = []

    warnings: List[str] = []

    data: Optional[Dict[str, Any]] = None


class DecisionResponse(BaseResponse):
    """
    Final decision returned by Orchestrator.
    """

    decision: str

    confidence: float

    agents: List[AgentResponse]