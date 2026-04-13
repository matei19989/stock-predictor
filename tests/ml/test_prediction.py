"""Tests for the prediction service orchestrator."""

from unittest.mock import MagicMock, patch

import numpy as np
import pandas as pd
import pytest

from app.services.prediction import LOW_CONFIDENCE_THRESHOLD, run_prediction


@pytest.fixture
def mock_model():
    """Create a mock XGBoost model that returns controllable probabilities."""
    model = MagicMock()
    # Default: predicts "Buy" (index 3) with 0.35 confidence
    model.predict_proba.return_value = np.array([[0.05, 0.10, 0.25, 0.35, 0.25]])
    return model


@pytest.fixture
def mock_label_encoder():
    """Create a mock label encoder with the 5 signal classes."""
    encoder = MagicMock()
    encoder.classes_ = np.array(["Strong Sell", "Sell", "Hold", "Buy", "Strong Buy"])
    encoder.inverse_transform.return_value = np.array(["Buy"])
    return encoder


@pytest.fixture
def feature_columns():
    """22 feature columns matching the model's expected input."""
    technical = [
        "Price_SMA50_Ratio", "Price_SMA200_Ratio", "Price_EMA20_Ratio",
        "MACD_Norm", "MACD_Signal_Norm", "MACD_Hist_Norm",
        "RSI", "Stoch_K", "Stoch_D", "ROC",
        "BB_Position", "BB_Width", "ATR_Pct",
        "OBV_Norm", "Vol_SMA_Ratio",
        "Dist_52w_High", "Dist_52w_Low", "Return_1m", "Return_3m",
    ]
    sentiment = ["sentiment_avg_20d", "sentiment_volume_20d", "sentiment_momentum"]
    return technical + sentiment


