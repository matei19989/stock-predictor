# UI Fixes, Enhancements & All Stocks Page — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix search dropdown visibility, chart zoom, watchlist reactivity, missing stock names; add video auth backgrounds, vertical signal distribution chart, and an All Stocks browse page.

**Architecture:** Frontend bug fixes are isolated component changes. WatchlistContext lifts shared state into React Context. Backend gets a new `GET /api/stocks` endpoint with seed-on-first-call from a static `ticker_names.json` served by the ML service. The All Stocks page consumes this endpoint with client-side filtering.

**Tech Stack:** React 19 + TypeScript, Tailwind CSS, Lightweight Charts, FastAPI (Python), ASP.NET Core 9, PostgreSQL, EF Core

**Spec:** `docs/superpowers/specs/2026-04-12-ui-fixes-and-all-stocks-design.md`

---

## File Map

### New Files
| File | Purpose |
|------|---------|
| `src/frontend/src/contexts/WatchlistContext.tsx` | Shared watchlist state via React Context |
| `src/frontend/src/pages/AllStocksPage.tsx` | Browse all 499 S&P 500 stocks |
| `src/frontend/src/components/stocks/StockCard.tsx` | Compact stock card (reference: company_card.png) |
| `src/backend/Application/DTOs/Stocks/StockOverviewDto.cs` | DTO for all-stocks endpoint |
| `src/ml/app/routes/names.py` | `GET /names` endpoint returning ticker_names.json |

### Modified Files
| File | Change |
|------|--------|
| `src/frontend/src/components/search/SearchDropdown.tsx` | Fix opacity — opaque bg |
| `src/frontend/src/components/stock/StockChart.tsx` | Pass all data, use setVisibleRange |
| `src/frontend/src/main.tsx` | Add WatchlistProvider |
| `src/frontend/src/components/layout/Sidebar.tsx` | Use context + add "All Stocks" nav link |
| `src/frontend/src/pages/DashboardPage.tsx` | Use WatchlistContext |
| `src/frontend/src/pages/PredictionsPage.tsx` | Use WatchlistContext |
| `src/frontend/src/pages/StockDetailPage.tsx` | Use WatchlistContext add/remove |
| `src/frontend/src/components/search/SearchResultCard.tsx` | Use WatchlistContext add |
| `src/frontend/src/pages/LoginPage.tsx` | Add video background |
| `src/frontend/src/pages/RegisterPage.tsx` | Add video background |
| `src/frontend/src/components/dashboard/MarketOverview.tsx` | Vertical bar chart |
| `src/frontend/src/App.tsx` | Add `/stocks` route |
| `src/frontend/src/services/stockService.ts` | Add `getAll()` |
| `src/frontend/src/types/index.ts` | Add `StockOverview` type |
| `src/ml/app/main.py` | Register names router |
| `src/backend/Application/Interfaces/Repositories/IStockRepository.cs` | Add `GetAllAsync()`, `AddRangeAsync()` |
| `src/backend/Infrastructure/Repositories/StockRepository.cs` | Implement `GetAllAsync()`, `AddRangeAsync()` |
| `src/backend/Application/Interfaces/Services/IStockService.cs` | Add `GetAllOverviewAsync()` |
| `src/backend/Infrastructure/Services/StockService.cs` | Implement `GetAllOverviewAsync()` with seed |
| `src/backend/API/Controllers/StocksController.cs` | Add `GET /api/stocks` |
| `src/backend/Application/Interfaces/External/IMlServiceClient.cs` | Add `GetTickerNamesAsync()` |
| `src/backend/Infrastructure/Http/MlServiceClient.cs` | Implement `GetTickerNamesAsync()` |
| `src/backend/Infrastructure/Jobs/RefreshStockPricesJob.cs` | Backfill null names |

### Deleted Files
| File | Reason |
|------|--------|
| `src/frontend/src/hooks/useWatchlist.ts` | Replaced by WatchlistContext |

### Moved Files
| From | To |
|------|-----|
| `src/frontend/screenshots/chart_video.mp4` | `src/frontend/src/assets/chart-video.mp4` |

---

## Task 1: Fix Search Dropdown Opacity

**Files:**
- Modify: `src/frontend/src/components/search/SearchDropdown.tsx`

- [ ] **Step 1: Replace glass-surface-elevated with opaque background**

In `src/frontend/src/components/search/SearchDropdown.tsx`, replace all three occurrences of `glass-surface-elevated` with an opaque dark background. Change the class on the loading container (line 23), empty state container (line 35), and results container (line 45):

