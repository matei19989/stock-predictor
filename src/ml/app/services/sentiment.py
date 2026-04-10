"""GDELT BigQuery sentiment fetching and feature computation.

Ported from notebooks/06_sentiment_features.ipynb — queries GDELT for
news sentiment and computes rolling features for inference.
"""

import logging
import re
import threading
import time
from datetime import datetime, timedelta, timezone

import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)

_bq_client = None
_bq_lock = threading.Lock()

# TTL cache for GDELT sentiment queries: {key: (DataFrame, timestamp)}
_sentiment_cache: dict[str, tuple[pd.DataFrame | None, float]] = {}
_sentiment_lock = threading.Lock()
_SENTIMENT_TTL = 3600  # 1 hour


def _get_bq_client():
    """Return a cached BigQuery client (created once, reused across requests).

    Credential resolution order:
    1. GCP_CREDENTIALS_JSON env var (base64-encoded service account JSON — safe for deployment)
    2. GOOGLE_APPLICATION_CREDENTIALS env var (path to JSON file — local Docker)
    3. Application Default Credentials (gcloud auth — local dev)
    """
    global _bq_client
    if _bq_client is not None:
        return _bq_client
    with _bq_lock:
        if _bq_client is None:
            try:
                import json
                import os

                from google.cloud import bigquery

                creds_json = os.environ.get("GCP_CREDENTIALS_JSON")
                if creds_json:
                    import base64
                    from google.oauth2 import service_account
                    info = json.loads(base64.b64decode(creds_json))
                    credentials = service_account.Credentials.from_service_account_info(info)
                    _bq_client = bigquery.Client(credentials=credentials, project=info["project_id"])
                else:
                    project = os.environ.get("GCP_PROJECT_ID")
                    _bq_client = bigquery.Client(project=project) if project else bigquery.Client()
            except Exception:
                return None
    return _bq_client


# BigQuery SQL — matches the training notebook's cleaning logic exactly
_GDELT_QUERY = """
SELECT
    article_date,
    cleaned_org AS matched_org,
    tone
FROM (
  SELECT
    SUBSTR(CAST(DATE AS STRING), 1, 8) AS article_date,
    TRIM(REGEXP_REPLACE(
      REGEXP_REPLACE(
        REGEXP_REPLACE(
          REGEXP_REPLACE(
            LOWER(TRIM(COALESCE(
              REGEXP_EXTRACT(org_entry, r'^(.+),\\d+$'),
              org_entry
            ))),
            r'[,.]', ' '
          ),
          r'\\s+', ' '
        ),
        r'^the ', ''
      ),
      r' (inc|corp|co|ltd|llc|plc|lp|nv|sa|corporation|incorporated|company|companies|holdings|group|enterprises?|international)\\s*$',
      ''
    )) AS cleaned_org,
    SAFE_CAST(SPLIT(V2Tone, ',')[SAFE_OFFSET(0)] AS FLOAT64) AS tone
  FROM `gdelt-bq.gdeltv2.gkg_partitioned`,
  UNNEST(SPLIT(V2Organizations, ';')) AS org_entry
  WHERE _PARTITIONTIME >= TIMESTAMP(@start_date)
    AND _PARTITIONTIME < TIMESTAMP(@end_date)
    AND V2Organizations IS NOT NULL
    AND V2Tone IS NOT NULL
)
WHERE cleaned_org IN UNNEST(@names)
"""


def clean_company_name(name: str) -> str:
    """Normalize a company name for GDELT matching.

    Strips suffixes (Inc, Corp, etc.), leading 'The', commas, and periods
    so Wikipedia names and GDELT org names normalize to the same form.
    """
    name = name.lower().strip()
    name = name.replace(",", " ").replace(".", " ")
    name = re.sub(r"\s+", " ", name).strip()
    name = re.sub(r"^the ", "", name)
    name = re.sub(r"\s*&\s*co\s*$", "", name)
    name = re.sub(
        r"\s+(inc|corp|co|ltd|llc|plc|lp|nv|sa|corporation|incorporated|"
        r"company|companies|holdings|group|enterprises?|international)\s*$",
        "",
        name,
    )
    return name.strip()


def _build_ticker_mapping(training_metadata: dict) -> dict[str, str]:
    """Build ticker→company mapping from Wikipedia S&P 500 table.

    Falls back to a simple ticker-as-name if Wikipedia fetch fails.
    """
    try:
        import requests

        resp = requests.get(
            "https://en.wikipedia.org/wiki/List_of_S%26P_500_companies",
            headers={"User-Agent": "StockPredictor/1.0 (academic thesis project)"},
            timeout=15,
        )
        resp.raise_for_status()
        sp500_table = pd.read_html(resp.text)[0]

        mapping: dict[str, str] = {}
        training_tickers = set(training_metadata.get("training_tickers", []))

        for ticker in training_tickers:
            row = sp500_table[sp500_table["Symbol"] == ticker]
            if row.empty:
                row = sp500_table[sp500_table["Symbol"] == ticker.replace("-", ".")]
            if not row.empty:
                raw_name = row.iloc[0]["Security"]
                mapping[ticker] = clean_company_name(raw_name)

        logger.info("Built ticker→company mapping: %d tickers", len(mapping))
        return mapping

    except Exception:
        logger.warning("Failed to fetch Wikipedia S&P 500 table, ticker mapping unavailable")
        return {}


