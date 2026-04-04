from pydantic import BaseModel, Field
from typing import Literal


class PredictRequest(BaseModel):
    """Request body for POST /predict."""

    ticker: str = Field(..., min_length=1, max_length=10, examples=["AAPL"])
    horizon: Literal["3m", "6m", "1y"] = Field(..., examples=["3m"])


class PredictResponse(BaseModel):
    """Response body for POST /predict."""

    ticker: str
    horizon: str
    signal: str
    confidence: float
    probabilities: dict[str, float]
    features_used: int
    timestamp: str
    low_confidence: bool