```tsx
// Loading state (line 23) — change:
className="absolute top-full left-0 right-0 z-50 mt-2 rounded-xl glass-surface-elevated p-2"
// To:
className="absolute top-full left-0 right-0 z-50 mt-2 rounded-xl bg-[#111420] border border-white/[0.08] shadow-[0_8px_40px_rgba(0,0,0,0.6)] p-2"

// Empty state (line 35) — change:
className="absolute top-full left-0 right-0 z-50 mt-2 rounded-xl glass-surface-elevated"
// To:
className="absolute top-full left-0 right-0 z-50 mt-2 rounded-xl bg-[#111420] border border-white/[0.08] shadow-[0_8px_40px_rgba(0,0,0,0.6)]"

// Results (line 45) — change:
className="absolute top-full left-0 right-0 z-50 mt-2 rounded-xl glass-surface-elevated overflow-hidden"
// To:
className="absolute top-full left-0 right-0 z-50 mt-2 rounded-xl bg-[#111420] border border-white/[0.08] shadow-[0_8px_40px_rgba(0,0,0,0.6)] overflow-hidden"
```

- [ ] **Step 2: Verify visually**

Start the dev server, navigate to the dashboard, type in the search bar, and confirm the dropdown is now opaque and clearly visible above the dashboard content.

- [ ] **Step 3: Commit**

```bash
git add src/frontend/src/components/search/SearchDropdown.tsx
git commit -m "fix: make search dropdown opaque instead of glass transparent"
```

---

## Task 2: Fix Chart Zoom Behavior

**Files:**
- Modify: `src/frontend/src/components/stock/StockChart.tsx`

- [ ] **Step 1: Rewrite StockChart to pass all data and use setVisibleRange**

Replace the full content of `src/frontend/src/components/stock/StockChart.tsx`:

```tsx
import { useRef, useEffect, useState, useCallback } from 'react';
import { createChart, ColorType, CandlestickSeries, HistogramSeries } from 'lightweight-charts';
import { Skeleton } from '@/components/ui/skeleton';
import type { PricePoint } from '@/types';

type Range = '1M' | '3M' | '6M' | '1Y' | '5Y';

const RANGES: Range[] = ['1M', '3M', '6M', '1Y', '5Y'];

interface StockChartProps {
  prices: PricePoint[];
  isLoading: boolean;
}

function computeCutoffDate(range: Range): string {
  const now = new Date();
  switch (range) {
    case '1M': now.setMonth(now.getMonth() - 1); break;
    case '3M': now.setMonth(now.getMonth() - 3); break;
    case '6M': now.setMonth(now.getMonth() - 6); break;
    case '1Y': now.setFullYear(now.getFullYear() - 1); break;
    case '5Y': now.setFullYear(now.getFullYear() - 5); break;
  }
  return now.toISOString().slice(0, 10);
}

export default function StockChart({ prices, isLoading }: StockChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ReturnType<typeof createChart> | null>(null);
  const [range, setRange] = useState<Range>('1Y');

  // Build chart once with ALL data
  useEffect(() => {
    if (!containerRef.current || prices.length === 0) return;

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: 400,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#4b5563',
      },
      grid: {
        vertLines: { color: 'rgba(255,255,255,0.03)' },
        horzLines: { color: 'rgba(255,255,255,0.03)' },
      },
      timeScale: { borderColor: 'rgba(255,255,255,0.06)' },
      rightPriceScale: { borderColor: 'rgba(255,255,255,0.06)' },
    });

    chartRef.current = chart;

    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderUpColor: '#22c55e',
      borderDownColor: '#ef4444',
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
    });

    candlestickSeries.setData(
      prices.map(p => ({
        time: p.date,
        open: Number(p.open),
        high: Number(p.high),
        low: Number(p.low),
        close: Number(p.close),
      }))
    );

    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: '#94a3b8',
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
    });

    chart.priceScale('volume').applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });

    volumeSeries.setData(
      prices.map(p => ({
        time: p.date,
        value: Number(p.volume),
        color: Number(p.close) >= Number(p.open) ? '#22c55e30' : '#ef444430',
      }))
    );

    const ro = new ResizeObserver(entries => {
      const { width } = entries[0].contentRect;
      chart.applyOptions({ width });
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
    };
  }, [prices]);

  // Set visible range when range button changes
  const applyRange = useCallback((r: Range) => {
    const chart = chartRef.current;
    if (!chart || prices.length === 0) return;
    const from = computeCutoffDate(r);
    const to = prices[prices.length - 1].date;
    chart.timeScale().setVisibleRange({ from, to } as any);
  }, [prices]);

  useEffect(() => {
    applyRange(range);
  }, [range, applyRange]);

  if (isLoading) {
    return <Skeleton className="h-[400px] w-full rounded-2xl bg-white/[0.04]" />;
  }

  if (prices.length === 0) {
    return (
      <div className="flex h-[400px] w-full items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.02] text-gray-600">
        No price data available
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-1">
        {RANGES.map(r => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${
              range === r
                ? 'bg-purple-500/15 text-purple-300 border border-purple-500/25'
                : 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.04] border border-transparent'
            }`}
          >
            {r}
          </button>
        ))}
      </div>
      <div className="rounded-[1.5rem] bg-white/[0.03] p-1 ring-1 ring-white/[0.06]">
        <div className="rounded-[calc(1.5rem-0.25rem)] bg-white/[0.02] overflow-hidden shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] p-2">
          <div ref={containerRef} className="h-[400px] w-full" />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify by navigating to a stock, selecting 1M, then zooming out with scroll wheel**

