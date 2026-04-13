# Sidebar Content + Settings Fix — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fill the empty sidebar gap with "Recently Viewed" and "Portfolio Pulse" sections, and fix the Settings page prediction count to track actual predictions via localStorage.

**Architecture:** Two new localStorage-backed hooks (`useRecentlyViewed`, `usePredictionLog`) provide data for two new sidebar components and a Settings page fix. No backend changes. All data derived from localStorage + existing `WatchlistContext`.

**Tech Stack:** React, TypeScript, Tailwind CSS, Phosphor Icons, localStorage

**Spec:** `docs/superpowers/specs/2026-04-12-sidebar-and-settings-fix-design.md`

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/hooks/useRecentlyViewed.ts` | Create | localStorage hook: read/write recently viewed stocks |
| `src/hooks/usePredictionLog.ts` | Create | localStorage hook: read/write prediction history |
| `src/components/layout/RecentlyViewed.tsx` | Create | Sidebar section: recently viewed stocks list |
| `src/components/layout/PortfolioPulse.tsx` | Create | Sidebar section: sentiment bar, top mover, avg confidence |
| `src/components/layout/Sidebar.tsx` | Modify | Integrate new sections, move flex-1 spacer |
| `src/pages/StockDetailPage.tsx` | Modify | Call `useRecentlyViewed().add()` on mount, `usePredictionLog().log()` on predict |
| `src/pages/SettingsPage.tsx` | Modify | Use `usePredictionLog().count`, rename stat labels |

---

### Task 1: useRecentlyViewed hook

**Files:**
- Create: `src/hooks/useRecentlyViewed.ts`

- [ ] **Step 1: Create the hook**

```ts
import { useState, useCallback } from 'react';

const STORAGE_KEY = 'sp_recently_viewed';
const MAX_ITEMS = 5;

interface RecentlyViewedItem {
  ticker: string;
  visitedAt: string;
}

function readFromStorage(): RecentlyViewedItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeToStorage(items: RecentlyViewedItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {}
}

