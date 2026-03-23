# ML Progress

## Completed Steps

### Step 1 — Data Exploration (`notebooks/01_data_exploration.ipynb`)
- Pulled S&P 500 ticker list from Wikipedia (~500 tickers)
- Fetched 5 years of OHLCV data via yfinance for 5 test stocks (AAPL, MSFT, JPM, JNJ, XOM)
- Verified: 1255 rows per stock, zero missing values, charts look correct

### Step 2 — Feature Engineering (`notebooks/02_feature_engineering.ipynb`)
- Computed 21 technical indicator features across 5 categories:
  - Trend: SMA 50, SMA 200, EMA 20, MACD (line + signal + histogram)
  - Momentum: RSI (14), Stochastic Oscillator (%K, %D), ROC
  - Volatility: Bollinger Bands (upper, lower, bandwidth), ATR
  - Volume: OBV, Volume/SMA ratio
  - Price-derived: Price/SMA200 ratio, 52-week high/low distance, monthly returns (1m, 3m)
- Warm-up cost: ~251 rows lost per stock (longest window = 252 days for 52-week indicators)
- Packaged into reusable `compute_features()` function

### Step 3 — Labeling (`notebooks/03_labeling.ipynb`)
- Computed future returns for each horizon (3m=63 days, 6m=126, 1y=252 trading days)
- Assigned signal labels (Strong Sell / Sell / Hold / Buy / Strong Buy) using fixed return thresholds
- Thresholds: 3m (-8%/-3%/+3%/+8%), 6m (-12%/-4%/+5%/+12%), 1y (-15%/-5%/+8%/+20%)
- Class distribution on 5 stocks is skewed toward Strong Buy (36-39%) — expected because all 5 are bull market winners
- **Decision:** keep current thresholds, re-evaluate after full S&P 500 training

### Step 4 — Baseline XGBoost (`notebooks/04_baseline_xgboost.ipynb`)
- Trained XGBoost multi-class classifier on 3m horizon with 5 test stocks
- Time-based 80/20 split (train: 2022-03 to 2025-03, test: 2025-03 to 2025-12)
- Used class weights (`sample_weight`) to handle imbalance
- Results (3m baseline): Weighted F1 = 0.27, Accuracy = 0.25, MAE = 1.41
- Results are weak but expected — only 3760 training samples from 5 stocks
- Top features: OBV, SMA_200, Price/SMA200 ratio, 52-week high/low distance
- Pipeline confirmed working end-to-end

## Next Steps
1. Scale to all ~500 S&P 500 stocks (the real training run)
2. Re-check class distribution at full scale — adjust thresholds if needed
3. Train models for all 3 horizons (3m, 6m, 1y)
4. Add sentiment features (FinBERT)
5. Port working code to `src/ml/app/services/`
