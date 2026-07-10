from datetime import datetime
from typing import Any, Optional
from pydantic import BaseModel, Field


class MetaData(BaseModel):
    request_id: Optional[str] = None
    execution_time_ms: Optional[float] = None
    api_version: str = "v1"


class BaseResponse(BaseModel):
    success: bool = True
    message: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    metadata: Optional[MetaData] = None
    data: Optional[Any] = None


class BaseError(BaseModel):
    code: str
    message: str
    details: Optional[Any] = None


from pydantic import BaseModel


class BaseSchema(BaseModel):

    class Config:
        from_attributes = True