The chart should smoothly reveal more data as you zoom out. Range buttons should jump to the selected window.

- [ ] **Step 3: Commit**

```bash
git add src/frontend/src/components/stock/StockChart.tsx
git commit -m "fix: chart zoom loads all data, range buttons set visible window"
```

---

## Task 3: WatchlistContext — Shared State

**Files:**
- Create: `src/frontend/src/contexts/WatchlistContext.tsx`
- Modify: `src/frontend/src/main.tsx`
- Modify: `src/frontend/src/components/layout/Sidebar.tsx`
- Modify: `src/frontend/src/pages/DashboardPage.tsx`
- Modify: `src/frontend/src/pages/PredictionsPage.tsx`
- Modify: `src/frontend/src/pages/StockDetailPage.tsx`
- Modify: `src/frontend/src/components/search/SearchResultCard.tsx`
- Delete: `src/frontend/src/hooks/useWatchlist.ts`

- [ ] **Step 1: Create WatchlistContext**

Create `src/frontend/src/contexts/WatchlistContext.tsx`:

```tsx
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import * as watchlistService from '@/services/watchlistService';
import type { WatchlistItem } from '@/types';
import type { ReactNode } from 'react';

interface WatchlistContextValue {
  items: WatchlistItem[];
  isLoading: boolean;
  error: string | null;
  add: (ticker: string) => Promise<void>;
  remove: (ticker: string) => Promise<void>;
  refetch: () => Promise<void>;
}

const WatchlistContext = createContext<WatchlistContextValue | null>(null);

export function WatchlistProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await watchlistService.getAll();
      setItems(data);
    } catch {
      setError('Failed to load watchlist. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchItems();
  }, [fetchItems]);

  const add = useCallback(async (ticker: string) => {
    try {
      await watchlistService.add(ticker);
      toast.success(`${ticker} added to watchlist`);
      await fetchItems();
    } catch {
      toast.error(`Failed to add ${ticker}`);
    }
  }, [fetchItems]);

  const remove = useCallback(async (ticker: string) => {
    let snapshot: WatchlistItem[] = [];
    setItems((prev) => {
      snapshot = prev;
      return prev.filter((item) => item.ticker !== ticker);
    });

    try {
      await watchlistService.remove(ticker);
      toast.success(`${ticker} removed from watchlist`);
    } catch {
      setItems(snapshot);
      toast.error(`Failed to remove ${ticker}`);
    }
  }, []);

  return (
    <WatchlistContext value={{ items, isLoading, error, add, remove, refetch: fetchItems }}>
      {children}
    </WatchlistContext>
  );
}

export function useWatchlist() {
  const ctx = useContext(WatchlistContext);
  if (!ctx) throw new Error('useWatchlist must be used within WatchlistProvider');
  return ctx;
}
```

- [ ] **Step 2: Add WatchlistProvider to main.tsx**

In `src/frontend/src/main.tsx`, add the import and wrap inside SidebarProvider:

```tsx
// Add import at line 6:
import { WatchlistProvider } from '@/contexts/WatchlistContext';

// Wrap App inside WatchlistProvider (after SidebarProvider, before App):
<SidebarProvider>
  <WatchlistProvider>
    <App />
    <Toaster position="top-right" richColors closeButton />
  </WatchlistProvider>
</SidebarProvider>
```

- [ ] **Step 3: Update all consumers to use the context**

**Sidebar.tsx** — Change import from `import { useWatchlist } from '@/hooks/useWatchlist'` to `import { useWatchlist } from '@/contexts/WatchlistContext'`. No other changes needed — the interface is the same.

**DashboardPage.tsx** — Same import change. The destructured `{ items, isLoading, error, remove, refetch }` still works.

**PredictionsPage.tsx** — Same import change.

**StockDetailPage.tsx** — Change import. Replace the direct `watchlistService.add/remove` calls in `handleToggleWatchlist()` with context methods:

```tsx
// Replace the import:
import { useWatchlist } from '@/contexts/WatchlistContext';
// Remove: import * as watchlistService from '@/services/watchlistService';

// Replace destructuring (around line 35):
const { items, add: addToWatchlist, remove: removeFromWatchlist, refetch } = useWatchlist();

// Replace handleToggleWatchlist (around line 62):
async function handleToggleWatchlist() {
  if (!ticker) return;
  setIsTogglingWatchlist(true);
  try {
    if (inWatchlist) {
      await removeFromWatchlist(ticker);
    } else {
      await addToWatchlist(ticker);
    }
  } catch {
    // errors handled by context
  } finally {
    setIsTogglingWatchlist(false);
  }
}
```

