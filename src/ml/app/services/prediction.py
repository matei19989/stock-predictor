"""Prediction service — runs XGBoost inference pipeline.

Orchestrates: data fetch → feature engineering → sentiment → model inference.
"""

import logging
from datetime import datetime, timezone

import numpy as np
import pandas as pd

from app.services.data_fetcher import fetch_ohlcv
from app.services.feature_engineering import compute_features
from app.services.sentiment import (
    compute_sentiment_features,
    fetch_sentiment,
)

logger = logging.getLogger(__name__)

SENTIMENT_FEATURES = ["sentiment_avg_20d", "sentiment_volume_20d", "sentiment_momentum"]

# With 5 classes, uniform random gives ~0.20 confidence per class.
# Flag predictions below this threshold as low-confidence.
LOW_CONFIDENCE_THRESHOLD = 0.30


def run_prediction(
    ticker: str,
    horizon: str,
    model: object,
    label_encoder: object,
    feature_columns: list[str],
    ticker_to_company: dict[str, str],
) -> dict:
    """Run the full prediction pipeline for a single ticker.

    Args:
        ticker: Stock ticker symbol.
        horizon: Prediction horizon ("3m", "6m", "1y").
        model: Loaded XGBoost model.
        label_encoder: Loaded LabelEncoder for signal names.
        feature_columns: Ordered list of feature column names the model expects.
        ticker_to_company: Mapping from ticker to cleaned company name.

    Returns:
        Dict with signal, confidence, probabilities, features_used, timestamp.

    Raises:
        ValueError: If data fetching or feature computation fails.
    """
    # Fetch 2 years — 252-day rolling windows need ≥252 rows for valid latest values
    df = fetch_ohlcv(ticker, period="2y")
    df = compute_features(df)

    # Sentiment features degrade gracefully (NaN if unavailable, XGBoost handles natively)
    sentiment_values = _get_sentiment_features(ticker, df.index, ticker_to_company)
    for feat in SENTIMENT_FEATURES:
        df[feat] = sentiment_values.get(feat, float("nan"))

    latest = df.iloc[[-1]]
    X = latest[feature_columns].values

    proba = model.predict_proba(X)[0]
    predicted_class = int(np.argmax(proba))
    signal = label_encoder.inverse_transform([predicted_class])[0]
    confidence = float(proba[predicted_class])

    all_labels = label_encoder.classes_
    probabilities = {label: round(float(p), 4) for label, p in zip(all_labels, proba)}

    return {
        "ticker": ticker,
        "horizon": horizon,
        "signal": signal,
        "confidence": round(confidence, 4),
        "probabilities": probabilities,
        "features_used": len(feature_columns),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "low_confidence": confidence < LOW_CONFIDENCE_THRESHOLD,
    }


def _get_sentiment_features(
    ticker: str,
    trading_dates: pd.DatetimeIndex,
    ticker_to_company: dict[str, str],
) -> dict[str, float]:
    """Fetch sentiment and compute features, returning NaN on failure."""
    company_name = ticker_to_company.get(ticker)
    if not company_name:
        logger.info("No company name mapping for %s — sentiment features will be NaN", ticker)
        return {}

    sentiment_df = fetch_sentiment(ticker, company_name, days=90)
    if sentiment_df is None or sentiment_df.empty:
        logger.info("No sentiment data for %s — features will be NaN", ticker)
        return {}

    try:
        return compute_sentiment_features(sentiment_df, trading_dates)
    except Exception as e:
        logger.warning("Sentiment feature computation failed for %s: %s", ticker, e)
        return {}
