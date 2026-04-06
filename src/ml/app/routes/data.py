"""Stock data fetching endpoint."""

import logging
from typing import Literal

from fastapi import APIRouter, HTTPException, Path, Query

from app.schemas.data import DataResponse, StockDataPoint
from app.services.data_fetcher import fetch_ohlcv

logger = logging.getLogger(__name__)

router = APIRouter()

PeriodType = Literal["1mo", "3mo", "6mo", "1y", "2y", "5y"]


@router.get("/data/{ticker}", response_model=DataResponse)
def get_stock_data(
    ticker: str = Path(max_length=10),
    period: PeriodType = Query(default="5y"),
) -> DataResponse:
    """Fetch OHLCV data for a ticker via yfinance."""
    try:
        df = fetch_ohlcv(ticker.upper(), period=period)
    except ValueError:
        raise HTTPException(
            status_code=404,
            detail={"error": "ticker_not_found", "ticker": ticker.upper()},
        )
    except Exception as e:
        logger.error("Data fetch failed for %s: %s", ticker, e)
        raise HTTPException(
            status_code=502,
            detail={"error": "data_fetch_failed"},
        )

    data_points = [
        StockDataPoint(
            date=row.Index.strftime("%Y-%m-%d"),
            open=round(row.Open, 4),
            high=round(row.High, 4),
            low=round(row.Low, 4),
            close=round(row.Close, 4),
            volume=int(row.Volume),
        )
        for row in df.itertuples()
    ]

    return DataResponse(
        ticker=ticker.upper(),
        period=period,
        count=len(data_points),
        data=data_points,
    )