def fetch_sentiment(
    ticker: str,
    company_name: str,
    days: int = 90,
) -> pd.DataFrame | None:
    """Query GDELT BigQuery for recent sentiment data for a company.

    Args:
        ticker: Stock ticker (for logging).
        company_name: Cleaned company name to match in GDELT.
        days: Number of days of history to fetch.

    Returns:
        DataFrame with columns [date, sentiment] or None if query fails.
    """
    cache_key = f"{ticker}:{days}"
    with _sentiment_lock:
        if cache_key in _sentiment_cache:
            cached_df, ts = _sentiment_cache[cache_key]
            if time.time() - ts < _SENTIMENT_TTL:
                logger.info("Sentiment cache hit for %s", ticker)
                return cached_df.copy() if cached_df is not None else None
            del _sentiment_cache[cache_key]

    client = _get_bq_client()
    if client is None:
        logger.warning("BigQuery client unavailable — skipping sentiment for %s", ticker)
        return None

    from google.cloud import bigquery

    end_date = datetime.now(timezone.utc)
    start_date = end_date - timedelta(days=days)

    job_config = bigquery.QueryJobConfig(
        query_parameters=[
            bigquery.ScalarQueryParameter("start_date", "STRING", start_date.strftime("%Y-%m-%d")),
            bigquery.ScalarQueryParameter("end_date", "STRING", end_date.strftime("%Y-%m-%d")),
            bigquery.ArrayQueryParameter("names", "STRING", [company_name]),
        ]
    )

    try:
        logger.info("Querying GDELT for '%s' (%s), last %d days", company_name, ticker, days)
        result = client.query(_GDELT_QUERY, job_config=job_config).to_dataframe()
    except Exception as e:
        logger.warning("GDELT query failed for %s: %s", ticker, e)
        return None

    if result.empty:
        logger.info("No GDELT articles found for %s", ticker)
        with _sentiment_lock:
            _sentiment_cache[cache_key] = (None, time.time())
        return None

    # Parse article_date (YYYYMMDD string) to datetime
    result["date"] = pd.to_datetime(result["article_date"], format="%Y%m%d")

    # Normalize tone to [-1, +1]
    result["sentiment"] = np.clip(result["tone"] / 10, -1, 1)

    out = result[["date", "sentiment"]]
    with _sentiment_lock:
        _sentiment_cache[cache_key] = (out.copy(), time.time())

    return out


def compute_sentiment_features(
    sentiment_df: pd.DataFrame,
    trading_dates: pd.DatetimeIndex,
) -> dict[str, float]:
    """Compute rolling sentiment features from raw sentiment data.

    Args:
        sentiment_df: DataFrame with columns [date, sentiment].
        trading_dates: Trading date index to align to.

    Returns:
        Dict with sentiment_avg_20d, sentiment_volume_20d, sentiment_momentum
        for the latest trading date.
    """
    # Aggregate by date: mean sentiment and article count
    daily = sentiment_df.groupby("date").agg(
        daily_sentiment=("sentiment", "mean"),
        daily_count=("sentiment", "count"),
    )

    # Align to trading dates
    daily_aligned = daily.reindex(trading_dates)
    daily_aligned["daily_sentiment"] = daily_aligned["daily_sentiment"].ffill()
    daily_aligned["daily_count"] = daily_aligned["daily_count"].fillna(0)

    # Compute rolling features
    sent_avg_20 = daily_aligned["daily_sentiment"].rolling(20, min_periods=5).mean()
    sent_avg_60 = daily_aligned["daily_sentiment"].rolling(60, min_periods=10).mean()
    sent_vol_20 = daily_aligned["daily_count"].rolling(20, min_periods=1).sum()

    # Return the latest values
    return {
        "sentiment_avg_20d": sent_avg_20.iloc[-1] if not sent_avg_20.empty else float("nan"),
        "sentiment_volume_20d": sent_vol_20.iloc[-1] if not sent_vol_20.empty else float("nan"),
        "sentiment_momentum": (
            (sent_avg_20.iloc[-1] - sent_avg_60.iloc[-1])
            if not sent_avg_20.empty and not sent_avg_60.empty
            else float("nan")
        ),
    }