Remove the `refetch` call since context auto-refetches after add/remove.

**SearchResultCard.tsx** — Change import. Use context `add()` instead of direct API call:

```tsx
// Replace watchlistService import with:
import { useWatchlist } from '@/contexts/WatchlistContext';

// Inside the component, add:
const { add: addToWatchlist } = useWatchlist();

// Replace handleAdd:
async function handleAdd(e: React.MouseEvent) {
  e.stopPropagation();
  setIsAdding(true);
  try {
    await addToWatchlist(result.ticker);
    setInWatchlist(true);
  } catch {
    // handled by context
  } finally {
    setIsAdding(false);
  }
}
```

- [ ] **Step 4: Delete old hook**

Delete `src/frontend/src/hooks/useWatchlist.ts`.

- [ ] **Step 5: Verify build compiles**

```bash
cd src/frontend && npx tsc --noEmit
```

- [ ] **Step 6: Verify live update by adding a stock and checking the sidebar updates without refresh**

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: lift watchlist state into WatchlistContext for live updates"
```

---

## Task 4: ML Service — `/names` Endpoint

**Files:**
- Create: `src/ml/app/routes/names.py`
- Modify: `src/ml/app/main.py`

Note: `src/ml/app/models/ticker_names.json` already exists (generated during spec phase).

- [ ] **Step 1: Create the names route**

Create `src/ml/app/routes/names.py`:

```python
"""Ticker-to-company-name mapping endpoint."""

import json
import logging
from pathlib import Path

from fastapi import APIRouter

logger = logging.getLogger(__name__)

router = APIRouter()

_NAMES_PATH = Path(__file__).parent.parent / "models" / "ticker_names.json"
_cached: dict | None = None


@router.get("/names")
def get_ticker_names() -> dict:
    """Return all 499 ticker → {name, sector} mappings."""
    global _cached
    if _cached is None:
        with open(_NAMES_PATH) as f:
            _cached = json.load(f)
        logger.info("Loaded %d ticker names from %s", len(_cached), _NAMES_PATH)
    return _cached
```

- [ ] **Step 2: Register the router in main.py**

In `src/ml/app/main.py`, add the import and include:

```python
# Add to imports (line 16):
from app.routes import data, health, names, predict, train

# Add after line 95 (app.include_router(data.router)):
app.include_router(names.router)
```

- [ ] **Step 3: Test the endpoint locally**

```bash
cd src/ml && python -c "
import json, requests
# If ML service is running:
# r = requests.get('http://localhost:8000/names')
# print(len(r.json()), 'tickers')

# Otherwise verify the file loads:
with open('app/models/ticker_names.json') as f:
    data = json.load(f)
print(f'{len(data)} tickers loaded')
print(list(data.items())[:3])
"
```

Expected: `499 tickers loaded`

- [ ] **Step 4: Commit**

```bash
git add src/ml/app/routes/names.py src/ml/app/main.py
git commit -m "feat(ml): add GET /names endpoint for ticker-to-company mapping"
```

---

## Task 5: Backend — `GET /api/stocks` with Seed Logic

**Files:**
- Create: `src/backend/Application/DTOs/Stocks/StockOverviewDto.cs`
- Modify: `src/backend/Application/Interfaces/Repositories/IStockRepository.cs`
- Modify: `src/backend/Infrastructure/Repositories/StockRepository.cs`
- Modify: `src/backend/Application/Interfaces/Services/IStockService.cs`
- Modify: `src/backend/Infrastructure/Services/StockService.cs`
- Modify: `src/backend/Application/Interfaces/External/IMlServiceClient.cs`
- Modify: `src/backend/Infrastructure/Http/MlServiceClient.cs`
- Modify: `src/backend/API/Controllers/StocksController.cs`

- [ ] **Step 1: Create StockOverviewDto**

Create `src/backend/Application/DTOs/Stocks/StockOverviewDto.cs`:

```csharp
namespace StockPredictor.Application.DTOs.Stocks;

public record StockOverviewDto
{
    public required string Ticker { get; init; }
    public string? Name { get; init; }
    public string? Sector { get; init; }
    public decimal? LatestClose { get; init; }
    public double? Change1dPct { get; init; }
    public string? LatestSignal { get; init; }
    public double? SignalConfidence { get; init; }
}
```

- [ ] **Step 2: Add repository methods**

In `src/backend/Application/Interfaces/Repositories/IStockRepository.cs`, add after line 11:

```csharp
Task<List<Stock>> GetAllAsync(CancellationToken cancellationToken = default);
Task AddRangeAsync(List<Stock> stocks, CancellationToken cancellationToken = default);
```

In `src/backend/Infrastructure/Repositories/StockRepository.cs`, add implementations:

```csharp
public async Task<List<Stock>> GetAllAsync(CancellationToken cancellationToken = default)
    => await _db.Stocks.OrderBy(s => s.Ticker).ToListAsync(cancellationToken);