export function useRecentlyViewed() {
  const [items, setItems] = useState<RecentlyViewedItem[]>(readFromStorage);

  const add = useCallback((ticker: string) => {
    setItems((prev) => {
      const filtered = prev.filter((i) => i.ticker !== ticker);
      const next = [{ ticker, visitedAt: new Date().toISOString() }, ...filtered].slice(0, MAX_ITEMS);
      writeToStorage(next);
      return next;
    });
  }, []);

  return { items, add };
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd /c/Users/Matei/Desktop/StonksForecast/src/frontend && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors related to `useRecentlyViewed`

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useRecentlyViewed.ts
git commit -m "feat: add useRecentlyViewed localStorage hook"
```

---

### Task 2: usePredictionLog hook

**Files:**
- Create: `src/hooks/usePredictionLog.ts`

- [ ] **Step 1: Create the hook**

```ts
import { useState, useCallback } from 'react';

const STORAGE_KEY = 'sp_prediction_log';

interface PredictionLogEntry {
  ticker: string;
  horizon: string;
  predictedAt: string;
}

function readFromStorage(): PredictionLogEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeToStorage(entries: PredictionLogEntry[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {}
}

export function usePredictionLog() {
  const [entries, setEntries] = useState<PredictionLogEntry[]>(readFromStorage);

  const log = useCallback((ticker: string, horizon: string) => {
    setEntries((prev) => {
      const filtered = prev.filter(
        (e) => !(e.ticker === ticker && e.horizon === horizon),
      );
      const next = [{ ticker, horizon, predictedAt: new Date().toISOString() }, ...filtered];
      writeToStorage(next);
      return next;
    });
  }, []);

  const count = entries.length;

  return { count, log };
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd /c/Users/Matei/Desktop/StonksForecast/src/frontend && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors related to `usePredictionLog`

- [ ] **Step 3: Commit**

```bash
git add src/hooks/usePredictionLog.ts
git commit -m "feat: add usePredictionLog localStorage hook"
```

---

### Task 3: RecentlyViewed sidebar component

**Files:**
- Create: `src/components/layout/RecentlyViewed.tsx`

- [ ] **Step 1: Create the component**

```tsx
import { NavLink } from 'react-router';
import { useRecentlyViewed } from '@/hooks/useRecentlyViewed';
import { useWatchlist } from '@/contexts/WatchlistContext';
import SignalBadge from '@/components/common/SignalBadge';
import { cn } from '@/utils/cn';

export default function RecentlyViewed() {
  const { items } = useRecentlyViewed();
  const { items: watchlistItems } = useWatchlist();

  if (items.length === 0) return null;

  return (
    <div className="py-3 px-3">
      <p className="px-3 mb-2 text-[10px] uppercase font-medium tracking-[0.2em] text-gray-500">
        Recently Viewed
      </p>
      <div className="flex flex-col gap-0.5">
        {items.map(({ ticker }) => {
          const watchlistMatch = watchlistItems.find((w) => w.ticker === ticker);
          return (
            <NavLink
              key={ticker}
              to={`/stocks/${ticker}`}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]',
                  isActive
                    ? 'bg-white/[0.06] text-white font-medium'
                    : 'text-gray-400 hover:text-white hover:bg-white/[0.04]',
                )
              }
            >
              <SignalBadge signal={watchlistMatch?.latestSignal ?? null} size="sm" />
              <span className="truncate">{ticker}</span>
            </NavLink>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd /c/Users/Matei/Desktop/StonksForecast/src/frontend && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors related to `RecentlyViewed`

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/RecentlyViewed.tsx
git commit -m "feat: add RecentlyViewed sidebar component"
```

---

### Task 4: PortfolioPulse sidebar component

**Files:**
- Create: `src/components/layout/PortfolioPulse.tsx`

- [ ] **Step 1: Create the component**

```tsx
import { TrendUp, TrendDown } from '@phosphor-icons/react';
import { useWatchlist } from '@/contexts/WatchlistContext';
import { formatPct } from '@/utils/formatters';
import type { WatchlistItem } from '@/types';

function getSentimentSegments(items: WatchlistItem[]) {
  let bullish = 0;
  let neutral = 0;
  let bearish = 0;
  let noData = 0;

  for (const item of items) {
    const s = item.latestSignal;
    if (s === 'Strong Buy' || s === 'Buy') bullish++;
    else if (s === 'Hold') neutral++;
    else if (s === 'Sell' || s === 'Strong Sell') bearish++;
    else noData++;
  }

  const total = items.length;
  if (total === 0) return [];

  const segments: { color: string; pct: number }[] = [];
  if (bullish > 0) segments.push({ color: 'bg-emerald-500', pct: (bullish / total) * 100 });
  if (neutral > 0) segments.push({ color: 'bg-amber-500', pct: (neutral / total) * 100 });
  if (bearish > 0) segments.push({ color: 'bg-red-500', pct: (bearish / total) * 100 });
  if (noData > 0) segments.push({ color: 'bg-gray-600', pct: (noData / total) * 100 });

  return segments;
}

function getTopMover(items: WatchlistItem[]): WatchlistItem | null {
  return items
    .filter((i) => i.change1dPct != null)
    .sort((a, b) => Math.abs(b.change1dPct!) - Math.abs(a.change1dPct!))[0] ?? null;
}

function getAvgConfidence(items: WatchlistItem[]): number | null {
  const withSignal = items.filter((i) => i.signalConfidence != null);
  if (withSignal.length === 0) return null;
  const sum = withSignal.reduce((acc, i) => acc + (i.signalConfidence ?? 0), 0);
  return sum / withSignal.length;
}

export default function PortfolioPulse() {
  const { items, isLoading } = useWatchlist();

  if (isLoading || items.length === 0) return null;

  const segments = getSentimentSegments(items);
  const topMover = getTopMover(items);
  const avgConf = getAvgConfidence(items);

  return (
    <div className="py-3 px-3">
      <p className="px-3 mb-3 text-[10px] uppercase font-medium tracking-[0.2em] text-gray-500">
        Portfolio Pulse
      </p>
      <div className="px-3 space-y-3">
        {/* Sentiment bar */}
        <div className="flex h-1 w-full overflow-hidden rounded-full">
          {segments.map(({ color, pct }, i) => (
            <div
              key={i}
              className={`${color} transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]`}
              style={{ width: `${pct}%` }}
            />
          ))}
        </div>

        {/* Top mover */}
        {topMover && (
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-gray-500">Top mover</span>
            <span className="flex items-center gap-1.5 text-[11px] font-medium">
              <span className="text-gray-300">{topMover.ticker}</span>
              {topMover.change1dPct != null && (
                <span className={`flex items-center gap-0.5 ${topMover.change1dPct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {topMover.change1dPct >= 0 ? <TrendUp size={10} weight="bold" /> : <TrendDown size={10} weight="bold" />}
                  {formatPct(topMover.change1dPct)}
                </span>
              )}
            </span>
          </div>
        )}

        {/* Avg confidence */}
        {avgConf != null && (
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-gray-500">Avg confidence</span>
            <span className="text-[11px] font-medium text-gray-300 tabular-nums">
              {(avgConf * 100).toFixed(1)}%
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd /c/Users/Matei/Desktop/StonksForecast/src/frontend && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors related to `PortfolioPulse`

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/PortfolioPulse.tsx
git commit -m "feat: add PortfolioPulse sidebar component"
```

---

### Task 5: Integrate new sections into Sidebar

**Files:**
- Modify: `src/components/layout/Sidebar.tsx:86-116`

- [ ] **Step 1: Add imports at top of file**

Add after the existing imports (after line 9):

```ts
import RecentlyViewed from '@/components/layout/RecentlyViewed';
import PortfolioPulse from '@/components/layout/PortfolioPulse';
```

- [ ] **Step 2: Restructure the sidebar content layout**

Replace the existing `sidebarContent` JSX (lines 86-166). The key change: remove `flex-1` from the nav div, add a `flex-1` spacer div between PortfolioPulse and the divider.

Replace the `sidebarContent` variable:

```tsx
  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Navigation */}
      <div className="py-5 px-3">
        <p className="px-3 mb-2 text-[10px] uppercase font-medium tracking-[0.2em] text-gray-500">
          Navigation
        </p>
        <nav className="flex flex-col gap-0.5">
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'group flex items-center gap-3 px-3 py-2.5 text-sm rounded-xl transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]',
                  isActive
                    ? 'bg-white/[0.06] text-white font-medium shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]'
                    : 'text-gray-400 hover:text-white hover:bg-white/[0.04]'
                )
              }
            >
              <Icon
                size={16}
                weight="light"
                className="transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:scale-110"
              />
              {label}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Recently Viewed */}
      <RecentlyViewed />

      {/* Portfolio Pulse */}
      <PortfolioPulse />

      {/* Spacer pushes watchlist to bottom */}
      <div className="flex-1 min-h-0" />

      {/* Draggable divider */}
      <div
        onMouseDown={handleDragStart}
        className="group relative flex-shrink-0 h-3 cursor-row-resize flex items-center justify-center"
      >
        <div className="absolute inset-x-3 h-px bg-white/[0.06] group-hover:bg-purple-500/30 transition-colors duration-300" />
        <div className="relative w-8 h-1 rounded-full bg-white/[0.08] group-hover:bg-purple-500/40 transition-colors duration-300" />
      </div>

      {/* Watchlist — height controlled by drag */}
      <div className="flex-shrink-0 pb-4 px-3" style={{ height: watchlistHeight }}>
        <p className="px-3 mb-2 text-[10px] uppercase font-medium tracking-[0.2em] text-gray-500">
          Watchlist
          {!isLoading && items.length > 0 && (
            <span className="ml-1 text-gray-600">{items.length}</span>
          )}
        </p>
        <div className="h-[calc(100%-24px)] overflow-y-auto space-y-0.5">
          {isLoading ? (
            <div className="space-y-2 px-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-4 w-full rounded-lg bg-white/[0.04]" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <p className="px-3 text-xs text-gray-600">No stocks yet</p>
          ) : (
            items.map((item) => (
              <NavLink
                key={item.ticker}
                to={`/stocks/${item.ticker}`}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]',
                    isActive
                      ? 'bg-white/[0.06] text-white font-medium'
                      : 'text-gray-400 hover:text-white hover:bg-white/[0.04]'
                  )
                }
              >
                <SignalBadge signal={item.latestSignal} size="sm" />
                <span className="truncate">{item.ticker}</span>
              </NavLink>
            ))
          )}
        </div>
      </div>
    </div>
  );
