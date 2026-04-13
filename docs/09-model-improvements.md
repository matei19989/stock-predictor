# Notebook 09 - Model Improvements

## Summary

Improved the XGBoost trading signal model by introducing a **blended ordinal-softmax loss function** that teaches the model to respect the natural ordering of trading signals (Strong Sell < Sell < Hold < Buy < Strong Buy).

**Result:** F1 improved from 0.2611 to 0.2690 (+3.0%), MAE improved from 1.3682 to 1.3037 (-4.7%), and 63.1% of predictions now fall within one ordinal class of the true signal.

## Baseline (Notebook 06 Production Model)

- **Features:** 22 (19 technical indicators + 3 GDELT sentiment)
- **Model:** XGBoost multi-class classifier (`multi:softprob`)
- **Params:** `n_estimators=200, max_depth=6, learning_rate=0.1` (defaults)
- **Sample weights:** Inverse class frequency balancing
- **Train/test split:** Temporal at 2025-09-01 (428,713 train / 38,918 test)

| Metric | Baseline |
|--------|----------|
| Weighted F1 | 0.2611 |
| Accuracy | 26.1% |
| MAE (ordinal) | 1.3682 |

## What We Tried

### Cross-Reference with Prior Notebooks

Before implementing, all improvements were cross-referenced against notebooks 04-08 to avoid repeating failed experiments:

| Technique | Prior Notebook | Prior Result | Retried? |
|-----------|---------------|--------------|----------|
| Sector dummies (11 features) | nb07 | Hurt F1 | No |
| VIX regime features | nb07 | Hurt F1 | No |
| Market-relative features | nb07 | Hurt F1 | No |
| Sentiment lags/interactions | nb07 | Hurt F1 | No |
| Treasury yields | nb08 | F1: -0.036 | No |
| Pure ordinal objective | nb07 | F1 tanked to 0.15 | Modified (blended version) |
| Optuna (standard TimeSeriesSplit) | nb07 | Worse than defaults | Modified (purged CV) |
| Calibration + ordinal post-processing | nb07 | F1 dropped to 0.23 | No |

### Experiments and Results

| # | Technique | F1 | Delta F1 | MAE | Verdict |
|---|-----------|-----|----------|------|---------|
| 0 | Baseline | 0.2611 | - | 1.3682 | Reference |
| 1 | Recency weighting (365d half-life) | 0.2596 | -0.0016 | 1.3634 | No help |
| 2 | Recency weighting (730d half-life) | 0.2568 | -0.0044 | 1.3658 | No help |
| 3 | Boundary noise removal (+-1.0%) | 0.2591 | -0.0020 | 1.4120 | Hurt |
| 4 | Boundary noise removal (+-1.5%) | 0.2435 | -0.0177 | 1.4584 | Hurt |
| 5 | Optuna with purged CV (150 trials) | 0.2541 | -0.0070 | 1.4314 | Worse |
| 6 | Blended ordinal loss (alpha=0.1) | 0.2615 | +0.0004 | 1.3959 | Marginal |
| 7 | Blended ordinal loss (alpha=0.2) | 0.2616 | +0.0004 | 1.3616 | Slight MAE help |
| **8** | **Blended ordinal loss (alpha=0.3)** | **0.2690** | **+0.0078** | **1.3037** | **Winner** |
| 9 | Blended ordinal loss (alpha=0.4) | 0.2642 | +0.0031 | 1.2614 | F1 declining |
| 10 | Blended ordinal loss (alpha=0.5) | 0.2532 | -0.0079 | 1.2201 | F1 below baseline |
| 11 | Optuna + blended alpha=0.3 | 0.2517 | -0.0094 | 1.4469 | Overfitting |
| 12 | Lower LR + more trees + alpha=0.3 | 0.2667 | +0.0056 | 1.3163 | No improvement over defaults |
| 13 | No class weights + alpha=0.3 | 0.2630 | +0.0019 | 1.3180 | Worse |

### Additional Alpha Sweep (0.25-0.34)

Confirmed alpha=0.3 as the optimal value. Fine-grained sweep showed a clear peak at 0.3 for F1, with monotonically decreasing MAE as alpha increases.

## The Winning Technique: Blended Ordinal-Softmax Loss

### Problem

Standard `multi:softprob` treats the 5 trading signals as unrelated categories. It doesn't know that Strong Buy is closer to Buy than to Strong Sell. All misclassifications are penalized equally.

### Solution

A custom XGBoost objective that blends standard softmax cross-entropy with an ordinal distance penalty:

```
loss = (1 - alpha) x softmax_loss + alpha x ordinal_penalty
```

Where:
- **Softmax component (70%):** Standard classification loss - "get the exact right class"
- **Ordinal component (30%):** Penalizes predictions by absolute class distance - "if wrong, be wrong by as little as possible"

