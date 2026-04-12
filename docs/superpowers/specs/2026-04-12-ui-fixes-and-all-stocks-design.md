# UI Fixes, Enhancements & All Stocks Page — Design Spec

**Date:** 2026-04-12
**Scope:** Frontend bug fixes, chart behavior, watchlist reactivity, video auth background, signal distribution chart, All Stocks page with backend seed

---

## Phase 1: Bug Fixes

### 1.1 Search Dropdown Opacity

**Problem:** The `glass-surface-elevated` class on `SearchDropdown.tsx` is too transparent — the dashboard content is more prominent than the search results overlay.

**Fix:** Replace glass background with a fully opaque dark background (`bg-[#111420]`) and a stronger box shadow (`shadow-[0_8px_40px_rgba(0,0,0,0.6)]`). Keep the rounded corners and border styling.

**Files:** `src/frontend/src/components/search/SearchDropdown.tsx`

---

### 1.2 Chart Zoom Behavior

**Problem:** `StockChart.tsx` filters the `prices` array via `filterByRange()` before passing data to Lightweight Charts. When viewing 1M and zooming out, there's no data beyond the filter boundary — the chart shows blank space.

**Fix:**
- Always pass ALL price data to the candlestick and volume series (remove `filterByRange` from data pipeline)
- Range buttons (1M, 3M, 6M, 1Y, 5Y) call `chart.timeScale().setVisibleRange({ from, to })` to set the visible window
- Zooming out naturally reveals more data since all 5Y of prices are loaded
- Default visible range on mount: 1Y (current default)

**Files:** `src/frontend/src/components/stock/StockChart.tsx`

---

### 1.3 Watchlist Live Update via Context

**Problem:** `useWatchlist()` is an independent hook — each consumer (Sidebar, DashboardPage, StockDetailPage, PredictionsPage) maintains its own state. Adding a stock on the detail page doesn't update the sidebar until page refresh.

**Fix:**
- Create `WatchlistContext` (new file `src/frontend/src/contexts/WatchlistContext.tsx`)
- Provides: `items`, `isLoading`, `error`, `add(ticker)`, `remove(ticker)`, `refetch()`
- `add()` calls the API, then refetches the full list (ensures sidebar, dashboard, etc. all update)
- `remove()` uses optimistic update with rollback (existing pattern)
- Wrap in `WatchlistProvider` in `main.tsx` (alongside existing AuthProvider, SidebarProvider)
- Replace all `useWatchlist()` hook calls with `useWatchlistContext()` from the new context
- Delete old `src/frontend/src/hooks/useWatchlist.ts`

**Consumers to update:**
- `Sidebar.tsx` — reads items for watchlist section
- `DashboardPage.tsx` — reads items, remove
- `PredictionsPage.tsx` — reads items, refetch
- `StockDetailPage.tsx` — reads items (for inWatchlist check), refetch. Replace direct `watchlistService.add/remove` calls with context `add/remove`
- `SearchResultCard.tsx` — currently calls `watchlistService.add()` directly. Use context `add()` instead so sidebar updates

**Files:**
- New: `src/frontend/src/contexts/WatchlistContext.tsx`
- Modify: `src/frontend/src/main.tsx` (add WatchlistProvider)
- Modify: `Sidebar.tsx`, `DashboardPage.tsx`, `PredictionsPage.tsx`, `StockDetailPage.tsx`, `SearchResultCard.tsx`
- Delete: `src/frontend/src/hooks/useWatchlist.ts`

---

### 1.4 Missing Company Names — Backfill & Ongoing Fix

**Problem:** Stock names come from yfinance via ML service on first fetch. If yfinance returned null, the name stays null forever because `RefreshStockPricesJob` only updates prices, not name/sector.

**Fix (two parts):**

**Part A — Static seed file (already generated):**
- `src/ml/app/models/ticker_names.json` — 499 entries mapping ticker → {name, sector}
- Source: Wikipedia S&P 500 table + yfinance for 5 missing tickers (HOLX, LW, MOH, MTCH, PAYC)
- Zero null names, full coverage

**Part B — ML service endpoint for bulk names:**
- New endpoint: `GET /names` on the ML data router
- Returns the `ticker_names.json` contents as JSON response
- Used by the backend to seed/backfill names

**Part C — Backend changes:**
- New method on `IStockRepository`: `GetAllAsync()` — returns all stocks
- New method on `IStockService`: `GetAllStocksAsync()` — returns all stocks with latest signal
- New endpoint on `StocksController`: `GET /api/stocks` — returns all stocks with name, sector, latest signal, confidence
- New DTO: `StockOverviewDto` — ticker, name (nullable), sector (nullable), latestClose (nullable decimal), change1dPct (nullable double), latestSignal (nullable string), signalConfidence (nullable double)
- Seed logic: Seed-on-first-call approach. When `GET /api/stocks` is called and stock count in DB is < 499, attempt to fetch names from ML service `GET /names` and insert missing stocks with name + sector (no price data — prices load on-demand when a user views the detail page). If ML service is down, return whatever stocks already exist in DB without error — the seed retries on subsequent calls until all 499 are populated.