public async Task AddRangeAsync(List<Stock> stocks, CancellationToken cancellationToken = default)
{
    _db.Stocks.AddRange(stocks);
    await _db.SaveChangesAsync(cancellationToken);
}
```

- [ ] **Step 3: Add ML client method for /names**

In `src/backend/Application/Interfaces/External/IMlServiceClient.cs`, add after line 7:

```csharp
Task<Dictionary<string, MlTickerInfo>?> GetTickerNamesAsync(CancellationToken cancellationToken = default);
```

Add the record to `src/backend/Application/Interfaces/External/MlServiceModels.cs` after the last record:

```csharp
public record MlTickerInfo(
    string? Name,
    string? Sector
);
```

In `src/backend/Infrastructure/Http/MlServiceClient.cs`, add the implementation:

```csharp
public async Task<Dictionary<string, MlTickerInfo>?> GetTickerNamesAsync(
    CancellationToken cancellationToken = default)
{
    try
    {
        var response = await _client.GetAsync("/names", cancellationToken);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<Dictionary<string, MlTickerInfo>>(
            cancellationToken: cancellationToken);
    }
    catch (Exception ex)
    {
        _logger.LogWarning(ex, "Failed to fetch ticker names from ML service");
        return null;
    }
}
```

- [ ] **Step 4: Add service method with seed logic**

In `src/backend/Application/Interfaces/Services/IStockService.cs`, add after line 9:

```csharp
Task<List<StockOverviewDto>> GetAllOverviewAsync(CancellationToken cancellationToken = default);
```

In `src/backend/Infrastructure/Services/StockService.cs`, add the implementation. Place it after the `GetDetailAsync` method:

```csharp
public async Task<List<StockOverviewDto>> GetAllOverviewAsync(
    CancellationToken cancellationToken = default)
{
    // Seed if DB has fewer than expected stocks
    var allStocks = await _stocks.GetAllAsync(cancellationToken);
    if (allStocks.Count < 499)
    {
        await SeedMissingStocksAsync(allStocks, cancellationToken);
        allStocks = await _stocks.GetAllAsync(cancellationToken);
    }

    var stockIds = allStocks.Select(s => s.Id).ToList();

    // Batch-fetch latest prices (2 per stock for change calc)
    var latestPricesMap = await _prices.GetLastNForStocksAsync(stockIds, 2, cancellationToken);

    // Batch-fetch valid predictions (3m horizon)
    var predictionsMap = await _predictions.GetValidForStocksAsync(
        stockIds, Domain.Enums.Horizon.ThreeMonths, cancellationToken);

    return allStocks.Select(stock =>
    {
        decimal? latestClose = null;
        double? change1dPct = null;

        if (latestPricesMap.TryGetValue(stock.Id, out var pxList) && pxList.Count > 0)
        {
            var sorted = pxList.OrderByDescending(p => p.Date).ToList();
            latestClose = sorted[0].Close;
            if (sorted.Count > 1 && sorted[1].Close != 0)
                change1dPct = (double)((sorted[0].Close - sorted[1].Close) / sorted[1].Close * 100);
        }

        string? signal = null;
        double? confidence = null;
        if (predictionsMap.TryGetValue(stock.Id, out var pred))
        {
            signal = pred.Signal.ToString() switch
            {
                "StrongBuy" => "Strong Buy",
                "StrongSell" => "Strong Sell",
                _ => pred.Signal.ToString()
            };
            confidence = pred.Confidence;
        }

        return new StockOverviewDto
        {
            Ticker = stock.Ticker,
            Name = stock.Name,
            Sector = stock.Sector,
            LatestClose = latestClose,
            Change1dPct = change1dPct,
            LatestSignal = signal,
            SignalConfidence = confidence,
        };
    }).ToList();
}

