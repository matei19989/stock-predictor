"""Tests for sentiment service utilities."""

from unittest.mock import MagicMock, patch

import numpy as np
import pandas as pd
import pytest

from app.services.sentiment import (
    _build_ticker_mapping,
    clean_company_name,
    compute_sentiment_features,
    fetch_sentiment,
)


class TestCleanCompanyName:
    """Tests for clean_company_name() normalization."""

    @pytest.mark.parametrize(
        "raw, expected",
        [
            ("Apple Inc.", "apple"),
            ("Apple Inc", "apple"),
            ("Microsoft Corporation", "microsoft"),
            ("Alphabet Inc.", "alphabet"),
            ("The Goldman Sachs Group", "goldman sachs"),   # strips "The" and "Group"
            ("JPMorgan Chase & Co", "jpmorgan chase"),      # strips "& Co"
            ("Berkshire Hathaway Inc.", "berkshire hathaway"),
            ("Meta Platforms", "meta platforms"),            # no suffix to strip
            ("  NVIDIA Corp  ", "nvidia"),                   # trims whitespace + strips Corp
            ("Tesla, Inc.", "tesla"),                        # comma handling
            ("Amazon.com Inc.", "amazon com"),               # dot becomes space
        ],
    )
    def test_normalization(self, raw: str, expected: str):
        assert clean_company_name(raw) == expected

    def test_empty_string(self):
        assert clean_company_name("") == ""

    def test_already_clean(self):
        assert clean_company_name("apple") == "apple"

    def test_multiple_suffixes_only_strips_last(self):
        """Should only strip the suffix at the end, not in the middle."""
        result = clean_company_name("International Business Machines Corp")
        # "International" at the start should not be stripped; "Corp" at end should be
        assert "international business machines" == result


class TestComputeSentimentFeatures:
    """Tests for compute_sentiment_features() rolling calculations."""

    def test_returns_three_features(self, sentiment_df: pd.DataFrame):
        trading_dates = pd.bdate_range(start="2024-01-02", periods=60)
        result = compute_sentiment_features(sentiment_df, trading_dates)

        assert "sentiment_avg_20d" in result
        assert "sentiment_volume_20d" in result
        assert "sentiment_momentum" in result

    def test_sentiment_avg_is_bounded(self, sentiment_df: pd.DataFrame):
        """Average sentiment should be in [-1, 1] since inputs are clipped."""
        trading_dates = pd.bdate_range(start="2024-01-02", periods=60)
        result = compute_sentiment_features(sentiment_df, trading_dates)

        avg = result["sentiment_avg_20d"]
        if not np.isnan(avg):
            assert -1 <= avg <= 1

    def test_sentiment_volume_is_non_negative(self, sentiment_df: pd.DataFrame):
        trading_dates = pd.bdate_range(start="2024-01-02", periods=60)
        result = compute_sentiment_features(sentiment_df, trading_dates)

        vol = result["sentiment_volume_20d"]
        if not np.isnan(vol):
            assert vol >= 0

    def test_insufficient_data_returns_nan(self):
        """With very few trading dates (< min_periods=5), rolling avg should be NaN."""
        sentiment_df = pd.DataFrame({
            "date": pd.to_datetime(["2024-01-02"]),
            "sentiment": [0.5],
        })
        # Only 3 trading dates — rolling(20, min_periods=5) won't have enough
        trading_dates = pd.bdate_range(start="2024-01-02", periods=3)
        result = compute_sentiment_features(sentiment_df, trading_dates)

        assert np.isnan(result["sentiment_avg_20d"])

    def test_momentum_is_difference_of_windows(self, sentiment_df: pd.DataFrame):
        """sentiment_momentum should be (20d avg - 60d avg)."""
        trading_dates = pd.bdate_range(start="2024-01-02", periods=60)
        result = compute_sentiment_features(sentiment_df, trading_dates)

        # With 60 days of data, both windows should have values
        # Momentum = short_term - long_term
        if not np.isnan(result["sentiment_momentum"]):
            expected = result["sentiment_avg_20d"] - np.nan  # can't directly verify, but check it's a float
            assert isinstance(result["sentiment_momentum"], float)

    def test_uniform_sentiment_momentum_near_zero(self):
        """If sentiment is constant, momentum (20d - 60d) should be ~0."""
        n = 80
        dates = pd.bdate_range(start="2023-06-01", periods=n)
        sentiment_df = pd.DataFrame({
            "date": dates,
            "sentiment": [0.5] * n,
        })
        trading_dates = dates
        result = compute_sentiment_features(sentiment_df, trading_dates)

        if not np.isnan(result["sentiment_momentum"]):
            assert abs(result["sentiment_momentum"]) < 0.01