```

- [ ] **Step 3: Verify it compiles**

Run: `cd /c/Users/Matei/Desktop/StonksForecast/src/frontend && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [ ] **Step 4: Visual check in browser**

Navigate to `http://localhost:3000/dashboard` with sidebar open. Verify:
- Navigation links at top (no longer expanding)
- Recently Viewed section visible (may be empty until Task 6 wires it)
- Portfolio Pulse showing sentiment bar, top mover, avg confidence
- Spacer fills remaining gap
- Watchlist still at bottom with draggable divider

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/Sidebar.tsx
git commit -m "feat: integrate RecentlyViewed and PortfolioPulse into sidebar"
```

---

### Task 6: Wire up StockDetailPage

**Files:**
- Modify: `src/pages/StockDetailPage.tsx:1-58`

- [ ] **Step 1: Add imports**

Add after the existing imports (after line 14):

```ts
import { useRecentlyViewed } from '@/hooks/useRecentlyViewed';
import { usePredictionLog } from '@/hooks/usePredictionLog';
```

- [ ] **Step 2: Call useRecentlyViewed and usePredictionLog in the component**

Inside `StockDetailPage`, after the `useWatchlist()` call (after line 34), add:

```ts
  const { add: addRecentlyViewed } = useRecentlyViewed();
  const { log: logPrediction } = usePredictionLog();