private async Task SeedMissingStocksAsync(
    List<Domain.Entities.Stock> existing,
    CancellationToken cancellationToken)
{
    var names = await _ml.GetTickerNamesAsync(cancellationToken);
    if (names == null || names.Count == 0)
    {
        _logger.LogWarning("Could not seed stocks — ML /names unavailable");
        return;
    }

    var existingTickers = existing.Select(s => s.Ticker).ToHashSet(StringComparer.OrdinalIgnoreCase);
    var toAdd = names
        .Where(kv => !existingTickers.Contains(kv.Key))
        .Select(kv => new Domain.Entities.Stock
        {
            Id = Guid.NewGuid(),
            Ticker = kv.Key,
            Name = kv.Value.Name,
            Sector = kv.Value.Sector,
            LastUpdatedAt = DateTime.UtcNow,
        })
        .ToList();

    if (toAdd.Count > 0)
    {
        await _stocks.AddRangeAsync(toAdd, cancellationToken);
        _logger.LogInformation("Seeded {Count} stocks from ML /names endpoint", toAdd.Count);
    }
}
```

Note: You'll need to add `IPredictionRepository _predictions` as an injected dependency in the `StockService` constructor. Check the existing constructor and add it alongside the other dependencies.

- [ ] **Step 5: Add controller endpoint**

In `src/backend/API/Controllers/StocksController.cs`, add before the `Search` method:

```csharp
[HttpGet]
public async Task<ActionResult<List<StockOverviewDto>>> GetAll(CancellationToken cancellationToken)
{
    var result = await _stockService.GetAllOverviewAsync(cancellationToken);
    return Ok(result);
}
```

Add the DTO import if not already present:
```csharp
using StockPredictor.Application.DTOs.Stocks;
```

- [ ] **Step 6: Build backend to verify compilation**

```bash
cd src/backend && dotnet build
```

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(backend): add GET /api/stocks with seed-on-first-call for 499 tickers"
```

---

## Task 6: Fix RefreshStockPricesJob Name Backfill

**Files:**
- Modify: `src/backend/Infrastructure/Jobs/RefreshStockPricesJob.cs`

- [ ] **Step 1: Add name/sector backfill logic**

In `RefreshStockPricesJob.cs`, after the line that updates `stock.LastUpdatedAt` (around line 61), add:

```csharp
// Backfill name/sector if missing
if (string.IsNullOrEmpty(stock.Name) && !string.IsNullOrEmpty(data.Name))
{
    stock.Name = data.Name;
    _logger.LogInformation("Backfilled name for {Ticker}: {Name}", ticker, data.Name);
}
if (string.IsNullOrEmpty(stock.Sector) && !string.IsNullOrEmpty(data.Sector))
{
    stock.Sector = data.Sector;
}
```

Note: The ML response `data` of type `MlStockDataResponse` already has `Name` and `Sector` fields (nullable). The `data` variable is assigned around line 47: `var data = await _ml.GetStockDataAsync(...)`. But the `period` is `"1mo"` which still returns name/sector from the ML service.

- [ ] **Step 2: Build to verify**

```bash
cd src/backend && dotnet build
```

- [ ] **Step 3: Commit**

```bash
git add src/backend/Infrastructure/Jobs/RefreshStockPricesJob.cs
git commit -m "fix(backend): backfill null stock names during price refresh"
```

---

## Task 7: Video Background on Auth Pages

**Files:**
- Move: `src/frontend/screenshots/chart_video.mp4` → `src/frontend/src/assets/chart-video.mp4`
- Modify: `src/frontend/src/pages/LoginPage.tsx`
- Modify: `src/frontend/src/pages/RegisterPage.tsx`

- [ ] **Step 1: Move the video file**

```bash
cp src/frontend/screenshots/chart_video.mp4 src/frontend/src/assets/chart-video.mp4
```

- [ ] **Step 2: Add video to LoginPage.tsx**

In `src/frontend/src/pages/LoginPage.tsx`, add the video import at the top:

```tsx
import chartVideo from '@/assets/chart-video.mp4';
```

Then add the video element and overlay right after the opening `<div>` (the root container), before the background glows:

```tsx
{/* Video background */}
<video
  autoPlay
  muted
  loop
  playsInline
  className="absolute inset-0 w-full h-full object-cover z-0"
  src={chartVideo}
/>
{/* Video overlay — 60% dark */}
<div className="absolute inset-0 z-[1] bg-gradient-to-b from-[#07080d]/70 via-[#07080d]/50 to-[#07080d]/70" />
```

Update the background glows `z-index` by changing their container to `z-[2]`, and the noise overlay stays at `z-[60]`. The card container should have `z-10` (it already does as `relative z-10`).

- [ ] **Step 3: Add video to RegisterPage.tsx**

Same changes as LoginPage — add video import, video element, and overlay. The RegisterPage has the same structure.

- [ ] **Step 4: Verify both pages visually — video should loop behind the glass card with 60% dark overlay**

- [ ] **Step 5: Commit**

```bash
git add src/frontend/src/assets/chart-video.mp4 src/frontend/src/pages/LoginPage.tsx src/frontend/src/pages/RegisterPage.tsx
git commit -m "feat: add looping video background to login and register pages"
```

---

## Task 8: Signal Distribution — Vertical Bar Chart

**Files:**
- Modify: `src/frontend/src/components/dashboard/MarketOverview.tsx`

- [ ] **Step 1: Replace the signal distribution card with a vertical bar chart**

In `src/frontend/src/components/dashboard/MarketOverview.tsx`, replace the Signal Distribution card (the third card in the grid, starting around line 98) with:

```tsx
{/* Signal Distribution — Vertical Bar Chart */}
<div className="animate-slide-up">
  <div className="rounded-[1.5rem] bg-white/[0.03] p-1 ring-1 ring-white/[0.06]">
    <div className="rounded-[calc(1.5rem-0.25rem)] bg-white/[0.03] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <div className="flex items-center gap-2 mb-4">
        <Minus size={14} weight="bold" className="text-purple-400" />
        <span className="text-[11px] uppercase tracking-[0.15em] font-medium text-gray-500">
          Signal Distribution
        </span>
      </div>
      <div className="flex items-end justify-between gap-3 h-[140px] pt-6">
        {signalDist.map(({ signal, count }) => (
          <div key={signal} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
            <span className="text-[11px] tabular-nums text-gray-400 font-medium">
              {count}
            </span>
            <div
              className={cn(
                'w-full rounded-t-lg transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] min-h-[4px]',
                signalBarColors[signal],
                count === 0 && 'opacity-20'
              )}
              style={{ height: `${maxCount > 0 ? Math.max((count / maxCount) * 100, 4) : 4}%` }}
            />
            <span className="text-[9px] text-gray-500 text-center leading-tight whitespace-nowrap">
              {signal.replace('Strong ', 'S.')}
            </span>
          </div>
        ))}
      </div>
    </div>
  </div>
</div>
```

- [ ] **Step 2: Verify on the dashboard — bars should scale proportionally with counts on top and labels below**

- [ ] **Step 3: Commit**

```bash
git add src/frontend/src/components/dashboard/MarketOverview.tsx
git commit -m "feat: replace signal distribution with vertical bar chart"
```

---

## Task 9: Frontend — All Stocks Page

**Files:**
- Create: `src/frontend/src/components/stocks/StockCard.tsx`
- Create: `src/frontend/src/pages/AllStocksPage.tsx`
- Modify: `src/frontend/src/types/index.ts`
- Modify: `src/frontend/src/services/stockService.ts`
- Modify: `src/frontend/src/App.tsx`
- Modify: `src/frontend/src/components/layout/Sidebar.tsx`

- [ ] **Step 1: Add StockOverview type**

In `src/frontend/src/types/index.ts`, add after the `StockDetail` interface:

```ts
export interface StockOverview {
  ticker: string;
  name: string | null;
  sector: string | null;
  latestClose: number | null;
  change1dPct: number | null;
  latestSignal: TradingSignal | null;
  signalConfidence: number | null;
}
```

- [ ] **Step 2: Add getAll service function**

In `src/frontend/src/services/stockService.ts`, add:

```ts
import type { StockSearchResult, StockDetail, StockOverview } from '@/types';

export async function getAll(): Promise<StockOverview[]> {
  const { data } = await api.get<StockOverview[]>('/api/stocks');
  return data;
}
```

- [ ] **Step 3: Create StockCard component**

Create `src/frontend/src/components/stocks/StockCard.tsx`:

```tsx
import { useNavigate } from 'react-router';
import { formatPrice, formatPct } from '@/utils/formatters';
import SignalBadge from '@/components/common/SignalBadge';
import { cn } from '@/utils/cn';
import type { StockOverview } from '@/types';

interface StockCardProps {
  stock: StockOverview;
}

export default function StockCard({ stock }: StockCardProps) {
  const navigate = useNavigate();

  return (
    <div
      className="group cursor-pointer rounded-[1.25rem] bg-white/[0.03] p-0.5 ring-1 ring-white/[0.06] transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:ring-purple-500/15 hover:bg-white/[0.04]"
      onClick={() => navigate(`/stocks/${stock.ticker}`)}
    >
      <div className="rounded-[calc(1.25rem-0.125rem)] bg-white/[0.03] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
        {/* Ticker + Name */}
        <div className="mb-3">
          <p className="font-heading text-sm font-bold tracking-[-0.02em] text-white group-hover:text-purple-300 transition-colors duration-300">
            {stock.ticker}
          </p>
          <p className="text-xs text-gray-500 truncate">
            {stock.name ?? '—'}
          </p>
        </div>

        {/* Price + Change */}
        <div className="flex items-baseline justify-between mb-3">
          <span className="text-sm tabular-nums font-medium text-gray-300">
            {stock.latestClose != null ? formatPrice(stock.latestClose) : '—'}
          </span>
          {stock.change1dPct != null && (
            <span
              className={cn(
                'text-xs tabular-nums font-medium',
                stock.change1dPct >= 0 ? 'text-green-400' : 'text-red-400'
              )}
            >
              {formatPct(stock.change1dPct)}
            </span>
          )}
        </div>

        {/* Signal */}
        <div>
          {stock.latestSignal ? (
            <SignalBadge signal={stock.latestSignal} size="md" />
          ) : (
            <span className="text-[10px] text-gray-600 uppercase tracking-wider">
              No prediction
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create AllStocksPage**

Create `src/frontend/src/pages/AllStocksPage.tsx`:

```tsx
import { useState, useEffect, useMemo } from 'react';
import { MagnifyingGlass } from '@phosphor-icons/react';
import * as stockService from '@/services/stockService';
import StockCard from '@/components/stocks/StockCard';
import { Skeleton } from '@/components/ui/skeleton';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import type { StockOverview } from '@/types';

