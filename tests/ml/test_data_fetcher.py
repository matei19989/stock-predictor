"""Tests for the OHLCV data fetcher service."""

from unittest.mock import MagicMock, PropertyMock, patch

import numpy as np
import pandas as pd
import pytest

from app.services.data_fetcher import fetch_ohlcv, fetch_stock_info


@pytest.fixture(autouse=True)
def clear_cache():
    from app.services.data_fetcher import _ohlcv_cache
    _ohlcv_cache.clear()
    yield
    _ohlcv_cache.clear()


@pytest.fixture(autouse=True)
def clear_info_cache():
    from app.services.data_fetcher import _info_cache
    _info_cache.clear()
    yield
    _info_cache.clear()


def _make_ohlcv_df(periods=10, tz=None):
    """Create a realistic OHLCV DataFrame for mocking."""
    dates = pd.date_range("2024-01-01", periods=periods, freq="B", tz=tz)
    return pd.DataFrame(
        {
            "Open": np.random.uniform(100, 200, periods),
            "High": np.random.uniform(100, 200, periods),
            "Low": np.random.uniform(100, 200, periods),
            "Close": np.random.uniform(100, 200, periods),
            "Volume": np.random.randint(1_000_000, 10_000_000, periods),
        },
        index=dates,
    )


class TestFetchOhlcv:
    @patch("app.services.data_fetcher.yf")
    def test_returns_ohlcv_dataframe(self, mock_yf):
        mock_yf.Ticker.return_value.history.return_value = _make_ohlcv_df()

        result = fetch_ohlcv("AAPL", "5y")

        assert list(result.columns) == ["Open", "High", "Low", "Close", "Volume"]
        assert isinstance(result.index, pd.DatetimeIndex)

    @patch("app.services.data_fetcher.yf")
    def test_empty_data_raises_valueerror(self, mock_yf):
        mock_yf.Ticker.return_value.history.return_value = pd.DataFrame()

        with pytest.raises(ValueError, match="No data returned"):
            fetch_ohlcv("FAKEZ", "5y")

    @patch("app.services.data_fetcher.yf")
    def test_ticker_uppercased(self, mock_yf):
        """fetch_ohlcv passes the ticker as-is; the route uppercases. But verify yf.Ticker gets what we pass."""
        mock_yf.Ticker.return_value.history.return_value = _make_ohlcv_df()

        fetch_ohlcv("aapl", "5y")

        mock_yf.Ticker.assert_called_once_with("aapl")

    @patch("app.services.data_fetcher.yf")
    def test_timezone_stripped(self, mock_yf):
        tz_aware_df = _make_ohlcv_df(tz="US/Eastern")
        mock_yf.Ticker.return_value.history.return_value = tz_aware_df

        result = fetch_ohlcv("AAPL", "5y")

        assert result.index.tz is None

    @patch("app.services.data_fetcher.yf")
    def test_cache_returns_copy(self, mock_yf):
        mock_yf.Ticker.return_value.history.return_value = _make_ohlcv_df()

        result1 = fetch_ohlcv("AAPL", "5y")
        result2 = fetch_ohlcv("AAPL", "5y")

        # yfinance should only be called once — second call hits cache
        mock_yf.Ticker.return_value.history.assert_called_once()

        # Returned DataFrames should be independent copies
        result1.iloc[0, 0] = -999.0
        assert result2.iloc[0, 0] != -999.0


class TestFetchStockInfo:
    @patch("app.services.data_fetcher.yf")
    def test_returns_name_and_sector(self, mock_yf):
        mock_yf.Ticker.return_value.info = {"shortName": "Apple Inc.", "sector": "Technology"}
        result = fetch_stock_info("AAPL")
        assert result["name"] == "Apple Inc."
        assert result["sector"] == "Technology"

    @patch("app.services.data_fetcher.yf")
    def test_missing_fields_return_none(self, mock_yf):
        mock_yf.Ticker.return_value.info = {}
        result = fetch_stock_info("AAPL")
        assert result["name"] is None
        assert result["sector"] is None

    @patch("app.services.data_fetcher.yf")
    def test_exception_returns_none_values(self, mock_yf):
        type(mock_yf.Ticker.return_value).info = PropertyMock(side_effect=Exception("yfinance error"))
        result = fetch_stock_info("AAPL")
        assert result["name"] is None
        assert result["sector"] is None

    @patch("app.services.data_fetcher.yf")
    def test_caches_result(self, mock_yf):
        mock_yf.Ticker.return_value.info = {"shortName": "Apple Inc.", "sector": "Technology"}
        result1 = fetch_stock_info("AAPL")
        result2 = fetch_stock_info("AAPL")
        assert mock_yf.Ticker.call_count == 1
        assert result1 == result2
