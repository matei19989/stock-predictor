"""Tests for FastAPI route endpoints using TestClient."""

from unittest.mock import MagicMock, patch

import numpy as np
import pandas as pd
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.routes import data, health, predict


@pytest.fixture
def app_healthy() -> FastAPI:
    """Create a test app with models loaded for all horizons."""
    app = FastAPI()
    app.state.model_loaded = True
    mock_model = MagicMock()
    app.state.models = {
        "3m": {"model": mock_model, "type": "sklearn"},
        "6m": {"model": mock_model, "type": "sklearn"},
        "1y": {"model": mock_model, "type": "sklearn"},
    }
    app.state.label_encoder = MagicMock()
    app.state.feature_columns = ["feat_" + str(i) for i in range(22)]
    app.state.training_metadata = {}
    app.state.ticker_to_company = {"AAPL": "apple"}

    app.include_router(health.router)
    app.include_router(data.router)
    app.include_router(predict.router)
    return app


@pytest.fixture
def app_degraded() -> FastAPI:
    """Create a test app with model_loaded=False."""
    app = FastAPI()
    app.state.model_loaded = False
    app.state.models = {}
    app.state.label_encoder = None
    app.state.feature_columns = []
    app.state.training_metadata = {}
    app.state.ticker_to_company = {}

    app.include_router(health.router)
    app.include_router(data.router)
    app.include_router(predict.router)
    return app


class TestHealthEndpoint:
    def test_healthy_when_model_loaded(self, app_healthy: FastAPI):
        client = TestClient(app_healthy)
        response = client.get("/health")

        assert response.status_code == 200
        body = response.json()
        assert body["status"] == "healthy"
        assert body["model_loaded"] is True
        assert set(body["horizons"]) == {"3m", "6m", "1y"}

    def test_degraded_when_model_not_loaded(self, app_degraded: FastAPI):
        client = TestClient(app_degraded)
        response = client.get("/health")

        assert response.status_code == 200
        body = response.json()
        assert body["status"] == "degraded"
        assert body["model_loaded"] is False
        assert body["horizons"] == []


class TestDataEndpoint:
    @patch("app.routes.data.fetch_stock_info")
    @patch("app.routes.data.fetch_ohlcv")
    def test_returns_stock_data(self, mock_fetch: MagicMock, mock_info: MagicMock, app_healthy: FastAPI):
        mock_info.return_value = {"name": None, "sector": None}
        dates = pd.bdate_range(start="2024-01-02", periods=3)
        mock_fetch.return_value = pd.DataFrame(
            {
                "Open": [150.0, 151.0, 152.0],
                "High": [155.0, 156.0, 157.0],
                "Low": [148.0, 149.0, 150.0],
                "Close": [153.0, 154.0, 155.0],
                "Volume": [1000000, 1100000, 1200000],
            },
            index=dates,
        )

        client = TestClient(app_healthy)
        response = client.get("/data/AAPL?period=5y")

        assert response.status_code == 200
        body = response.json()
        assert body["ticker"] == "AAPL"
        assert body["count"] == 3
        assert len(body["data"]) == 3
        assert body["data"][0]["date"] == "2024-01-02"

    @patch("app.routes.data.fetch_ohlcv")
    def test_ticker_not_found_returns_404(self, mock_fetch: MagicMock, app_healthy: FastAPI):
        mock_fetch.side_effect = ValueError("No data returned")

        client = TestClient(app_healthy)
        response = client.get("/data/FAKEZ")

        assert response.status_code == 404

    @patch("app.routes.data.fetch_ohlcv")
    def test_fetch_error_returns_502(self, mock_fetch: MagicMock, app_healthy: FastAPI):
        mock_fetch.side_effect = RuntimeError("yfinance connection error")

        client = TestClient(app_healthy)
        response = client.get("/data/AAPL")

        assert response.status_code == 502

    @patch("app.routes.data.fetch_stock_info")
    @patch("app.routes.data.fetch_ohlcv")
    def test_uppercases_ticker(self, mock_fetch: MagicMock, mock_info: MagicMock, app_healthy: FastAPI):
        mock_info.return_value = {"name": None, "sector": None}
        dates = pd.bdate_range(start="2024-01-02", periods=1)
        mock_fetch.return_value = pd.DataFrame(
            {"Open": [100.0], "High": [101.0], "Low": [99.0], "Close": [100.0], "Volume": [1000]},
            index=dates,
        )

        client = TestClient(app_healthy)
        response = client.get("/data/aapl")

        assert response.status_code == 200
        assert response.json()["ticker"] == "AAPL"
        mock_fetch.assert_called_once_with("AAPL", period="5y")

    @patch("app.routes.data.fetch_stock_info")
    @patch("app.routes.data.fetch_ohlcv")
    def test_returns_name_and_sector(self, mock_fetch: MagicMock, mock_info: MagicMock, app_healthy: FastAPI):
        dates = pd.bdate_range(start="2024-01-02", periods=1)
        mock_fetch.return_value = pd.DataFrame(
            {"Open": [150.0], "High": [155.0], "Low": [148.0], "Close": [153.0], "Volume": [1000000]},
            index=dates,
        )
        mock_info.return_value = {"name": "Apple Inc.", "sector": "Technology"}
        client = TestClient(app_healthy)
        response = client.get("/data/AAPL")
        assert response.status_code == 200
        body = response.json()
        assert body["name"] == "Apple Inc."
        assert body["sector"] == "Technology"

    @patch("app.routes.data.fetch_stock_info")
    @patch("app.routes.data.fetch_ohlcv")
    def test_null_name_sector_when_info_unavailable(self, mock_fetch: MagicMock, mock_info: MagicMock, app_healthy: FastAPI):
        dates = pd.bdate_range(start="2024-01-02", periods=1)
        mock_fetch.return_value = pd.DataFrame(
            {"Open": [150.0], "High": [155.0], "Low": [148.0], "Close": [153.0], "Volume": [1000000]},
            index=dates,
        )
        mock_info.return_value = {"name": None, "sector": None}
        client = TestClient(app_healthy)
        response = client.get("/data/AAPL")
        assert response.status_code == 200
        body = response.json()
        assert body["name"] is None
        assert body["sector"] is None


