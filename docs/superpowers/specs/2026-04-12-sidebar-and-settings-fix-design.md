# Sidebar Content + Settings Prediction Count Fix

**Date:** 2026-04-12
**Scope:** Frontend only (src/frontend)

---

## Problem

1. **Sidebar is too empty.** The nav links (~150px) and watchlist (~240px) leave a ~400px void in the middle on typical screens.
2. **Settings "Predicted" count is wrong.** It counts watchlist items with signals, but predicting a non-watchlist stock doesn't register. Root cause: `Prediction` entity has no `UserId` — predictions are shared per-stock, not per-user.

---

## Solution

### Part A: Sidebar — Recently Viewed + Portfolio Pulse

Two new sections fill the empty gap between nav and watchlist.

#### A1. Recently Viewed

**What:** Last 5 stocks the user navigated to, most recent first.

**Data source:** `localStorage` key `sp_recently_viewed`. Updated whenever the user navigates to `/stocks/:ticker`.

**Storage format:**
```ts
// Array of { ticker: string, visitedAt: string (ISO) }
// Max 5 entries, deduped by ticker (most recent wins)
```

**Display:** Same visual style as watchlist items — ticker text + `SignalBadge` if the stock is in the watchlist (cross-reference `useWatchlist().items`), no badge otherwise.

**Section header:** "Recently Viewed" with the same `text-[10px] uppercase tracking-[0.2em]` label style as "Navigation" and "Watchlist".

**Empty state:** Section hidden entirely if no recently viewed stocks.

**Hook:** New `useRecentlyViewed` hook:
- `items: { ticker: string; visitedAt: string }[]` — the list
- `add(ticker: string): void` — push a new entry (dedup + cap at 5)
- Reads/writes `localStorage` key `sp_recently_viewed`

**Integration point:** `StockDetailPage` calls `add(ticker)` on mount.

#### A2. Portfolio Pulse

**What:** Compact at-a-glance summary of the user's watchlist health.

**Data source:** `useWatchlist().items` — no new API calls.

**Display (3 elements, stacked vertically):**

1. **Sentiment bar** — thin horizontal bar (~4px tall, full width) with colored segments proportional to signal counts:
   - Strong Buy + Buy = green segment
   - Hold = amber segment
   - Sell + Strong Sell = red segment
   - No signal = gray segment

2. **Top mover** — single line: ticker + formatted % change of the stock with the largest absolute `change1dPct`. Green if positive, red if negative.

3. **Avg confidence** — single line: average of `signalConfidence` across all watchlist items that have a signal, formatted as percentage.

**Section header:** "Portfolio Pulse" with same label style.

**Empty/loading state:** Section hidden when watchlist is empty or loading.

#### Sidebar Layout Change

Current structure:
```
nav (flex-1, expands)  →  divider  →  watchlist (fixed height)
```

New structure:
```
nav (auto height)  →  recently viewed (auto)  →  portfolio pulse (auto)  →  spacer (flex-1)  →  divider  →  watchlist (fixed height)
```

The `flex-1` spacer moves from the nav section to between Portfolio Pulse and the divider, so the new sections sit directly below navigation instead of floating in the void.

---

### Part B: Settings — Prediction Count via localStorage

**What:** Track every prediction the user triggers and show the real count.

**Data source:** `localStorage` key `sp_prediction_log`.

**Storage format:**
```ts
// Array of { ticker: string, horizon: string, predictedAt: string (ISO) }
// Deduped by ticker+horizon (most recent wins)
```

**Write point:** When `predictionService.create()` succeeds, the caller stores the entry. The natural place is `StockDetailPage` (or wherever the predict button handler lives) — after a successful `create()` call, push to localStorage.

**Read point:** `SettingsPage` reads the log length on mount.

**Hook:** New `usePredictionLog` hook:
- `count: number` — distinct predictions made
- `log(ticker: string, horizon: string): void` — record a prediction

**Settings page changes:**
- "Tracking" label → "Watchlist" (accurate)
- "Predicted" label → "Predictions" (now reads from `usePredictionLog().count`)

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/hooks/useRecentlyViewed.ts` | localStorage hook for recently viewed stocks |
| `src/hooks/usePredictionLog.ts` | localStorage hook for prediction count tracking |
| `src/components/layout/RecentlyViewed.tsx` | Sidebar section component |
| `src/components/layout/PortfolioPulse.tsx` | Sidebar section component |

## Files to Modify

| File | Change |
|------|--------|
| `src/components/layout/Sidebar.tsx` | Add RecentlyViewed + PortfolioPulse sections, move flex-1 spacer |
| `src/pages/StockDetailPage.tsx` | Call `useRecentlyViewed().add(ticker)` on mount |
| `src/pages/StockDetailPage.tsx` | Call `usePredictionLog().log(ticker, horizon)` after successful predict |
| `src/pages/SettingsPage.tsx` | Use `usePredictionLog().count`, rename labels |

## Out of Scope

- No backend changes
- No new API endpoints
- No changes to the watchlist data model
- No dark mode (removed)