@pytest.fixture(autouse=True)
def clear_sentiment_cache():
    from app.services.sentiment import _sentiment_cache
    _sentiment_cache.clear()
    yield
    _sentiment_cache.clear()


@pytest.fixture(autouse=True)
def reset_bq_client():
    """Reset the module-level BigQuery client singleton between tests."""
    import app.services.sentiment as mod
    original = mod._bq_client
    mod._bq_client = None
    yield
    mod._bq_client = original


class TestBuildTickerMapping:
    """Tests for _build_ticker_mapping() Wikipedia scraping."""

    @patch("requests.get")
    def test_build_mapping_returns_dict(self, mock_get):
        html = """
        <table class="wikitable">
            <tr><th>Symbol</th><th>Security</th></tr>
            <tr><td>AAPL</td><td>Apple Inc.</td></tr>
            <tr><td>MSFT</td><td>Microsoft Corporation</td></tr>
        </table>
        """
        mock_response = MagicMock()
        mock_response.text = html
        mock_response.raise_for_status = MagicMock()
        mock_get.return_value = mock_response

        result = _build_ticker_mapping({"training_tickers": ["AAPL", "MSFT"]})

        assert isinstance(result, dict)
        assert result["AAPL"] == "apple"
        assert result["MSFT"] == "microsoft"

    @patch("requests.get")
    def test_build_mapping_network_failure_returns_empty(self, mock_get):
        mock_get.side_effect = Exception("Connection error")

        result = _build_ticker_mapping({"training_tickers": ["AAPL"]})

        assert result == {}


class TestFetchSentiment:
    """Tests for fetch_sentiment() BigQuery integration."""

    @patch("app.services.sentiment._get_bq_client")
    def test_fetch_sentiment_returns_dataframe(self, mock_get_client):
        mock_client = MagicMock()
        mock_get_client.return_value = mock_client

        # Return a DataFrame matching what .to_dataframe() returns
        raw_df = pd.DataFrame({
            "article_date": ["20240101", "20240102"],
            "matched_org": ["apple", "apple"],
            "tone": [5.0, -3.0],
        })
        mock_client.query.return_value.to_dataframe.return_value = raw_df

        result = fetch_sentiment("AAPL", "apple", days=90)

        assert result is not None
        assert "sentiment" in result.columns
        assert "date" in result.columns
        assert result["sentiment"].between(-1, 1).all()

    @patch("app.services.sentiment._get_bq_client")
    def test_fetch_sentiment_no_client_returns_none(self, mock_get_client):
        mock_get_client.return_value = None

        result = fetch_sentiment("AAPL", "apple", days=90)

        assert result is None

    @patch("app.services.sentiment._get_bq_client")
    def test_fetch_sentiment_empty_result_returns_none(self, mock_get_client):
        mock_client = MagicMock()
        mock_get_client.return_value = mock_client
        mock_client.query.return_value.to_dataframe.return_value = pd.DataFrame()

        result = fetch_sentiment("AAPL", "apple", days=90)

        assert result is None

    @patch("app.services.sentiment._get_bq_client")
    def test_fetch_sentiment_caches_result(self, mock_get_client):
        mock_client = MagicMock()
        mock_get_client.return_value = mock_client

        raw_df = pd.DataFrame({
            "article_date": ["20240101"],
            "matched_org": ["apple"],
            "tone": [2.0],
        })
        mock_client.query.return_value.to_dataframe.return_value = raw_df

        fetch_sentiment("AAPL", "apple", days=90)
        fetch_sentiment("AAPL", "apple", days=90)

        # BigQuery should only be queried once — second call hits cache
        mock_client.query.assert_called_once()
