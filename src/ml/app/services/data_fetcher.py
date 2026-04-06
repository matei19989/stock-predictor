"""Fetch OHLCV stock data via yfinance."""

import logging
import threading
import time

import pandas as pd
import yfinance as yf

logger = logging.getLogger(__name__)

# Simple TTL cache: {key: (DataFrame, timestamp)}
_ohlcv_cache: dict[str, tuple[pd.DataFrame, float]] = {}
_ohlcv_lock = threading.Lock()
_OHLCV_TTL = 900  # 15 minutes


def fetch_ohlcv(ticker: str, period: str = "5y") -> pd.DataFrame:
    """Fetch OHLCV data for a ticker using yfinance.

    Args:
        ticker: Stock ticker symbol (e.g. "AAPL").
        period: yfinance period string (e.g. "1y", "5y").

    Returns:
        DataFrame with columns: Open, High, Low, Close, Volume
        and a tz-naive DatetimeIndex.

    Raises:
        ValueError: If no data is returned for the ticker.
    """
    cache_key = f"{ticker}:{period}"
    with _ohlcv_lock:
        if cache_key in _ohlcv_cache:
            df, ts = _ohlcv_cache[cache_key]
            if time.time() - ts < _OHLCV_TTL:
                logger.info("Cache hit for %s (%s)", ticker, period)
                return df.copy()
            del _ohlcv_cache[cache_key]

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

    # Strip timezone — yfinance returns tz-aware index but training used tz-naive
    if df.index.tz is not None:
        df.index = df.index.tz_localize(None)

    logger.info("Fetched %d rows for %s", len(df), ticker)

    with _ohlcv_lock:
        _ohlcv_cache[cache_key] = (df.copy(), time.time())

    return df