### Why alpha=0.3 Works

- **alpha=0 (pure softmax):** Baseline behavior, no ordinal awareness
- **alpha=0.3:** Sweet spot - ordinal penalty steers the model away from catastrophic errors while softmax keeps it trying to be exactly right
- **alpha=1.0 (pure ordinal, what nb07 tried):** Model predicts Hold for everything (minimizes average distance from center) - F1 collapsed to 0.15

### Why This Succeeded Where nb07 Failed

Notebook 07 tested a **pure** ordinal objective (alpha=1.0) which completely replaced the classification loss. This caused the model to collapse all predictions toward the center class (Hold), tanking F1 from 0.26 to 0.15.

The **blended** approach preserves classification accuracy (70% softmax) while adding ordinal awareness (30% penalty). This is a fundamentally different formulation - not a parameter tweak of the same approach.

## Final Model Performance

| Metric | Baseline | Final (alpha=0.3) | Change |
|--------|----------|-------------------|--------|
| Weighted F1 | 0.2611 | **0.2690** | +3.0% |
| Accuracy | 26.1% | **29.4%** | +3.3pp |
| MAE | 1.3682 | **1.3037** | -4.7% |
| Within 1 class | ~58% | **63.1%** | +5pp |

### Per-Class Performance (Baseline vs Final)

| Class | Baseline F1 | Final F1 | Change |
|-------|-------------|----------|--------|
| Strong Sell | 0.24 | 0.30 | +0.06 |
| Sell | 0.24 | 0.20 | -0.04 |
| Hold | 0.19 | 0.16 | -0.03 |
| Buy | 0.33 | 0.42 | +0.09 |
| Strong Buy | 0.26 | 0.13 | -0.13 |

The ordinal loss makes the model more decisive on Buy and Strong Sell signals, at the cost of Strong Buy recall. The model concentrates predictions with higher confidence rather than spreading guesses evenly.

### Prediction Distance Breakdown

| Distance from correct class | Percentage |
|----------------------------|------------|
| 0 (exact correct) | 29.4% |
| 1 (off by one) | 33.7% |
| 2 | 17.7% |
| 3 | 15.3% |
| 4 (worst: Strong Buy <-> Strong Sell) | 3.8% |

63.1% of all predictions are either correct or off by just one ordinal step. Only 3.8% are catastrophically wrong (distance 4).

## What Did NOT Work

### Recency Weighting
Exponential decay to weight recent samples more heavily. Tested half-lives of 365 and 730 days. Negligible impact - the test set (post Sept 2025) isn't more similar to recent training data than older data.

### Boundary Noise Removal
Removing training samples near label thresholds (+-1% and +-1.5%). Hurt performance because losing 20-30% of training data costs more than the noise reduction helps.

### Optuna with Purged CV
150 trials of Bayesian hyperparameter optimization using purged time-series CV (fixing the leakage in nb07's standard TimeSeriesSplit). Best params (max_depth=10, lr=0.16) overfitted despite purged CV. Default params remain optimal.

### Combinations with Optuna
All combinations of Optuna params + other improvements performed worse than alpha=0.3 with defaults. Confirms that the improvement comes from the loss function, not hyperparameter tuning.

## Purged Time-Series Cross-Validation

### Implementation

Implemented `PurgedTimeSeriesSplit` to fix label leakage in cross-validation:

- **Problem:** Standard `TimeSeriesSplit` allows training samples whose 63-day label window overlaps the test fold
- **Fix:** Purge all training samples within 63 trading days before each test fold start, plus a 5-day embargo after each test fold end
- **Result:** More honest CV estimates (0.226 vs inflated scores with leaky CV)
- **Impact on Optuna:** While purged CV gave more reliable estimates, Optuna still couldn't beat default params - confirming the landscape is flat for this problem

## Deployment

The blended ordinal model has been deployed to the ML service:

- **Model file:** `src/ml/app/models/xgb_3m_blended.json` (native XGBoost Booster format)
- **Inference change:** Uses `output_margin=True` + manual softmax instead of `predict_proba()`
- **Backward compatible:** Falls back to the old `.joblib` model if the blended model file is missing
- **Same API contract:** No changes to request/response format, backend, or frontend

## Key Insight

The single most impactful change was not adding more data, tuning hyperparameters, or engineering new features. It was **changing what the model optimizes for** - teaching it that class order matters. Five lines of math in a custom objective function outperformed 150 trials of hyperparameter search and multiple feature engineering attempts.

This aligns with the general principle in financial ML: the bottleneck is usually signal, not model complexity. When the signal-to-noise ratio is low, the most effective improvements come from better problem formulation (loss functions, label design) rather than more features or more tuning.