**Part D — RefreshStockPricesJob fix:**
- After refreshing prices, check if `stock.Name` is null and the ML response has a name
- If so, update the stock's Name and Sector fields
- This prevents future null-name issues

**Files:**
- New: ML route handler for `/names`
- Modify: `RefreshStockPricesJob.cs` — add name/sector backfill logic
- New: `StockOverviewDto.cs`
- Modify: `IStockRepository.cs` — add `GetAllAsync()`
- Modify: `StockRepository.cs` — implement `GetAllAsync()`
- Modify: `IStockService.cs` — add `GetAllStocksAsync()`
- Modify: `StockService.cs` — implement `GetAllStocksAsync()` with seed-on-first-call logic
- Modify: `StocksController.cs` — add `GET /api/stocks` endpoint

---

## Phase 2: Enhancements

### 2.1 Video Background on Auth Pages

**Asset:** `src/frontend/screenshots/chart_video.mp4` (2.1 MB) → move to `src/frontend/src/assets/chart-video.mp4`

**Implementation:**
- Both `LoginPage.tsx` and `RegisterPage.tsx` get a `<video>` element:
  - `autoPlay`, `muted`, `loop`, `playsInline`
  - `position: absolute; inset: 0; object-fit: cover; z-index: 0`
- Dark overlay on top of video: `bg-gradient-to-b from-[#07080d]/70 via-[#07080d]/50 to-[#07080d]/70`
- Existing background glows stay, positioned on top of the overlay
- Glass card remains on top of everything
- Strictly login/register pages only — NOT the landing page

**Files:**
- Move: `screenshots/chart_video.mp4` → `src/assets/chart-video.mp4`
- Modify: `LoginPage.tsx`, `RegisterPage.tsx`

---

### 2.2 Signal Distribution — Vertical Bar Chart

**Problem:** The current signal distribution in `MarketOverview.tsx` uses squat horizontal bars that don't visually communicate the distribution well.

**Fix:** Replace with a proper vertical bar chart:
- 5 vertical bars (Strong Buy → Strong Sell), each with its signal color
- Count label on top of each bar
- Signal name abbreviated below each bar
- Bars scale proportionally to the maximum count
- Container height: ~140px for the bars to breathe
- Same double-bezel card wrapper
- Bars animate up on mount via CSS transition

**Files:** `src/frontend/src/components/dashboard/MarketOverview.tsx`

---

## Phase 3: All Stocks Page

### 3.1 Frontend — AllStocksPage

**Route:** `/stocks` → `AllStocksPage.tsx`

**Layout:**
- Eyebrow tag: "Browse" or "All Stocks"
- Page heading: "All Stocks"
- Subtitle: "Browse all S&P 500 stocks in our universe"
- Search/filter bar: client-side instant filter by ticker or company name
- Sector filter pills: "All" + each unique GICS sector from the data. Horizontal scrollable row.
- Grid: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4` with gap-4

**Company Card (reference: screenshots/company_card.png):**
- Double-bezel card wrapper (matches existing design)
- No icon (per user request)
- Top: Ticker (bold, white) + company name (gray, smaller)
- Middle: Latest price (if available) + 1D change % (green/red)
- Bottom: Signal badge if predicted, or muted "No prediction" label
- Click → navigates to `/stocks/{ticker}`
- Hover: ring glow effect (existing pattern)

**Data source:** New frontend service call to `GET /api/stocks` which returns `StockOverviewDto[]`

**Files:**
- New: `src/frontend/src/pages/AllStocksPage.tsx`
- New: `src/frontend/src/components/stocks/StockCard.tsx` (the company card component)
- Modify: `src/frontend/src/App.tsx` — add `/stocks` route
- Modify: `src/frontend/src/components/layout/Sidebar.tsx` — add "All Stocks" nav link
- Modify: `src/frontend/src/services/stockService.ts` — add `getAll()` function

---

## Implementation Order

| Phase | Task | Dependencies |
|-------|------|-------------|
| 1.1 | Search dropdown opacity | None |
| 1.2 | Chart zoom behavior | None |
| 1.3 | WatchlistContext | None |
| 1.4a | ML `/names` endpoint + ticker_names.json | None (file already generated) |
| 1.4b | Backend `GET /api/stocks` + seed logic | 1.4a |
| 1.4c | RefreshStockPricesJob name backfill | None |
| 2.1 | Video auth background | None |
| 2.2 | Signal distribution chart | None |
| 3.1 | AllStocksPage + StockCard + route | 1.3 (needs WatchlistContext), 1.4b (needs GET /api/stocks) |

Phase 1 tasks are independent of each other (except 1.4b depends on 1.4a).
Phase 2 tasks are independent of everything.
Phase 3 depends on Phase 1.3 and 1.4b.
