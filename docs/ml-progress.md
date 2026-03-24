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

### Step 5 — Full S&P 500 Training (`notebooks/05_full_sp500_training.ipynb`)
- Scaled pipeline from 5 test stocks to all ~500 S&P 500 constituents
- Batch download: 50 tickers per batch with 2s delay, graceful failure handling
- Downloaded 499/503 tickers (4 failed: GEV, Q, SNDK, SOLV — insufficient history)
- Computed 19 relative features + signal labels for all 3 horizons (3m, 6m, 1y)
- **Threshold adjustments** (original thresholds produced Strong Buy > 30% due to 2020-2025 bull market):
  - 3m: (-8, -3, 3, 8) → (-10, -3, 3, 12) — tightened SS, raised SB
  - 6m: (-12, -4, 5, 12) → (-12, -4, 5, 18) — raised SB
  - 1y: (-15, -5, 8, 20) → (-15, -3, 10, 30) — widened Sell, raised Buy/SB boundaries
  - All classes now within 12-30% rule
- Time-based 80/20 split per horizon, verified no data leakage
- Trained 3 XGBoost models (n_estimators=200, max_depth=6, lr=0.1, class weights)
- **Results (technical indicators only):**
  | Metric | 3m | 6m | 1y |
  |--------|-----|-----|-----|
  | Weighted F1 | 0.2632 | 0.2486 | 0.2511 |
  | Accuracy | 0.2603 | 0.2427 | 0.2563 |
  | MAE (class) | 1.4215 | 1.4642 | 1.4703 |
  | Train samples | 373,317 | 348,367 | 298,004 |
- Top features across all horizons: ATR_Pct, Dist_52w_Low, Dist_52w_High, Price_SMA200_Ratio
- **Key finding:** 100x more data (3,760 → 373K) barely improved F1 (+0.015). The bottleneck is features, not data volume. Technical indicators alone have limited predictive power for multi-class stock signal prediction.
- Models saved to `src/ml/app/models/` (xgb_3m.joblib, xgb_6m.joblib, xgb_1y.joblib + metadata)

## Next Steps

### Step 6 — Sentiment Features (FinBERT) — 3m horizon only
- **Why 3m only:** Free news APIs provide ~1 year of history. With time-based split, only the 3m horizon has enough sentiment overlap in training (~6 months). 6m/1y horizons would have sentiment only in the test set — model can't learn from it.
- **Plan:**
  1. Fetch ~1 year of headlines for 500 stocks via Finnhub (free tier, 60 calls/min)
  2. Run FinBERT to score sentiment per headline
  3. Compute rolling sentiment features: avg score (20-day), news volume, sentiment momentum
  4. Add to dataset: NaN for dates without news (years 1-4), real values for year 5
  5. Re-split 3m data: train up to Sep 2025, test Sep-Dec 2025 (ensures sentiment in both)
  6. Retrain XGBoost with 22 features (19 technical + 3 sentiment)
  7. Compare with vs without sentiment
- **Expected improvement:** F1 from ~0.26 to 0.30-0.35 range (sentiment adds forward-looking signal)
- 6m/1y models remain technical-only — discuss data availability limitation in thesis

### Step 7 — Port to FastAPI ML Service
- Move `compute_features()`, model loading, and prediction logic to `src/ml/app/`
- Endpoints: `POST /predict`, `GET /health`, `GET /data/{ticker}`
- At inference: fetch recent news via Finnhub → FinBERT → sentiment features (always available for live predictions)

### Step 8 — Backend + Frontend Integration
- .NET backend calls ML service for predictions
- Frontend displays signal with confidence and feature breakdown
- Hangfire background jobs for periodic data refresh