export default function AllStocksPage() {
  useDocumentTitle('All Stocks');
  const [stocks, setStocks] = useState<StockOverview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [sector, setSector] = useState('All');

  useEffect(() => {
    stockService.getAll()
      .then(setStocks)
      .catch(() => setError('Failed to load stocks'))
      .finally(() => setIsLoading(false));
  }, []);

  const sectors = useMemo(() => {
    const set = new Set(stocks.map(s => s.sector).filter(Boolean) as string[]);
    return ['All', ...Array.from(set).sort()];
  }, [stocks]);

  const filtered = useMemo(() => {
    let result = stocks;
    if (sector !== 'All') {
      result = result.filter(s => s.sector === sector);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(s =>
        s.ticker.toLowerCase().includes(q) ||
        (s.name?.toLowerCase().includes(q) ?? false)
      );
    }
    return result;
  }, [stocks, sector, search]);

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-slide-up">
      {/* Header */}
      <div className="space-y-2">
        <span className="inline-block rounded-full bg-purple-500/10 border border-purple-500/20 px-3 py-1 text-[10px] uppercase tracking-[0.2em] font-medium text-purple-400">
          Browse
        </span>
        <h1 className="font-heading text-3xl font-bold tracking-[-0.03em]">All Stocks</h1>
        <p className="text-sm text-gray-500 leading-relaxed">
          Browse all {stocks.length} S&P 500 stocks in our universe
        </p>
      </div>

      {/* Search + Sector filter */}
      <div className="space-y-3">
        <div className="relative max-w-md">
          <MagnifyingGlass
            size={14}
            weight="light"
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500"
          />
          <input
            placeholder="Filter by ticker or name…"
            className="glass-input w-full rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder:text-gray-600 outline-none"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {sectors.map(s => (
            <button
              key={s}
              onClick={() => setSector(s)}
              className={`px-3 py-1.5 text-[11px] font-medium rounded-lg transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${
                sector === s
                  ? 'bg-purple-500/15 text-purple-300 border border-purple-500/25'
                  : 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.04] border border-transparent'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="h-[130px] rounded-2xl bg-white/[0.04]" />
          ))}
        </div>
      ) : error ? (
        <p className="text-sm text-red-400 py-12 text-center">{error}</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-gray-500 py-12 text-center">
          No stocks match your filter.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map(stock => (
            <StockCard key={stock.ticker} stock={stock} />
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Add route to App.tsx**

In `src/frontend/src/App.tsx`, add the import and route:

```tsx
// Add import:
import AllStocksPage from '@/pages/AllStocksPage';

// Add route inside the protected AppLayout block (after /dashboard, before /stocks/:ticker):
<Route path="/stocks" element={<AllStocksPage />} />
```

Important: place `/stocks` BEFORE `/stocks/:ticker` so the exact match takes priority.

- [ ] **Step 6: Add sidebar nav link**

In `src/frontend/src/components/layout/Sidebar.tsx`, add to the `NAV_ITEMS` array. Import `SquaresFour` from phosphor:

```tsx
import { ChartLine, ChartBar, Gear, SquaresFour } from '@phosphor-icons/react';

const NAV_ITEMS = [
  { to: '/dashboard', icon: ChartLine, label: 'Dashboard' },
  { to: '/stocks', icon: SquaresFour, label: 'All Stocks' },
  { to: '/predictions', icon: ChartBar, label: 'Predictions' },
  { to: '/settings', icon: Gear, label: 'Settings' },
] as const;
```

- [ ] **Step 7: Verify build**

```bash
cd src/frontend && npx tsc --noEmit
```

- [ ] **Step 8: Verify the page renders with 499 stock cards, filter works, sector pills work, clicking a card navigates to stock detail**

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: add All Stocks browse page with 499 S&P 500 stock cards"
```

---

## Verification Checklist

After all tasks are complete:

- [ ] Search dropdown is opaque and clearly visible over dashboard
- [ ] Chart: select 1M, zoom out → more data appears smoothly
- [ ] Add a stock to watchlist → sidebar updates without page refresh
- [ ] TSLA and other stocks show their company names
- [ ] Login/register pages show looping video behind glass card
- [ ] Dashboard signal distribution shows vertical bars
- [ ] `/stocks` page shows 499 cards with filter and sector pills
- [ ] Landing page is completely unchanged
- [ ] `npx tsc --noEmit` passes with zero errors
- [ ] `npx vite build` succeeds
