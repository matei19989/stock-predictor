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

### Step 6 — Sentiment Features via GDELT (`notebooks/06_sentiment_features.ipynb`)
- **FinBERT/Finnhub abandoned:** Finnhub free tier only stores ~1 year of headlines (0 results for 2021-2024). FinBERT on Finnhub data achieved 0.9% coverage and hurt F1 (0.2502 → 0.2434).
- **GDELT V2Tone chosen instead:** 66M records, 427/499 tickers covered, 84% coverage after merge. Free via BigQuery (1 TB/month free tier). Dictionary-based sentiment — no GPU needed.
- **Matching approach:** GDELT V2Organizations uses `Name,CharOffset` format. Names extracted via regex, normalized (lowercase, strip Inc/Corp/Ltd) for fuzzy matching against Wikipedia company names.
- **3 new features:** `sentiment_avg_20d` (rolling 20-day mean tone), `sentiment_volume_20d` (article count), `sentiment_momentum` (avg_20d minus avg_60d)
- **Results (3m horizon, split 2025-09-01):**
  | Model | F1 | Accuracy | MAE | Features |
  |---|---|---|---|---|
  | Technical only (Model A) | 0.2502 | 0.2508 | 1.3860 | 19 |
  | Technical + GDELT (Model B) | **0.2612** | 0.2613 | 1.3651 | 22 |
- **Statistical significance:** Bootstrap 95% CIs — Model A [0.2457, 0.2546] vs Model B [0.2568, 0.2655]. CIs don't overlap → improvement is statistically significant.
- Sentiment feature rankings (out of 22): sentiment_volume_20d #6, sentiment_avg_20d #7, sentiment_momentum #12
- Cache: `notebooks/data/gdelt_sentiment_5y.parquet` (164MB, 66M records)
- **Model saved:** `src/ml/app/models/` — this is the production model

### Step 7 — Model Optimization (`notebooks/07_model_optimization.ipynb`)
- **Goal:** Improve on baseline F1=0.2612 / MAE=1.3651 via systematic optimization
- **Features added:** sector one-hot (11), market-relative vs SPY (6), VIX/regime (3), sentiment lags (4), interaction terms (3), cross-sectional rank features (7) → 56 total
- **Cross-sectional ranks:** For each date, percentile rank each stock's indicator among all S&P 500 peers. ATR_Pct_rank was 6th most important feature (3.0% gain).
- **Optimization attempts and results:**
  | Stage | F1 | MAE | Features |
  |---|---|---|---|
  | Baseline (22 feat, default params) | **0.2645** | **1.3515** | 22 |
  | All new features, default params | 0.2416 | 1.4211 | 56 |
  | Optuna 150 trials (56 features) | 0.2495 | 1.4629 | 56 |
  | Feature selection (56→46) | 0.2558 | 1.4420 | 46 |
  | Calibration + ordinal post-proc | 0.2311 | 1.5191 | 46 |
  | Optuna 50 trials (22 features) | 0.2364 | 1.4543 | 22 |
- **Conclusion: Default XGBoost params (n_estimators=200, max_depth=6, lr=0.1) beat every optimization attempt.** CV-based hyperparameter tuning degraded out-of-sample performance consistently — the late 2025 test period has different statistical properties from the 2022-2025 training folds. Optimization phase closed.
- **Correlated features dropped:** Return_1m↔ROC (r=1.000), MACD_Norm↔MACD_Signal_Norm (r=0.954), sentiment_avg_20d↔sentiment_x_momentum (r=0.954)
- **Survivorship bias noted** in both notebooks: training uses current S&P 500 constituents only — delisted/acquired companies excluded, performance estimates modestly inflated.

## Next Steps

### Step 8 — Port to FastAPI ML Service
- Move `compute_features()`, model loading, and prediction logic to `src/ml/app/`
- Endpoints: `POST /predict`, `GET /health`, `GET /data/{ticker}`, `POST /train`
- Production model: notebook 06 model_b (22 features, default params, F1=0.2612), already in `src/ml/app/models/`
- At inference: query recent GDELT BigQuery → compute same rolling sentiment features → predict

### Step 9 — Backend + Frontend Integration
- .NET backend calls ML service for predictions
- Frontend displays signal with confidence and feature breakdown
- Hangfire background jobs for periodic data refresh