class TestPredictEndpoint:
    @patch("app.routes.predict.run_prediction")
    def test_successful_prediction(self, mock_predict: MagicMock, app_healthy: FastAPI):
        mock_predict.return_value = {
            "ticker": "AAPL",
            "horizon": "3m",
            "signal": "Buy",
            "confidence": 0.3456,
            "probabilities": {
                "Strong Sell": 0.05, "Sell": 0.10,
                "Hold": 0.25, "Buy": 0.3456, "Strong Buy": 0.2544,
            },
            "features_used": 22,
            "timestamp": "2024-01-01T00:00:00+00:00",
            "low_confidence": False,
        }

        client = TestClient(app_healthy)
        response = client.post("/predict", json={"ticker": "AAPL", "horizon": "3m"})

        assert response.status_code == 200
        body = response.json()
        assert body["signal"] == "Buy"
        assert body["confidence"] == 0.3456
        assert body["features_used"] == 22

    def test_model_not_loaded_returns_503(self, app_degraded: FastAPI):
        client = TestClient(app_degraded)
        response = client.post("/predict", json={"ticker": "AAPL", "horizon": "3m"})

        assert response.status_code == 503

    def test_missing_horizon_model_returns_501(self, app_healthy: FastAPI):
        """A horizon whose model entry is None should return 501."""
        app_healthy.state.models["6m"] = None
        client = TestClient(app_healthy)
        response = client.post("/predict", json={"ticker": "AAPL", "horizon": "6m"})

        assert response.status_code == 501

    @patch("app.routes.predict.run_prediction")
    def test_data_fetch_failure_returns_502(self, mock_predict: MagicMock, app_healthy: FastAPI):
        mock_predict.side_effect = ValueError("No data returned")

        client = TestClient(app_healthy)
        response = client.post("/predict", json={"ticker": "AAPL", "horizon": "3m"})

        assert response.status_code == 502

    @patch("app.routes.predict.run_prediction")
    def test_unexpected_error_returns_500(self, mock_predict: MagicMock, app_healthy: FastAPI):
        mock_predict.side_effect = RuntimeError("Something unexpected")

        client = TestClient(app_healthy)
        response = client.post("/predict", json={"ticker": "AAPL", "horizon": "3m"})

        assert response.status_code == 500

    def test_missing_ticker_returns_422(self, app_healthy: FastAPI):
        """Pydantic validation should reject missing required fields."""
        client = TestClient(app_healthy)
        response = client.post("/predict", json={"horizon": "3m"})

        assert response.status_code == 422

    def test_invalid_horizon_value_returns_422(self, app_healthy: FastAPI):
        """Pydantic Literal validation should reject invalid horizon."""
        client = TestClient(app_healthy)
        response = client.post("/predict", json={"ticker": "AAPL", "horizon": "2y"})

        assert response.status_code == 422

    def test_predict_empty_ticker_returns_422(self, app_healthy: FastAPI):
        """Pydantic min_length=1 validation should reject empty ticker."""
        client = TestClient(app_healthy)
        response = client.post("/predict", json={"ticker": "", "horizon": "3m"})

        assert response.status_code == 422

    @patch("app.routes.predict.run_prediction")
    def test_6m_prediction_succeeds(self, mock_predict: MagicMock, app_healthy: FastAPI):
        mock_predict.return_value = {
            "ticker": "AAPL", "horizon": "6m", "signal": "Hold",
            "confidence": 0.28, "probabilities": {
                "Strong Sell": 0.10, "Sell": 0.15, "Hold": 0.28, "Buy": 0.27, "Strong Buy": 0.20,
            },
            "features_used": 22, "timestamp": "2024-01-01T00:00:00+00:00", "low_confidence": True,
        }

        client = TestClient(app_healthy)
        response = client.post("/predict", json={"ticker": "AAPL", "horizon": "6m"})

        assert response.status_code == 200
        assert response.json()["horizon"] == "6m"

    @patch("app.routes.predict.run_prediction")
    def test_1y_prediction_succeeds(self, mock_predict: MagicMock, app_healthy: FastAPI):
        mock_predict.return_value = {
            "ticker": "AAPL", "horizon": "1y", "signal": "Buy",
            "confidence": 0.32, "probabilities": {
                "Strong Sell": 0.08, "Sell": 0.12, "Hold": 0.22, "Buy": 0.32, "Strong Buy": 0.26,
            },
            "features_used": 22, "timestamp": "2024-01-01T00:00:00+00:00", "low_confidence": False,
        }

        client = TestClient(app_healthy)
        response = client.post("/predict", json={"ticker": "AAPL", "horizon": "1y"})

        assert response.status_code == 200
        assert response.json()["horizon"] == "1y"