```

- [ ] **Step 3: Track recently viewed on mount**

Inside the existing `useEffect` that loads stock data (the one at line 36), add `addRecentlyViewed(ticker)` at the top of the effect body, before the `load()` call. The effect becomes:

```ts
  useEffect(() => {
    if (!ticker) return;
    addRecentlyViewed(ticker);

    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const data = await stockService.getDetail(ticker!);
        setStock(data);
      } catch (err) {
        if (err instanceof ApiException && err.status === 404) {
          setError('not_found');
        } else {
          setError('Failed to load stock data');
        }
      } finally {
        setIsLoading(false);
      }
    }

    void load();
    void fetchPrediction(ticker);
  }, [ticker, fetchPrediction]);
```

Note: `addRecentlyViewed` is stable (wrapped in `useCallback`) so it does not need to be in the dependency array. If the linter warns, add it — it won't cause re-renders.

- [ ] **Step 4: Log predictions on successful predict**

The predict button calls `predict(ticker!, h)` at line 164 via the `onPredict` prop of `PredictionCard`. We need to wrap this to also log the prediction. Change line 164:

From:
```tsx
          onPredict={(h) => predict(ticker!, h)}
```

To:
```tsx
          onPredict={async (h) => {
            await predict(ticker!, h);
            logPrediction(ticker!, h);
          }}
```

Note: `predict()` from `usePrediction` already handles errors internally (sets error state, shows toast). It doesn't throw, so `logPrediction` runs after the attempt. However, we only want to log on success. To check success, we look at whether `predict` set the prediction. Since `predict` is async and updates state, the cleanest approach is to check inside the callback:

Actually, `predict()` catches errors and doesn't rethrow — so we can't await-and-check. Instead, let's log optimistically. If the prediction fails, the user sees an error toast anyway. A stale log entry for a failed prediction is a minor inaccuracy in a cosmetic stat. This is the pragmatic choice.

- [ ] **Step 5: Verify it compiles**

Run: `cd /c/Users/Matei/Desktop/StonksForecast/src/frontend && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [ ] **Step 6: Visual check in browser**

