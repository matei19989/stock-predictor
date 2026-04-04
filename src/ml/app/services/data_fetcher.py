"""Fetch OHLCV stock data via yfinance."""

import logging

import pandas as pd
import yfinance as yf

logger = logging.getLogger(__name__)


def fetch_ohlcv(ticker: str, period: str = "5y") -> pd.DataFrame:
    """Fetch OHLCV data for a ticker using yfinance.

    Args:
        ticker: Stock ticker symbol (e.g. "AAPL").
        period: yfinance period string (e.g. "1y", "5y").

    Returns:
        DataFrame with columns: Open, High, Low, Close, Volume
        and a DatetimeIndex.

    Raises:
        ValueError: If no data is returned for the ticker.
    """
    logger.info("Fetching %s data for %s", period, ticker)

    stock = yf.Ticker(ticker)
    df = stock.history(period=period, auto_adjust=True)

    if df.empty:
        raise ValueError(f"No data returned for ticker '{ticker}' with period '{period}'")

    # Flatten MultiIndex columns if present
    if isinstance(df.columns, pd.MultiIndex):
        df.columns = df.columns.get_level_values(0)

    # Keep only OHLCV columns
    df = df[["Open", "High", "Low", "Close", "Volume"]].copy()
    df.index.name = "Date"

    logger.info("Fetched %d rows for %s", len(df), ticker)
    return df