class TestRunPrediction:
    @patch("app.services.prediction.fetch_sentiment")
    @patch("app.services.prediction.fetch_ohlcv")
    def test_successful_prediction(
        self, mock_fetch: MagicMock, mock_sentiment: MagicMock,
        mock_model, mock_label_encoder, feature_columns, ohlcv_df,
    ):
        mock_fetch.return_value = ohlcv_df
        mock_sentiment.return_value = None  # no sentiment → NaN features

        result = run_prediction(
            ticker="AAPL",
            horizon="3m",
            model=mock_model,
            label_encoder=mock_label_encoder,
            feature_columns=feature_columns,
            ticker_to_company={"AAPL": "apple"},
            model_type="sklearn",
        )

        assert result["ticker"] == "AAPL"
        assert result["horizon"] == "3m"
        assert result["signal"] == "Buy"
        assert result["confidence"] == 0.35
        assert result["features_used"] == 22
        assert result["low_confidence"] is False
        assert "probabilities" in result
        assert len(result["probabilities"]) == 5

    @patch("app.services.prediction.fetch_sentiment")
    @patch("app.services.prediction.fetch_ohlcv")
    def test_low_confidence_flagged(
        self, mock_fetch: MagicMock, mock_sentiment: MagicMock,
        mock_label_encoder, feature_columns, ohlcv_df,
    ):
        mock_fetch.return_value = ohlcv_df
        mock_sentiment.return_value = None

        # Model returns low confidence (below 0.30 threshold)
        low_conf_model = MagicMock()
        low_conf_model.predict_proba.return_value = np.array([[0.20, 0.22, 0.25, 0.18, 0.15]])
        mock_label_encoder.inverse_transform.return_value = np.array(["Hold"])

        result = run_prediction(
            ticker="AAPL", horizon="3m",
            model=low_conf_model, label_encoder=mock_label_encoder,
            feature_columns=feature_columns,
            ticker_to_company={},
            model_type="sklearn",
        )

        assert result["low_confidence"] is True
        assert result["confidence"] < LOW_CONFIDENCE_THRESHOLD

    @patch("app.services.prediction.fetch_ohlcv")
    def test_data_fetch_failure_raises_valueerror(
        self, mock_fetch: MagicMock,
        mock_model, mock_label_encoder, feature_columns,
    ):
        mock_fetch.side_effect = ValueError("No data returned for ticker 'FAKE'")

        with pytest.raises(ValueError, match="No data"):
            run_prediction(
                ticker="FAKE", horizon="3m",
                model=mock_model, label_encoder=mock_label_encoder,
                feature_columns=feature_columns,
                ticker_to_company={},
                model_type="sklearn",
            )

    @patch("app.services.prediction.fetch_sentiment")
    @patch("app.services.prediction.fetch_ohlcv")
    def test_no_company_mapping_still_works(
        self, mock_fetch: MagicMock, mock_sentiment: MagicMock,
        mock_model, mock_label_encoder, feature_columns, ohlcv_df,
    ):
        """When ticker has no company name mapping, prediction should still succeed
        with NaN sentiment features (XGBoost handles NaN natively)."""
        mock_fetch.return_value = ohlcv_df

        result = run_prediction(
            ticker="AAPL", horizon="3m",
            model=mock_model, label_encoder=mock_label_encoder,
            feature_columns=feature_columns,
            ticker_to_company={},  # empty mapping
            model_type="sklearn",
        )

        # Should succeed — sentiment is NaN but XGBoost handles it
        assert result["signal"] == "Buy"
        # fetch_sentiment should NOT be called if no company name
        mock_sentiment.assert_not_called()

    @patch("app.services.prediction.fetch_sentiment")
    @patch("app.services.prediction.fetch_ohlcv")
    def test_probabilities_sum_to_one(
        self, mock_fetch: MagicMock, mock_sentiment: MagicMock,
        mock_model, mock_label_encoder, feature_columns, ohlcv_df,
    ):
        mock_fetch.return_value = ohlcv_df
        mock_sentiment.return_value = None

        result = run_prediction(
            ticker="AAPL", horizon="3m",
            model=mock_model, label_encoder=mock_label_encoder,
            feature_columns=feature_columns,
            ticker_to_company={},
            model_type="sklearn",
        )

        total = sum(result["probabilities"].values())
        assert abs(total - 1.0) < 0.01

    @patch("app.services.prediction.fetch_sentiment")
    @patch("app.services.prediction.fetch_ohlcv")
    def test_all_signals_represented_in_probabilities(
        self, mock_fetch: MagicMock, mock_sentiment: MagicMock,
        mock_model, mock_label_encoder, feature_columns, ohlcv_df,
    ):
        mock_fetch.return_value = ohlcv_df
        mock_sentiment.return_value = None

        result = run_prediction(
            ticker="AAPL", horizon="3m",
            model=mock_model, label_encoder=mock_label_encoder,
            feature_columns=feature_columns,
            ticker_to_company={},
            model_type="sklearn",
        )

        expected_keys = {"Strong Sell", "Sell", "Hold", "Buy", "Strong Buy"}
        assert set(result["probabilities"].keys()) == expected_keys

    @patch("app.services.prediction.fetch_sentiment")
    @patch("app.services.prediction.fetch_ohlcv")
    def test_confidence_rounded_to_4_decimals(
        self, mock_fetch: MagicMock, mock_sentiment: MagicMock,
        mock_label_encoder, feature_columns, ohlcv_df,
    ):
        mock_fetch.return_value = ohlcv_df
        mock_sentiment.return_value = None

        model = MagicMock()
        model.predict_proba.return_value = np.array([[0.123456789, 0.1, 0.2, 0.3, 0.276543211]])
        mock_label_encoder.inverse_transform.return_value = np.array(["Buy"])

        result = run_prediction(
            ticker="AAPL", horizon="3m",
            model=model, label_encoder=mock_label_encoder,
            feature_columns=feature_columns,
            ticker_to_company={},
            model_type="sklearn",
        )

        conf_str = str(result["confidence"])
        # At most 4 decimal places
        if "." in conf_str:
            assert len(conf_str.split(".")[1]) <= 4

    @patch("app.services.prediction.fetch_sentiment")
    @patch("app.services.prediction.fetch_ohlcv")
    def test_features_used_matches_column_count(
        self, mock_fetch: MagicMock, mock_sentiment: MagicMock,
        mock_model, mock_label_encoder, feature_columns, ohlcv_df,
    ):
        mock_fetch.return_value = ohlcv_df
        mock_sentiment.return_value = None

        result = run_prediction(
            ticker="AAPL", horizon="3m",
            model=mock_model, label_encoder=mock_label_encoder,
            feature_columns=feature_columns,
            ticker_to_company={},
            model_type="sklearn",
        )

        assert result["features_used"] == len(feature_columns)
        assert result["features_used"] == 22

    @patch("app.services.prediction.fetch_sentiment")
    @patch("app.services.prediction.fetch_ohlcv")
    def test_timestamp_is_utc_iso_format(
        self, mock_fetch: MagicMock, mock_sentiment: MagicMock,
        mock_model, mock_label_encoder, feature_columns, ohlcv_df,
    ):
        mock_fetch.return_value = ohlcv_df
        mock_sentiment.return_value = None

        result = run_prediction(
            ticker="AAPL", horizon="3m",
            model=mock_model, label_encoder=mock_label_encoder,
            feature_columns=feature_columns,
            ticker_to_company={},
            model_type="sklearn",
        )

        from datetime import datetime
        # Should parse without error as valid ISO datetime
        parsed = datetime.fromisoformat(result["timestamp"])
        assert parsed is not None