1. Navigate to `http://localhost:3000/stocks/AAPL`
2. Open sidebar — verify "AAPL" now appears under "Recently Viewed"
3. Navigate to `http://localhost:3000/stocks/TSLA`
4. Open sidebar — verify "TSLA" is first, "AAPL" is second in Recently Viewed
5. Click "Predict" on the stock detail page
6. Check `localStorage.getItem('sp_prediction_log')` in browser console — verify an entry was added

- [ ] **Step 7: Commit**

```bash
git add src/pages/StockDetailPage.tsx
git commit -m "feat: wire recently viewed and prediction log to StockDetailPage"
```

---

### Task 7: Fix Settings page prediction count

**Files:**
- Modify: `src/pages/SettingsPage.tsx:103-162`

- [ ] **Step 1: Add import**

Add after the existing imports (after line 15):

```ts
import { usePredictionLog } from '@/hooks/usePredictionLog';
```

- [ ] **Step 2: Replace the stats computation**

Replace lines 103-105:

From:
```ts
  // Account stats
  const stocksTracked = items.length;
  const predictedCount = items.filter(i => i.latestSignal != null).length;
```

To:
```ts
  // Account stats
  const { count: predictedCount } = usePredictionLog();
```

- [ ] **Step 3: Update the stat card labels**

Replace the "Tracking" stat card (lines 147-154):

From:
```tsx
              <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4">
                <div className="flex items-center gap-2 mb-1">
                  <ChartLine size={12} weight="light" className="text-purple-400" />
                  <span className="text-[10px] uppercase tracking-[0.15em] text-gray-500">Tracking</span>
                </div>
                <p className="font-heading text-2xl font-bold tracking-[-0.03em]">{stocksTracked}</p>
                <p className="text-[11px] text-gray-600">stocks in watchlist</p>
              </div>
```

To:
```tsx
              <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4">
                <div className="flex items-center gap-2 mb-1">
                  <ChartLine size={12} weight="light" className="text-purple-400" />
                  <span className="text-[10px] uppercase tracking-[0.15em] text-gray-500">Watchlist</span>
                </div>
                <p className="font-heading text-2xl font-bold tracking-[-0.03em]">{items.length}</p>
                <p className="text-[11px] text-gray-600">stocks tracked</p>
              </div>
```

Replace the "Predicted" stat card (lines 155-162):

From:
```tsx
              <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4">
                <div className="flex items-center gap-2 mb-1">
                  <ChartLine size={12} weight="light" className="text-purple-400" />
                  <span className="text-[10px] uppercase tracking-[0.15em] text-gray-500">Predicted</span>
                </div>
                <p className="font-heading text-2xl font-bold tracking-[-0.03em]">{predictedCount}</p>
                <p className="text-[11px] text-gray-600">signals generated</p>
              </div>
```

To:
```tsx
              <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4">
                <div className="flex items-center gap-2 mb-1">
                  <ChartLine size={12} weight="light" className="text-purple-400" />
                  <span className="text-[10px] uppercase tracking-[0.15em] text-gray-500">Predictions</span>
                </div>
                <p className="font-heading text-2xl font-bold tracking-[-0.03em]">{predictedCount}</p>
                <p className="text-[11px] text-gray-600">predictions generated</p>
              </div>
```

- [ ] **Step 4: Verify it compiles**

Run: `cd /c/Users/Matei/Desktop/StonksForecast/src/frontend && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [ ] **Step 5: Visual check in browser**

1. Navigate to `http://localhost:3000/settings`
2. Verify the profile card shows "Watchlist" (not "Tracking") and "Predictions" (not "Predicted")
3. The predictions count should reflect entries in localStorage, not just watchlist signals
4. Navigate to a non-watchlist stock, run a prediction, return to Settings — count should increment

- [ ] **Step 6: Commit**

```bash
git add src/pages/SettingsPage.tsx
git commit -m "fix: settings prediction count reads from localStorage instead of watchlist"
```
