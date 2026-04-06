"""Technical indicator feature engineering.

Ported from notebooks/07_model_optimization.ipynb — computes the 19
technical features used by the XGBoost model.
"""

import numpy as np
import pandas as pd


def compute_features(df: pd.DataFrame) -> pd.DataFrame:
    """Compute all 19 technical indicator features from OHLCV data.

    Args:
        df: DataFrame with columns Close, High, Low, Volume (and Open).

    Returns:
        DataFrame with original columns plus 19 technical features.
    """
    df = df.copy()
    if isinstance(df.columns, pd.MultiIndex):
        df.columns = df.columns.get_level_values(0)

    # --- Trend ---
    sma_50 = df["Close"].rolling(50).mean()
    sma_200 = df["Close"].rolling(200).mean()
    ema_20 = df["Close"].ewm(span=20, adjust=False).mean()
    df["Price_SMA50_Ratio"] = df["Close"] / sma_50
    df["Price_SMA200_Ratio"] = df["Close"] / sma_200
    df["Price_EMA20_Ratio"] = df["Close"] / ema_20

    ema_12 = df["Close"].ewm(span=12, adjust=False).mean()
    ema_26 = df["Close"].ewm(span=26, adjust=False).mean()
    macd_raw = ema_12 - ema_26
    macd_sig = macd_raw.ewm(span=9, adjust=False).mean()
    df["MACD_Norm"] = macd_raw / df["Close"] * 100
    df["MACD_Signal_Norm"] = macd_sig / df["Close"] * 100
    df["MACD_Hist_Norm"] = df["MACD_Norm"] - df["MACD_Signal_Norm"]

    # --- Momentum ---
    delta = df["Close"].diff()
    gain = delta.where(delta > 0, 0.0)
    loss = -delta.where(delta < 0, 0.0)
    avg_gain = gain.ewm(alpha=1 / 14, min_periods=14, adjust=False).mean()
    avg_loss = loss.ewm(alpha=1 / 14, min_periods=14, adjust=False).mean()
    df["RSI"] = 100 - (100 / (1 + avg_gain / avg_loss))

    low_14 = df["Low"].rolling(14).min()
    high_14 = df["High"].rolling(14).max()
    stoch_range = high_14 - low_14
    df["Stoch_K"] = 100 * (df["Close"] - low_14) / stoch_range
    df["Stoch_D"] = df["Stoch_K"].rolling(3).mean()
    df["ROC"] = df["Close"].pct_change(21) * 100

    # --- Volatility ---
    bb_sma = df["Close"].rolling(20).mean()
    bb_std = df["Close"].rolling(20).std()
    bb_upper = bb_sma + 2 * bb_std
    bb_lower = bb_sma - 2 * bb_std
    df["BB_Position"] = (df["Close"] - bb_lower) / (bb_upper - bb_lower)
    df["BB_Width"] = (bb_upper - bb_lower) / bb_sma

    tr = pd.concat(
        [
            df["High"] - df["Low"],
            (df["High"] - df["Close"].shift(1)).abs(),
            (df["Low"] - df["Close"].shift(1)).abs(),
        ],
        axis=1,
    ).max(axis=1)
    df["ATR_Pct"] = tr.rolling(14).mean() / df["Close"] * 100

    # --- Volume ---
    obv = (np.sign(df["Close"].diff()) * df["Volume"]).cumsum()
    df["OBV_Norm"] = obv.diff(21) / df["Volume"].rolling(21).mean()
    df["Vol_SMA_Ratio"] = df["Volume"] / df["Volume"].rolling(20).mean()

    # --- Price-derived ---
    df["Dist_52w_High"] = (
        (df["Close"] - df["High"].rolling(252).max())
        / df["High"].rolling(252).max()
        * 100
    )
    df["Dist_52w_Low"] = (
        (df["Close"] - df["Low"].rolling(252).min())
        / df["Low"].rolling(252).min()
        * 100
    )
    df["Return_1m"] = df["Close"].pct_change(21) * 100
    df["Return_3m"] = df["Close"].pct_change(63) * 100

    return df
