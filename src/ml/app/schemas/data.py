from pydantic import BaseModel


class StockDataPoint(BaseModel):
    """Single OHLCV data point."""

    date: str
    open: float
    high: float
    low: float
    close: float
    volume: int


class DataResponse(BaseModel):
    """Response body for GET /data/{ticker}."""

    ticker: str
    period: str
    count: int
    data: list[StockDataPoint]
