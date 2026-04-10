"""Shared fixtures for ML service tests."""

import numpy as np
import pandas as pd
import pytest


@pytest.fixture
def ohlcv_df() -> pd.DataFrame:
    """Generate 300 days of synthetic OHLCV data for testing.

    Enough rows for all rolling windows (252-day max for 52-week high/low).
    """
    np.random.seed(42)
    n = 300
    dates = pd.bdate_range(start="2023-01-02", periods=n)

    # Simulate a stock starting at $100 with random walk
    close = 100 + np.cumsum(np.random.randn(n) * 0.5)
    close = np.maximum(close, 10)  # keep prices positive

    df = pd.DataFrame(
        {
            "Open": close + np.random.randn(n) * 0.2,
            "High": close + abs(np.random.randn(n) * 1.0),
            "Low": close - abs(np.random.randn(n) * 1.0),
            "Close": close,
            "Volume": np.random.randint(1_000_000, 50_000_000, size=n),
        },
        index=dates,
    )
    df.index.name = "Date"
    return df


@pytest.fixture
def sentiment_df() -> pd.DataFrame:
    """Generate 60 days of synthetic sentiment data."""
    np.random.seed(42)
    dates = pd.bdate_range(start="2024-01-02", periods=60)
    # Multiple articles per day (3 articles per trading day)
    rows = []
    for d in dates:
        for _ in range(3):
            rows.append({"date": d, "sentiment": np.clip(np.random.randn() * 0.3, -1, 1)})
    return pd.DataFrame(rows)