class TestDataEndpointEdgeCases:
    @patch("app.routes.data.fetch_stock_info")
    @patch("app.routes.data.fetch_ohlcv")
    def test_data_endpoint_uppercases_ticker(self, mock_fetch: MagicMock, mock_info: MagicMock, app_healthy: FastAPI):
        """GET /data/aapl should return ticker as 'AAPL'."""
        mock_info.return_value = {"name": None, "sector": None}
        dates = pd.bdate_range(start="2024-01-02", periods=1)
        mock_fetch.return_value = pd.DataFrame(
            {"Open": [100.0], "High": [101.0], "Low": [99.0], "Close": [100.0], "Volume": [1000]},
            index=dates,
        )

        client = TestClient(app_healthy)
        response = client.get("/data/aapl")

        assert response.status_code == 200
        assert response.json()["ticker"] == "AAPL"

    @patch("app.routes.data.fetch_stock_info")
    @patch("app.routes.data.fetch_ohlcv")
    def test_data_default_period_is_5y(self, mock_fetch: MagicMock, mock_info: MagicMock, app_healthy: FastAPI):
        """GET /data/AAPL without period param should use 5y default."""
        mock_info.return_value = {"name": None, "sector": None}
        dates = pd.bdate_range(start="2024-01-02", periods=1)
        mock_fetch.return_value = pd.DataFrame(
            {"Open": [100.0], "High": [101.0], "Low": [99.0], "Close": [100.0], "Volume": [1000]},
            index=dates,
        )

        client = TestClient(app_healthy)
        response = client.get("/data/AAPL")

        assert response.status_code == 200
        assert response.json()["period"] == "5y"
        mock_fetch.assert_called_once_with("AAPL", period="5y")
