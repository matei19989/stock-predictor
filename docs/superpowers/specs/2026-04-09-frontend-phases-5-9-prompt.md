# StockPredictor Frontend — Phases 5–9 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use **superpowers:subagent-driven-development** to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. **Execution approach chosen: Subagent-Driven.**
>
> **Required skills (invoke each at the appropriate stage):**
> - **superpowers:subagent-driven-development** — orchestrate implementation: dispatch one subagent per task, then two-stage review after each phase
> - **superpowers:verification-before-completion** — run verification commands and confirm output before any success claims
> - **superpowers:requesting-code-review** — dispatch final code review after all phases complete
> - **superpowers:finishing-a-development-branch** — complete development after final review
>
> **Execution flow per phase:**
> 1. **Implement** — dispatch implementer subagent(s) for each task in the phase
> 2. **Build gate** — run `npm run build` (frontend) or `dotnet build` (backend). Fix all errors before proceeding.
> 3. **Spec compliance review** — dispatch a reviewer subagent to verify every requirement in the phase was implemented correctly. If issues found → fix with implementer subagent → re-review until ✅
> 4. **Code quality review** — dispatch a reviewer subagent to check for bugs, runtime errors, missing null checks, React hook issues. If issues found → fix → re-review until ✅
> 5. **Mark phase complete** — only after both reviews pass
>
> This is the same process used for Phases 0–4. Do NOT skip reviews. Do NOT proceed to the next phase with unfixed issues.

**Goal:** Complete the remaining frontend pages (Search, Stock Detail, Predictions, Settings) + backend password-change endpoint, fix the JWT session-restore bug, and polish the entire app for deployment.

**Architecture:** Continues from Phases 0–4. Global state in two React Contexts (auth + sidebar). API calls only in `services/`; components consume custom hooks. `@/` import aliases everywhere. Tailwind CSS v4 + shadcn/ui. No Redux, no Zustand.

**Tech Stack:** React 19, TypeScript strict (ES2023), Vite 8, Tailwind CSS v4, shadcn/ui (New York/neutral), React Router v7, Axios, React Hook Form + Zod, Sonner (toasts), Phosphor Icons, Lightweight Charts (TradingView)

---

## Critical Context (Not Derivable From Code Alone)

### JWT Session-Restore Bug

The backend uses `System.Security.Claims.ClaimTypes` which writes **long URI claim names** into the JWT:

| ClaimTypes constant | Actual JWT key |
|---|---|
| `ClaimTypes.NameIdentifier` | `http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier` |
| `ClaimTypes.Email` | `http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress` |
| `ClaimTypes.Name` | `http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name` |

The frontend `AuthContext` decodes the JWT on page refresh and reads `payload.name` and `payload.email` — which will be **`undefined`** because the actual keys are the long URIs above.

**Fix (Phase 8):** Store username and email in localStorage alongside the token. Read from localStorage on session restore instead of JWT decode. The `exp` claim works fine (it's a standard registered JWT claim, always in short form).

### Backend API Reference

**JSON casing:** ASP.NET Core uses `System.Text.Json` with default camelCase. All PascalCase C# properties serialize to camelCase. No custom configuration.

**Signal strings:** Backend `TradingSignal` enum serializes via `ToWireString()` to exactly: `"Strong Sell"`, `"Sell"`, `"Hold"`, `"Buy"`, `"Strong Buy"` — matches the frontend `TradingSignal` type perfectly.

**Horizon strings:** `"3m"`, `"6m"`, `"1y"` — only `"3m"` has a trained ML model. `"6m"` and `"1y"` return HTTP 501 with `{ "error": "horizon_not_supported" }`.

**Prediction probabilities:** `Record<string, double>` where keys are signal names (`"Strong Sell"`, ..., `"Strong Buy"`) and values are probabilities summing to ~1.0, each rounded to 4dp.

**No password-change endpoint exists.** Must be added in Phase 8.

### Backend Endpoints Used in Phases 5–9

```
GET  /api/stocks/search?q={query}     → StockSearchResult[]
GET  /api/stocks/{ticker}             → StockDetail (with prices[])
POST /api/predictions                 → Prediction (get-or-create)
GET  /api/predictions/{ticker}?horizon=3m → Prediction | 404
PUT  /api/auth/password               → 204 (to be created in Phase 8)
```

**Response shapes (camelCase as received by frontend):**

```typescript
// GET /api/stocks/search?q=
{ ticker, name?, sector?, latestClose?, isInWatchlist }

// GET /api/stocks/{ticker}
{ ticker, name?, sector?, lastUpdatedAt, prices: [{ date, open, high, low, close, volume }] }

// POST /api/predictions  |  GET /api/predictions/{ticker}
{ ticker, horizon, signal, confidence, probabilities, featuresUsed, lowConfidence, cachedAt, expiresAt }
```

### What Phases 0–4 Already Built

**Foundation (Phase 0):** Vite config (`@/` alias, `/api` proxy), Tailwind v4, shadcn/ui (14 components), types, constants, formatters, env declarations.

**App Shell (Phase 1):** Navigation service, axios instance with interceptors, JWT utils, AuthContext (with placeholder login/register), SidebarContext, useAuth hook, ErrorBoundary (with resetKey fix), LoadingSpinner, SkeletonCard, ProtectedRoute, PublicLayout, Navbar (with hardcoded search Input), Sidebar (nav + watchlist quick-access), AppLayout, all page stubs, App.tsx router, main.tsx providers.

**Auth (Phase 2):** authService, AuthContext wired to authService, LoginForm (RHF+Zod), RegisterForm, LoginPage, RegisterPage.

**Landing (Phase 3):** Full LandingPage with hero, features, how-it-works, footer.

**Dashboard (Phase 4):** watchlistService, useWatchlist hook (optimistic remove), SignalBadge, EmptyState, SummaryCards, WatchlistTable (sortable, remove dialog), DashboardPage, Sidebar watchlist section.

**Key files that will be modified in Phases 5–9:**

| File | Phase | Change |
|---|---|---|
| `src/components/layout/Navbar.tsx` | 5 | Replace hardcoded Input with SearchBar |
| `src/contexts/AuthContext.tsx` | 8 | Store user info in localStorage |
| `src/utils/constants.ts` | 8 | Add USER_KEY constant |
| `src/services/authService.ts` | 8 | Add changePassword() |
| `src/components/layout/Sidebar.tsx` | 9 | Sheet overlay on mobile |

### Backend Files to Create/Modify (Phase 8)

The backend follows Clean Architecture: Domain → Application → Infrastructure → API.

| Layer | File | Change |
|---|---|---|
| Application | `DTOs/Auth/ChangePasswordRequest.cs` | Create |
| Application | `Validators/ChangePasswordRequestValidator.cs` | Create |
| Application | `Interfaces/Services/IAuthService.cs` | Add method |
| Application | `Interfaces/Repositories/IUserRepository.cs` | Add GetByIdAsync |
| Infrastructure | `Services/AuthService.cs` | Implement ChangePasswordAsync |
| Infrastructure | `Repositories/UserRepository.cs` | Implement GetByIdAsync |
| API | `Controllers/AuthController.cs` | Add endpoint |

---

## File Map

### Phase 5 — Created / Modified
- `src/services/stockService.ts` — search(), getDetail()
- `src/hooks/useStockSearch.ts` — debounced search (300ms)
- `src/components/search/SearchBar.tsx` — input + dropdown trigger
- `src/components/search/SearchDropdown.tsx` — floating result list
- `src/components/search/SearchResultCard.tsx` — card for results page
- `src/pages/SearchResultsPage.tsx` — implemented (was stub)
- `src/components/layout/Navbar.tsx` — modified: replace Input with SearchBar

### Phase 6 — Created / Modified
- `src/services/predictionService.ts` — create(), getLatest()
- `src/hooks/usePrediction.ts` — fetch/create prediction state
- `src/components/stock/StockHeader.tsx` — ticker, name, price, change, watchlist toggle
- `src/components/stock/StockChart.tsx` — Lightweight Charts candlestick + volume
- `src/components/stock/PredictionCard.tsx` — signal, confidence, probabilities, cache status
- `src/components/stock/ProbabilityBars.tsx` — horizontal bars for 5 signals
- `src/components/common/ConfidenceGauge.tsx` — progress bar + percentage
- `src/components/stock/PriceSummary.tsx` — 52w high/low, avg volume
- `src/pages/StockDetailPage.tsx` — implemented (was stub)

### Phase 7 — Created / Modified
- `src/components/predictions/PredictionTable.tsx` — signal-focused table
- `src/pages/PredictionsPage.tsx` — implemented (was stub)

### Phase 8 — Created / Modified (frontend + backend)
- `src/utils/constants.ts` — modified: add USER_KEY
- `src/contexts/AuthContext.tsx` — modified: localStorage user info
- `src/services/authService.ts` — modified: add changePassword()
- `src/pages/SettingsPage.tsx` — implemented (was stub)
- Backend: 7 files (see table above)

### Phase 9 — Modified
- `src/components/layout/Sidebar.tsx` — Sheet overlay on mobile
- `src/components/layout/Navbar.tsx` — close sidebar on mobile after nav
- `src/hooks/useDocumentTitle.ts` — created
- ~8 pages modified for document titles
- Accessibility pass across icon buttons, dropdowns, dialogs

---

## Phase 5: Search

### Task 5.1: stockService

- [ ] Create `src/services/stockService.ts`:

```typescript
import api from './api';
import type { StockSearchResult, StockDetail } from '@/types';

export async function search(query: string): Promise<StockSearchResult[]> {
  const { data } = await api.get<StockSearchResult[]>('/api/stocks/search', {
    params: { q: query },
  });
  return data;
}

export async function getDetail(ticker: string): Promise<StockDetail> {
  const { data } = await api.get<StockDetail>(`/api/stocks/${ticker}`);
  return data;
}
```

### Task 5.2: useStockSearch Hook

Debounced search — waits 300ms after the user stops typing before firing the API call.

- [ ] Create `src/hooks/useStockSearch.ts`:

```typescript
import { useState, useEffect, useRef } from 'react';
import * as stockService from '@/services/stockService';
import type { StockSearchResult } from '@/types';

interface UseStockSearchReturn {
  results: StockSearchResult[];
  isLoading: boolean;
}

export function useStockSearch(query: string, enabled = true): UseStockSearchReturn {
  const [results, setResults] = useState<StockSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!enabled || query.trim().length < 1) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    clearTimeout(timeoutRef.current);

    timeoutRef.current = setTimeout(async () => {
      try {
        const data = await stockService.search(query.trim());
        setResults(data);
      } catch {
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(timeoutRef.current);
  }, [query, enabled]);

  return { results, isLoading };
}
```

### Task 5.3: SearchBar

The SearchBar replaces the hardcoded `<Input>` in the Navbar. It manages its own query state and dropdown visibility.

- [ ] Create `src/components/search/SearchBar.tsx`:

Build the full component (~90 lines). Key elements:

- **State:** `query` (string), `isOpen` (boolean, controls dropdown visibility)
- **Hook:** `const { results, isLoading } = useStockSearch(query, isOpen)`
- **Input:** shadcn `<Input>` with Phosphor `<MagnifyingGlass>` icon positioned left (`absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground`), `pl-9` on input
  - `value={query}`, `onChange` updates query and opens dropdown
  - `onFocus`: open dropdown if query has content
  - `onKeyDown`: Enter → navigate to `/search?q=${query}`, close dropdown; Escape → close dropdown
- **Dropdown:** Render `<SearchDropdown>` when `isOpen && query.trim().length > 0`
- **Click outside:** Use a `useRef` on the wrapper div and a `useEffect` with `mousedown` listener to close the dropdown when clicking outside
- **Root div:** `className="relative flex-1 max-w-md mx-auto"` (same sizing as the current Navbar center section)
- Navigate using `useNavigate()` from `react-router`

### Task 5.4: SearchDropdown

Positioned below the SearchBar, shows top 5 results with a "View all results" link.

- [ ] Create `src/components/search/SearchDropdown.tsx`:

Build the full component (~80 lines). Key elements:

- **Root:** `<div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-md border bg-popover shadow-lg">` — positioned below the SearchBar
- **Loading state:** Show 3 skeleton rows (`<Skeleton className="h-10 w-full" />`)
- **No results:** `<p className="px-4 py-3 text-sm text-muted-foreground">No stocks found</p>`
- **Results list:** Up to 5 results. Each result is a clickable div:
  ```tsx
  <div
    className="flex cursor-pointer items-center justify-between px-4 py-2 hover:bg-accent"
    onClick={() => onSelect(result.ticker)}
  >
    <div>
      <span className="font-semibold">{result.ticker}</span>
      <span className="ml-2 text-sm text-muted-foreground">{result.name}</span>
    </div>
    <div className="text-right text-sm">
      <span className="tabular-nums">{formatPrice(result.latestClose)}</span>
      {result.isInWatchlist && (
        <span className="ml-2 text-xs text-muted-foreground">In watchlist</span>
      )}
    </div>
  </div>
  ```
- **Footer:** If results exist, show a "View all results" link:
  ```tsx
  <div className="border-t px-4 py-2">
    <button
      className="text-sm text-primary hover:underline"
      onClick={() => onViewAll()}
    >
      View all results
    </button>
  </div>
  ```
- **Props:** `results: StockSearchResult[]`, `isLoading: boolean`, `onSelect: (ticker: string) => void`, `onViewAll: () => void`
- Import `formatPrice` from `@/utils/formatters`

### Task 5.5: SearchResultCard

Card for the search results page — shows stock info with an "Add to Watchlist" button.

- [ ] Create `src/components/search/SearchResultCard.tsx`:

```typescript
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Plus, Check } from '@phosphor-icons/react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import * as watchlistService from '@/services/watchlistService';
import { formatPrice } from '@/utils/formatters';
import type { StockSearchResult } from '@/types';

interface SearchResultCardProps {
  result: StockSearchResult;
}

export default function SearchResultCard({ result }: SearchResultCardProps) {
  const navigate = useNavigate();
  const [inWatchlist, setInWatchlist] = useState(result.isInWatchlist);
  const [isAdding, setIsAdding] = useState(false);

  async function handleAdd(e: React.MouseEvent) {
    e.stopPropagation();
    setIsAdding(true);
    try {
      await watchlistService.add(result.ticker);
      setInWatchlist(true);
      toast.success(`${result.ticker} added to watchlist`);
    } catch {
      toast.error(`Failed to add ${result.ticker}`);
    } finally {
      setIsAdding(false);
    }
  }

  return (
    <Card
      className="cursor-pointer transition-colors hover:bg-muted/50"
      onClick={() => navigate(`/stocks/${result.ticker}`)}
    >
      <CardContent className="flex items-center justify-between p-4">
        <div>
          <p className="font-semibold">{result.ticker}</p>
          <p className="text-sm text-muted-foreground">{result.name ?? '—'}</p>
          {result.sector && (
            <p className="text-xs text-muted-foreground">{result.sector}</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="tabular-nums font-medium">
            {formatPrice(result.latestClose)}
          </span>
          {inWatchlist ? (
            <Button variant="outline" size="sm" disabled>
              <Check size={14} className="mr-1" /> In Watchlist
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              disabled={isAdding}
              onClick={handleAdd}
            >
              <Plus size={14} className="mr-1" />
              {isAdding ? 'Adding…' : 'Add'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
```

### Task 5.6: SearchResultsPage

- [ ] Implement `src/pages/SearchResultsPage.tsx`:

```typescript
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import * as stockService from '@/services/stockService';
import SearchResultCard from '@/components/search/SearchResultCard';
import EmptyState from '@/components/common/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import type { StockSearchResult } from '@/types';

export default function SearchResultsPage() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') ?? '';
  const [results, setResults] = useState<StockSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    stockService
      .search(query.trim())
      .then(setResults)
      .catch(() => setResults([]))
      .finally(() => setIsLoading(false));
  }, [query]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Search Results</h1>
        {query && (
          <p className="text-sm text-muted-foreground">
            Results for &ldquo;{query}&rdquo;
          </p>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-lg" />
          ))}
        </div>
      ) : results.length === 0 ? (
        <EmptyState
          title={query ? `No stocks found for "${query}"` : 'Search for stocks'}
          description={
            query
              ? 'Try a different ticker or company name.'
              : 'Use the search bar to find S&P 500 stocks.'
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((r) => (
            <SearchResultCard key={r.ticker} result={r} />
          ))}
        </div>
      )}
    </div>
  );
}
```

### Task 5.7: Update Navbar — Replace Search Input with SearchBar

- [ ] In `src/components/layout/Navbar.tsx`:

**Remove** the existing hardcoded Input and MagnifyingGlass icon in the center section. **Replace** with the SearchBar component.

Before (current center section — something like):
```tsx
<div className="flex-1 max-w-md mx-auto relative">
  <MagnifyingGlass ... className="absolute left-3 ..." />
  <Input placeholder="Search stocks..." className="pl-9" />
</div>
```

After:
```tsx
<SearchBar />
```

Add import: `import SearchBar from '@/components/search/SearchBar';`

Remove the `MagnifyingGlass` import if it's no longer used elsewhere in Navbar. Remove the `Input` import if no longer used in Navbar.

### Task 5.8: Phase 5 Verification

- [ ] Run `npm run build` — zero TypeScript errors
- [ ] Run `npm run dev`, log in
- [ ] Type "AAPL" in the search bar — dropdown shows results after 300ms ✓
- [ ] Click a dropdown result — navigates to `/stocks/AAPL` (stub page) ✓
- [ ] Press Enter — navigates to `/search?q=AAPL` ✓
- [ ] Search results page shows cards with ticker, name, sector, price ✓
- [ ] Click "Add" on a card not in watchlist — toast "AAPL added to watchlist", button changes to "In Watchlist" ✓
- [ ] Click a card body — navigates to `/stocks/AAPL` ✓
- [ ] Search for nonsense ("zzzzzz") — "No stocks found" empty state ✓
- [ ] Click outside dropdown — closes ✓
- [ ] Press Escape — closes dropdown ✓

---

## Phase 6: Stock Detail — Chart + Prediction

### Task 6.1: predictionService

- [ ] Create `src/services/predictionService.ts`:

```typescript
import api from './api';
import { ApiException } from './api';
import type { PredictRequest, Prediction } from '@/types';

export async function create(request: PredictRequest): Promise<Prediction> {
  const { data } = await api.post<Prediction>('/api/predictions', request);
  return data;
}

export async function getLatest(
  ticker: string,
  horizon = '3m'
): Promise<Prediction | null> {
  try {
    const { data } = await api.get<Prediction>(`/api/predictions/${ticker}`, {
      params: { horizon },
    });
    return data;
  } catch (err) {
    if (err instanceof ApiException && err.status === 404) {
      return null; // no cached prediction
    }
    throw err;
  }
}
```

### Task 6.2: usePrediction Hook

- [ ] Create `src/hooks/usePrediction.ts`:

```typescript
import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import * as predictionService from '@/services/predictionService';
import { ApiException } from '@/services/api';
import type { Prediction, Horizon } from '@/types';

interface UsePredictionReturn {
  prediction: Prediction | null;
  isLoading: boolean;
  isPredicting: boolean;
  error: string | null;
  fetch: (ticker: string, horizon?: Horizon) => Promise<void>;
  predict: (ticker: string, horizon?: Horizon) => Promise<void>;
}

export function usePrediction(): UsePredictionReturn {
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPredicting, setIsPredicting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async (ticker: string, horizon: Horizon = '3m') => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await predictionService.getLatest(ticker, horizon);
      setPrediction(data);
    } catch (err) {
      if (err instanceof ApiException && err.status === 503) {
        setError('Prediction service temporarily unavailable');
      } else if (err instanceof ApiException) {
        setError(err.detail);
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const predict = useCallback(async (ticker: string, horizon: Horizon = '3m') => {
    setIsPredicting(true);
    setError(null);
    try {
      const data = await predictionService.create({ ticker, horizon });
      setPrediction(data);
      toast.success('Prediction generated');
    } catch (err) {
      if (err instanceof ApiException) {
        if (err.status === 503) setError('Prediction service temporarily unavailable');
        else if (err.status === 501) setError('This horizon is not yet supported');
        else setError(err.detail);
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setIsPredicting(false);
    }
  }, []);

  return { prediction, isLoading, isPredicting, error, fetch, predict };
}
```

### Task 6.3: StockHeader

- [ ] Create `src/components/stock/StockHeader.tsx`:

Build the full component (~70 lines). Key elements:

- **Props:** `ticker: string`, `name: string | null`, `sector: string | null`, `latestPrice: number | null`, `change1dPct: number | null`, `isInWatchlist: boolean`, `onToggleWatchlist: () => void`, `isTogglingWatchlist: boolean`
- **Layout:** flex row, justify-between, items-start
- **Left side:**
  - Ticker in `text-3xl font-bold`
  - Name in `text-lg text-muted-foreground`
  - Sector as a small `<Badge variant="secondary">`
- **Right side:**
  - Latest price in `text-3xl font-bold tabular-nums`
  - 1-day change below price: `formatPct(change1dPct)` with green/red coloring
  - Watchlist toggle button below: `<Button variant={isInWatchlist ? "default" : "outline"}>` with `<Star weight={isInWatchlist ? "fill" : "regular"} />` icon. Text: "In Watchlist" / "Add to Watchlist"
- Import `Star` from `@phosphor-icons/react`, `Badge` from `@/components/ui/badge`, `Button`, `formatPrice`, `formatPct`

### Task 6.4: StockChart (Lightweight Charts)

This is the most complex component. It wraps the `lightweight-charts` library in a React component.

- [ ] Create `src/components/stock/StockChart.tsx`:

Build the full component (~170 lines). Key elements:

- **Props:** `prices: PricePoint[]`, `isLoading: boolean`
- **State:** `range` — one of `'1M' | '3M' | '6M' | '1Y' | '5Y'` (default `'1Y'`)
- **Container:** `<div ref={containerRef} className="h-[400px] w-full" />`
- **Time range buttons:** Row of `<Button variant={range === x ? 'default' : 'ghost'} size="sm">` for each range above the chart
- **Price filtering:** Filter `prices` by date based on selected range:
  ```typescript
  function filterByRange(prices: PricePoint[], range: string): PricePoint[] {
    const now = new Date();
    const cutoff = new Date();
    switch (range) {
      case '1M': cutoff.setMonth(now.getMonth() - 1); break;
      case '3M': cutoff.setMonth(now.getMonth() - 3); break;
      case '6M': cutoff.setMonth(now.getMonth() - 6); break;
      case '1Y': cutoff.setFullYear(now.getFullYear() - 1); break;
      case '5Y': cutoff.setFullYear(now.getFullYear() - 5); break;
    }
    return prices.filter(p => new Date(p.date) >= cutoff);
  }
  ```
- **Chart creation** in `useEffect`:
  ```typescript
  import { createChart, ColorType } from 'lightweight-charts';

  useEffect(() => {
    if (!containerRef.current || filtered.length === 0) return;

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: 400,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#64748b',
      },
      grid: {
        vertLines: { color: '#e2e8f0' },
        horzLines: { color: '#e2e8f0' },
      },
      timeScale: { borderColor: '#e2e8f0' },
      rightPriceScale: { borderColor: '#e2e8f0' },
    });

    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderUpColor: '#22c55e',
      borderDownColor: '#ef4444',
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
    });

    candlestickSeries.setData(
      filtered.map(p => ({
        time: p.date,
        open: Number(p.open),
        high: Number(p.high),
        low: Number(p.low),
        close: Number(p.close),
      }))
    );

    const volumeSeries = chart.addHistogramSeries({
      color: '#94a3b8',
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
    });

    chart.priceScale('volume').applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });

    volumeSeries.setData(
      filtered.map(p => ({
        time: p.date,
        value: Number(p.volume),
        color: Number(p.close) >= Number(p.open) ? '#22c55e40' : '#ef444440',
      }))
    );

    chart.timeScale().fitContent();

    // Responsive resize
    const ro = new ResizeObserver(entries => {
      const { width } = entries[0].contentRect;
      chart.applyOptions({ width });
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      chart.remove();
    };
  }, [filtered]);
  ```
- **NOTE:** Check the installed `lightweight-charts` version. If v5+, the API may use `chart.addSeries(CandlestickSeries, options)` instead of `chart.addCandlestickSeries(options)`. Adapt accordingly — check the package's TypeScript types.
- **Loading state:** If `isLoading`, show `<Skeleton className="h-[400px] w-full" />` instead of the chart
- **Empty state:** If `prices.length === 0 && !isLoading`, show a centered "No price data available" message

### Task 6.5: ProbabilityBars

- [ ] Create `src/components/stock/ProbabilityBars.tsx`:

```typescript
import { SIGNAL_ORDER, SIGNAL_DOT_COLORS } from '@/utils/constants';
import { cn } from '@/utils/cn';
import type { TradingSignal } from '@/types';

interface ProbabilityBarsProps {
  probabilities: Record<TradingSignal, number>;
  predictedSignal: TradingSignal;
}

export default function ProbabilityBars({ probabilities, predictedSignal }: ProbabilityBarsProps) {
  return (
    <div className="space-y-2">
      {SIGNAL_ORDER.map((signal) => {
        const pct = (probabilities[signal] ?? 0) * 100;
        const isActive = signal === predictedSignal;
        return (
          <div key={signal} className="flex items-center gap-3 text-sm">
            <span className={cn('w-24 text-right', isActive ? 'font-semibold' : 'text-muted-foreground')}>
              {signal}
            </span>
            <div className="flex-1 h-3 rounded-full bg-muted overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all', SIGNAL_DOT_COLORS[signal])}
                style={{ width: `${Math.max(pct, 1)}%` }}
              />
            </div>
            <span className={cn('w-14 tabular-nums', isActive ? 'font-semibold' : 'text-muted-foreground')}>
              {pct.toFixed(1)}%
            </span>
          </div>
        );
      })}
    </div>
  );
}
```

### Task 6.6: ConfidenceGauge

- [ ] Create `src/components/common/ConfidenceGauge.tsx`:

```typescript
import { Progress } from '@/components/ui/progress';
import { cn } from '@/utils/cn';

interface ConfidenceGaugeProps {
  confidence: number; // 0–1
  lowConfidence: boolean;
}

export default function ConfidenceGauge({ confidence, lowConfidence }: ConfidenceGaugeProps) {
  const pct = confidence * 100;
  const color = pct < 30 ? 'text-red-600' : pct < 50 ? 'text-amber-600' : 'text-green-600';

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Confidence</span>
        <span className={cn('font-semibold tabular-nums', color)}>
          {pct.toFixed(1)}%
        </span>
      </div>
      <Progress value={pct} className="h-2" />
      {lowConfidence && (
        <p className="text-xs text-amber-600">
          Low confidence — treat with caution
        </p>
      )}
    </div>
  );
}
```

### Task 6.7: PredictionCard

- [ ] Create `src/components/stock/PredictionCard.tsx`:

Build the full component (~120 lines). Key elements:

- **Props:** `prediction: Prediction | null`, `isLoading: boolean`, `isPredicting: boolean`, `error: string | null`, `onPredict: (horizon: Horizon) => void`
- **State:** `horizon: Horizon` (default `'3m'`)
- **Card layout:** shadcn `<Card>` with header "ML Prediction"
- **Horizon selector:** Three buttons (3 Months, 6 Months, 1 Year) — only 3m is active. 6m and 1y show a `<Tooltip>` with "Coming soon" and are visually muted/disabled.
  ```tsx
  <div className="flex gap-2">
    {(['3m', '6m', '1y'] as Horizon[]).map(h => (
      <Tooltip key={h}>
        <TooltipTrigger asChild>
          <Button
            variant={horizon === h ? 'default' : 'outline'}
            size="sm"
            onClick={() => setHorizon(h)}
            disabled={h !== '3m'}
          >
            {HORIZON_LABELS[h]}
          </Button>
        </TooltipTrigger>
        {h !== '3m' && <TooltipContent>Coming soon</TooltipContent>}
      </Tooltip>
    ))}
  </div>
  ```
- **Loading state:** `<SkeletonCard lines={5} />`
- **Error state (503):** "Prediction service temporarily unavailable" with muted styling
- **Error state (501):** "This horizon is not yet supported"
- **No prediction:** "No prediction yet" message + `<Button onClick={() => onPredict(horizon)}>Get Prediction</Button>` (disabled while `isPredicting`, shows "Analyzing…" text)
- **Has prediction:** Render:
  1. `<SignalBadge signal={prediction.signal} size="lg" />`
  2. `<ConfidenceGauge confidence={prediction.confidence} lowConfidence={prediction.lowConfidence} />`
  3. `<ProbabilityBars probabilities={prediction.probabilities} predictedSignal={prediction.signal} />`
  4. Cache status: `formatRelativeTime(prediction.cachedAt)` + `formatTimeUntil(prediction.expiresAt)` → "Predicted 3h ago · Expires in 21h"
  5. A "Refresh" button that calls `onPredict(horizon)`
- Import `HORIZON_LABELS` from `@/utils/constants`, `Tooltip` + `TooltipTrigger` + `TooltipContent` from `@/components/ui/tooltip`, `TooltipProvider` if needed
- Import `formatRelativeTime`, `formatTimeUntil` from `@/utils/formatters`

**IMPORTANT:** Wrap any `<Tooltip>` usage in `<TooltipProvider>` if shadcn's tooltip requires it. Check the generated `tooltip.tsx` file.

### Task 6.8: PriceSummary

- [ ] Create `src/components/stock/PriceSummary.tsx`:

```typescript
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatPrice, formatVolume } from '@/utils/formatters';
import type { PricePoint } from '@/types';

interface PriceSummaryProps {
  prices: PricePoint[];
}

export default function PriceSummary({ prices }: PriceSummaryProps) {
  if (prices.length === 0) return null;

  // Compute from the last 252 trading days (~1 year)
  const yearPrices = prices.slice(-252);
  const high52w = Math.max(...yearPrices.map(p => Number(p.high)));
  const low52w = Math.min(...yearPrices.map(p => Number(p.low)));
  const avgVolume = yearPrices.reduce((sum, p) => sum + Number(p.volume), 0) / yearPrices.length;

  const stats = [
    { label: '52-Week High', value: formatPrice(high52w) },
    { label: '52-Week Low', value: formatPrice(low52w) },
    { label: 'Avg Volume', value: formatVolume(avgVolume) },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Price Summary
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4">
          {stats.map(({ label, value }) => (
            <div key={label}>
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="text-lg font-semibold tabular-nums">{value}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
```

### Task 6.9: StockDetailPage

- [ ] Implement `src/pages/StockDetailPage.tsx`:

Build the full page (~120 lines). Key elements:

- Read `:ticker` from URL params via `useParams()`
- Fetch stock detail on mount: `stockService.getDetail(ticker)` — state: `stock`, `isLoading`, `error`
- Use `usePrediction()` hook — call `fetch(ticker)` on mount
- Use `useWatchlist()` — check `items.some(i => i.ticker === ticker)` for watchlist status
- Watchlist toggle handler:
  ```typescript
  async function handleToggleWatchlist() {
    setIsTogglingWatchlist(true);
    try {
      if (inWatchlist) {
        await watchlistService.remove(ticker);
        toast.success(`${ticker} removed from watchlist`);
      } else {
        await watchlistService.add(ticker);
        toast.success(`${ticker} added to watchlist`);
      }
      await refetch(); // refetch watchlist to update sidebar
    } catch {
      toast.error('Failed to update watchlist');
    } finally {
      setIsTogglingWatchlist(false);
    }
  }
  ```
- **Error state (404):** "Stock not found" with a "Go to Dashboard" link
- **Loading state:** Skeleton placeholders for header, chart, prediction card
- **Layout** (when loaded):
  ```tsx
  <div className="space-y-6">
    <StockHeader
      ticker={stock.ticker}
      name={stock.name}
      sector={stock.sector}
      latestPrice={latestPrice}
      change1dPct={change1dPct}
      isInWatchlist={inWatchlist}
      onToggleWatchlist={handleToggleWatchlist}
      isTogglingWatchlist={isTogglingWatchlist}
    />
    <StockChart prices={stock.prices} isLoading={false} />
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <PredictionCard
        prediction={prediction}
        isLoading={predIsLoading}
        isPredicting={isPredicting}
        error={predError}
        onPredict={(h) => predict(ticker, h)}
      />
      <PriceSummary prices={stock.prices} />
    </div>
  </div>
  ```
- **Compute `latestPrice` and `change1dPct`** from `stock.prices`:
  ```typescript
  const latestPrice = stock.prices.length > 0
    ? Number(stock.prices[stock.prices.length - 1].close) : null;
  const prevClose = stock.prices.length > 1
    ? Number(stock.prices[stock.prices.length - 2].close) : null;
  const change1dPct = latestPrice != null && prevClose != null && prevClose !== 0
    ? ((latestPrice - prevClose) / prevClose) * 100 : null;
  ```

### Task 6.10: Phase 6 Verification

Backend + ML service must be running.

- [ ] `npm run build` — zero TypeScript errors
- [ ] Navigate to `/stocks/AAPL` — header shows ticker, name, sector, price ✓
- [ ] Candlestick chart renders with OHLCV data ✓
- [ ] Click time range buttons (1M, 3M, 6M, 1Y, 5Y) — chart filters data ✓
- [ ] Prediction card shows "No prediction yet" + "Get Prediction" button ✓
- [ ] Click "Get Prediction" — spinner, then signal + confidence + probability bars appear ✓
- [ ] Cache status shows "Predicted just now · Expires in 24h" ✓
- [ ] Low confidence shows amber warning (if applicable) ✓
- [ ] 6M / 1Y horizon buttons disabled with "Coming soon" tooltip ✓
- [ ] Price Summary shows 52-week high/low and avg volume ✓
- [ ] "Add to Watchlist" button works ✓
- [ ] Navigate to nonexistent `/stocks/ZZZZZZ` — "Stock not found" error ✓
- [ ] Resize browser — chart resizes responsively ✓

---

## Phase 7: Predictions Overview

### Task 7.1: PredictionTable

- [ ] Create `src/components/predictions/PredictionTable.tsx`:

Build the full component (~130 lines). Key elements:

- **Props:** `items: WatchlistItem[]`, `onRequestPrediction: (ticker: string) => Promise<void>`, `requestingTicker: string | null`
- **Table columns:** Ticker, Name, Signal (SignalBadge), Confidence (ConfidenceGauge or "—"), Status (formatRelativeTime of prediction or "No prediction"), Action
- **Row click:** Navigate to `/stocks/{ticker}`
- **Action column:**
  - If `item.latestSignal` exists: `<Button variant="ghost" size="sm">View Details →</Button>` → navigates to `/stocks/{ticker}`
  - If no signal: `<Button variant="outline" size="sm" onClick={() => onRequestPrediction(ticker)}>Get Prediction</Button>` with loading state when `requestingTicker === ticker`
- **Sorting:** By ticker (default), or by confidence descending
- Import `SignalBadge`, `formatRelativeTime`, `useNavigate`
- Use `<Table>` from shadcn

### Task 7.2: PredictionsPage

- [ ] Implement `src/pages/PredictionsPage.tsx`:

```typescript
import { useState } from 'react';
import { toast } from 'sonner';
import { useWatchlist } from '@/hooks/useWatchlist';
import * as predictionService from '@/services/predictionService';
import { ApiException } from '@/services/api';
import PredictionTable from '@/components/predictions/PredictionTable';
import EmptyState from '@/components/common/EmptyState';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

export default function PredictionsPage() {
  const { items, isLoading, error, refetch } = useWatchlist();
  const [requestingTicker, setRequestingTicker] = useState<string | null>(null);

  async function handleRequestPrediction(ticker: string) {
    setRequestingTicker(ticker);
    try {
      await predictionService.create({ ticker, horizon: '3m' });
      toast.success(`Prediction generated for ${ticker}`);
      await refetch(); // refetch watchlist to get updated signal
    } catch (err) {
      if (err instanceof ApiException) {
        if (err.status === 503) toast.error('Prediction service temporarily unavailable');
        else if (err.status === 501) toast.error('This horizon is not yet supported');
        else toast.error(err.detail);
      }
    } finally {
      setRequestingTicker(null);
    }
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-4 py-16">
        <p className="text-sm text-destructive">{error}</p>
        <Button variant="outline" onClick={() => void refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Predictions</h1>
        <p className="text-sm text-muted-foreground">
          ML-powered trading signals for your watchlist
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          title="No stocks in your watchlist"
          description="Add stocks to your watchlist to see ML predictions."
        />
      ) : (
        <PredictionTable
          items={items}
          onRequestPrediction={handleRequestPrediction}
          requestingTicker={requestingTicker}
        />
      )}
    </div>
  );
}
```

### Task 7.3: Phase 7 Verification

- [ ] `npm run build` — zero TypeScript errors
- [ ] Navigate to `/predictions` — table shows all watchlist items ✓
- [ ] Items with predictions show signal badge + confidence ✓
- [ ] Items without predictions show "Get Prediction" button ✓
- [ ] Click "Get Prediction" — loading state, then signal appears ✓
- [ ] Click a row — navigates to `/stocks/{ticker}` ✓
- [ ] Empty watchlist shows empty state message ✓

---

## Phase 8: Settings + Backend Password Change + JWT Fix

### Task 8.1: Fix AuthContext Session Restore

The `AuthContext` currently decodes the JWT to get `payload.name` and `payload.email` on page refresh. This fails because the backend writes long URI claim names. Fix: store user info in localStorage.

- [ ] In `src/utils/constants.ts`, add:

```typescript
export const USER_KEY = 'sp_user';
```

- [ ] In `src/contexts/AuthContext.tsx`, import `USER_KEY`:

```typescript
import { TOKEN_KEY, USER_KEY } from '@/utils/constants';
```

- [ ] Modify `setAuthFromResponse` to also persist user info:

```typescript
const setAuthFromResponse = useCallback((response: AuthResponse) => {
  localStorage.setItem(TOKEN_KEY, response.token);
  localStorage.setItem(USER_KEY, JSON.stringify({ username: response.username, email: response.email }));
  setToken(response.token);
  setUser({ username: response.username, email: response.email });
}, []);
```

- [ ] Modify the session-restore `useEffect` to read user info from localStorage instead of JWT:

```typescript
useEffect(() => {
  const stored = localStorage.getItem(TOKEN_KEY);
  if (stored) {
    const payload = decodeJwtPayload(stored);
    if (payload && !isTokenExpired(payload)) {
      setToken(stored);
      const userJson = localStorage.getItem(USER_KEY);
      if (userJson) {
        try {
          const userData = JSON.parse(userJson) as User;
          setUser(userData);
        } catch {
          setToken(null);
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(USER_KEY);
        }
      }
    } else {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    }
  }
  setIsLoading(false);
}, []);
```

- [ ] Modify `logout` to also clear user info:

```typescript
const logout = useCallback(() => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  setToken(null);
  setUser(null);
  navigate('/');
}, [navigate]);
```

- [ ] Also update the 401 interceptor in `src/services/api.ts` to clear `USER_KEY`. Add `USER_KEY` to the existing import from `@/utils/constants`:

```typescript
import { TOKEN_KEY, USER_KEY } from '@/utils/constants';

// ... in the 401 handler:
if (error.response?.status === 401) {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  window.location.href = '/login';
  // ...
}
```

### Task 8.2: Backend — ChangePasswordRequest DTO + Validator

**IMPORTANT:** Backend changes must target the backend code. If working in the frontend worktree, the backend source is at `src/backend/`. If the worktree was branched from `main` and doesn't have the latest backend code, these changes may need to be made in the main project directory on `feature/backend-implementation` instead. Coordinate with the user.

- [ ] Create `src/backend/Application/DTOs/Auth/ChangePasswordRequest.cs`:

```csharp
namespace StockPredictor.Application.DTOs.Auth;

public class ChangePasswordRequest
{
    public string CurrentPassword { get; set; } = string.Empty;
    public string NewPassword { get; set; } = string.Empty;
}
```

- [ ] Create `src/backend/Application/Validators/ChangePasswordRequestValidator.cs`:

```csharp
using FluentValidation;
using StockPredictor.Application.DTOs.Auth;

namespace StockPredictor.Application.Validators;

public class ChangePasswordRequestValidator : AbstractValidator<ChangePasswordRequest>
{
    public ChangePasswordRequestValidator()
    {
        RuleFor(x => x.CurrentPassword)
            .NotEmpty().WithMessage("Current password is required.");

        RuleFor(x => x.NewPassword)
            .MinimumLength(8).WithMessage("New password must be at least 8 characters.")
            .NotEqual(x => x.CurrentPassword).WithMessage("New password must be different from current password.");
    }
}
```

### Task 8.3: Backend — IAuthService + AuthService Password Change

- [ ] In `src/backend/Application/Interfaces/Services/IAuthService.cs`, add:

```csharp
Task ChangePasswordAsync(Guid userId, ChangePasswordRequest request, CancellationToken cancellationToken = default);
```

- [ ] `GetByIdAsync` already exists on `IUserRepository` and `UserRepository` — no changes needed there.

- [ ] In `src/backend/Infrastructure/Services/AuthService.cs`, add the implementation:

```csharp
public async Task ChangePasswordAsync(Guid userId, ChangePasswordRequest request, CancellationToken cancellationToken = default)
{
    var user = await _users.GetByIdAsync(userId, cancellationToken)
        ?? throw new NotFoundException("User not found.");

    if (!BCrypt.Net.BCrypt.Verify(request.CurrentPassword, user.PasswordHash))
        throw new UnauthorizedException("Current password is incorrect.");

    user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
    await _users.UpdateAsync(user, cancellationToken);

    _logger.LogInformation("Password changed for user: {Username}", user.Username);
}
```

**Note:** If `IUserRepository` doesn't have `UpdateAsync`, add it to the interface and implement it in `UserRepository`. The existing repository uses `_db` as the `AppDbContext` field name (not `_context`):

```csharp
// Interface — add to IUserRepository
Task UpdateAsync(User user, CancellationToken cancellationToken = default);

// Implementation — add to UserRepository
public async Task UpdateAsync(User user, CancellationToken cancellationToken = default)
{
    _db.Users.Update(user);
    await _db.SaveChangesAsync(cancellationToken);
}
```

### Task 8.4: Backend — AuthController Endpoint

- [ ] In `src/backend/API/Controllers/AuthController.cs`, add:

```csharp
[HttpPut("password")]
[Authorize]
public async Task<IActionResult> ChangePassword(
    [FromBody] ChangePasswordRequest request,
    CancellationToken cancellationToken)
{
    var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    await _auth.ChangePasswordAsync(userId, request, cancellationToken);
    return NoContent();
}
```

**IMPORTANT:** The `AuthController` does NOT have `[Authorize]` at the class level (its other endpoints are public). The `[Authorize]` attribute must be added explicitly to this endpoint. Make sure `ClaimTypes` and `System.Security.Claims` are imported.

### Task 8.5: Frontend — authService.changePassword

- [ ] In `src/services/authService.ts`, add:

```typescript
export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<void> {
  await api.put('/api/auth/password', { currentPassword, newPassword });
}
```

### Task 8.6: SettingsPage

- [ ] Implement `src/pages/SettingsPage.tsx`:

Build the full page (~150 lines). Two card sections:

**Profile card:**
```tsx
<Card>
  <CardHeader>
    <CardTitle>Profile</CardTitle>
  </CardHeader>
  <CardContent className="space-y-4">
    <div>
      <Label className="text-muted-foreground">Username</Label>
      <p className="font-medium">{user?.username}</p>
    </div>
    <div>
      <Label className="text-muted-foreground">Email</Label>
      <p className="font-medium">{user?.email}</p>
    </div>
  </CardContent>
</Card>
```

**Password change card:**
- React Hook Form + Zod:
  ```typescript
  const passwordSchema = z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(8, 'New password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your new password'),
  }).refine(data => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });
  ```
- Three password input fields with labels and error messages
- Submit button: "Change Password" / "Changing…"
- On success: `toast.success('Password changed successfully')`, reset form
- On error:
  - 401 → `toast.error('Current password is incorrect')`
  - Other → `toast.error(err.detail)`

**Layout:** `<div className="mx-auto max-w-2xl space-y-6">`

### Task 8.7: Phase 8 Verification

- [ ] Backend builds without errors (`dotnet build`)
- [ ] Frontend `npm run build` — zero TypeScript errors
- [ ] Log in → refresh page → still authenticated with correct username in navbar ✓ (JWT fix)
- [ ] Navigate to `/settings` — profile shows username and email ✓
- [ ] Change password with wrong current password → error toast ✓
- [ ] Change password with correct current password → success toast ✓
- [ ] Log out → log in with new password → works ✓

---

## Phase 9: Polish & Error Handling

### Task 9.1: Responsive Sidebar (Sheet Overlay on Mobile)

- [ ] Modify `src/components/layout/Sidebar.tsx`:

On screens below `lg` (1024px), the sidebar should open as a Sheet (overlay) instead of pushing content. On `lg`+, it remains the inline sidebar.

Strategy:
- Import `Sheet`, `SheetContent` from `@/components/ui/sheet`
- Detect screen width or use the existing `isOpen` state
- On mobile: render sidebar content inside `<Sheet open={isOpen} onOpenChange={toggle}>` `<SheetContent side="left" className="w-64 p-0">`
- On desktop: render inline as before
- Use a CSS media query approach: render BOTH but use `hidden lg:flex` for inline and `lg:hidden` for sheet
- Close sidebar on navigation (on mobile): modify NavLinks to call `close()` on click when screen is small

```tsx
// Simplified approach:
const sidebarContent = (
  <>
    <nav>{/* nav links */}</nav>
    <div>{/* watchlist section */}</div>
  </>
);

return (
  <>
    {/* Desktop inline sidebar */}
    <aside className={cn('hidden lg:flex flex-col w-64 border-r bg-card shrink-0', !isOpen && 'lg:hidden')}>
      {sidebarContent}
    </aside>

    {/* Mobile sheet sidebar */}
    <Sheet open={isOpen && isMobile} onOpenChange={toggle}>
      <SheetContent side="left" className="w-64 p-0">
        {sidebarContent}
      </SheetContent>
    </Sheet>
  </>
);
```

Use a simple `isMobile` check: `window.innerWidth < 1024` or a `useMediaQuery` helper.

### Task 9.2: Dynamic Page Titles

- [ ] Create `src/hooks/useDocumentTitle.ts`:

```typescript
import { useEffect } from 'react';

export function useDocumentTitle(title: string) {
  useEffect(() => {
    const prev = document.title;
    document.title = title ? `${title} — StockPredictor` : 'StockPredictor';
    return () => { document.title = prev; };
  }, [title]);
}
```

- [ ] Add `useDocumentTitle` to all pages:

| Page | Title |
|---|---|
| LandingPage | `''` (empty string — renders as plain "StockPredictor") |
| LoginPage | `'Sign In'` |
| RegisterPage | `'Create Account'` |
| DashboardPage | `'Dashboard'` |
| StockDetailPage | `'{ticker}'` (dynamic) |
| SearchResultsPage | `'Search: {query}'` |
| PredictionsPage | `'Predictions'` |
| SettingsPage | `'Settings'` |
| NotFoundPage | `'Page Not Found'` |

### Task 9.3: Toast Notification Audit

Verify all mutations show toast feedback. Add missing toasts:

- [ ] `SearchResultCard` — already has "added to watchlist" toast ✓
- [ ] `StockDetailPage` watchlist toggle — already has add/remove toast ✓
- [ ] `PredictionsPage` "Get Prediction" — already has success/error toasts ✓
- [ ] `StockDetailPage` "Get Prediction" — verify `usePrediction` shows success toast ✓
- [ ] `SettingsPage` password change — already has success/error toasts ✓
- [ ] Network errors: verify axios interceptor shows "Network Error" for non-API failures

### Task 9.4: Loading Skeleton Audit

Replace any remaining bare spinners or empty states during loading:

- [ ] `StockDetailPage` — skeleton header + skeleton chart + skeleton cards while loading
- [ ] `SearchResultsPage` — skeleton cards (already done ✓)
- [ ] `PredictionsPage` — skeleton rows (already done ✓)
- [ ] `DashboardPage` — skeleton table + cards (already done ✓)

### Task 9.5: Error State Audit

Every page should handle errors gracefully:

- [ ] `StockDetailPage` — 404: "Stock not found" with link to dashboard. 5xx: "Failed to load stock data" with retry button
- [ ] `SearchResultsPage` — network error: "Failed to search. Try again."
- [ ] `PredictionsPage` — already has error state ✓
- [ ] `DashboardPage` — already has error state ✓
- [ ] ML service down: `PredictionCard` shows "service unavailable" instead of crashing

### Task 9.6: Accessibility Pass

- [ ] Icon buttons must have `aria-label`: hamburger button in Navbar, trash buttons in WatchlistTable, sort buttons
- [ ] Search dropdown: `role="listbox"` on the dropdown, `role="option"` on each result
- [ ] Keyboard navigation for search dropdown: ArrowDown/ArrowUp to move through results, Enter to select, Escape to close
- [ ] Dialog components: shadcn Dialog already handles focus trapping and aria attributes ✓
- [ ] Color contrast: signal badge colors on white background should meet WCAG AA (verify the emerald/green/amber/orange/red on white meet 4.5:1 ratio — if not, use darker variants like `bg-emerald-600`)

### Task 9.7: Phase 9 Verification (Full App Walkthrough)

- [ ] `npm run build` — zero TypeScript errors
- [ ] **Landing page:** Hero renders, CTA buttons work, responsive layout
- [ ] **Login:** Validation errors, incorrect password toast, successful login redirects
- [ ] **Dashboard:** Summary cards, sortable table, remove with dialog, sidebar watchlist
- [ ] **Search:** Debounced dropdown, "View all results", add to watchlist from results
- [ ] **Stock Detail:** Chart renders and resizes, time range filtering, prediction flow, watchlist toggle
- [ ] **Predictions:** Table with signals, "Get Prediction" inline, row navigation
- [ ] **Settings:** Profile info, password change form validation and submission
- [ ] **404:** Navigate to `/nonexistent` — friendly error page
- [ ] **Responsive:** Resize below 1024px — sidebar becomes Sheet overlay, tables scroll horizontally
- [ ] **Session restore:** Refresh page while logged in — stays authenticated, correct username shown
- [ ] **ML service down:** Prediction card shows "temporarily unavailable", app doesn't crash
- [ ] **Tab titles:** Each page shows correct title in browser tab

---

## Self-Review

### Spec Coverage Check

| Requirement | Covered In |
|---|---|
| Stock search with debounce (300ms) | Task 5.2, 5.3 |
| Search dropdown (top 5, click to navigate) | Task 5.4 |
| Search results page (card grid, add to watchlist) | Task 5.5, 5.6 |
| Navbar search integration | Task 5.7 |
| Stock detail header (price, change, watchlist toggle) | Task 6.3 |
| Candlestick chart (OHLCV, time ranges, resize) | Task 6.4 |
| Prediction card (signal, confidence, probabilities, cache, horizon) | Task 6.7 |
| Probability bars (5 signals, highlighted active) | Task 6.5 |
| Confidence gauge (progress bar, color, low-confidence warning) | Task 6.6 |
| Price summary (52w high/low, avg volume) | Task 6.8 |
| Predictions page (signal-focused table, inline predict) | Task 7.1, 7.2 |
| JWT session-restore fix (localStorage user info) | Task 8.1 |
| Backend password change endpoint | Task 8.2–8.4 |
| Settings page (profile + password change form) | Task 8.6 |
| Responsive sidebar (Sheet on mobile) | Task 9.1 |
| Dynamic page titles | Task 9.2 |
| Toast audit | Task 9.3 |
| Loading skeleton audit | Task 9.4 |
| Error state audit | Task 9.5 |
| Accessibility pass | Task 9.6 |

### Issues Identified and Fixed During Review

1. **`usePrediction` silent error swallowing** — both `fetch` and `predict` callbacks had no `else` branch for non-`ApiException` errors. **Fixed:** added `else { setError('An unexpected error occurred') }` to both.

2. **`PredictionCard` missing imports** — `formatRelativeTime` and `formatTimeUntil` were referenced in the description but not listed in imports. **Fixed:** added to import list.

3. **AuthContext session restore inconsistency** — `setToken(stored)` was called before `JSON.parse(userJson)`, so if parse failed, token state and localStorage were inconsistent. **Fixed:** added `setToken(null)` in the catch block.

4. **`api.ts` 401 interceptor hardcoded string** — used `'sp_user'` instead of importing `USER_KEY` constant. **Fixed:** now imports `USER_KEY` from constants.

5. **`useDocumentTitle` for LandingPage** — passing `'StockPredictor'` would produce `'StockPredictor — StockPredictor'`. **Fixed:** table now says pass `''` (empty string).

6. **Backend `UserRepository` field name** — snippets used `_context` but existing repository uses `_db`. **Fixed:** `UpdateAsync` snippet now uses `_db`. Removed duplicate `GetByIdAsync` snippet (already exists).

7. **`AuthController` missing `[Authorize]`** — plan incorrectly claimed `[Authorize]` was on the class. **Fixed:** added `[Authorize]` explicitly to the `ChangePassword` endpoint with a note explaining why.

### Remaining Notes for Implementer

1. **`lightweight-charts` API version:** The component uses `addCandlestickSeries()` which exists in v3/v4. If v5 is installed, the API uses `addSeries(CandlestickSeries)`. Check the installed version and adapt. A note is included in Task 6.4.

2. **`TooltipProvider` requirement:** shadcn's Tooltip requires a `<TooltipProvider>` wrapper. It may need to be added in `main.tsx` or locally in `PredictionCard`. Check the generated `tooltip.tsx`.

3. **Backend worktree branch:** The frontend worktree is on `feature/frontend-implementation` branched from `main`. Backend code on `feature/backend-implementation` may differ. Phase 8 backend tasks should be coordinated — either merge the backend branch first, or make backend changes separately.

4. **Sidebar Sheet + watchlist data:** The Sidebar calls `useWatchlist()` independently. When it becomes a Sheet component on mobile, the same hook still works — no change needed.

5. **`PredictionTable` ConfidenceGauge null check** — `WatchlistItem.signalConfidence` is `number | null` but `ConfidenceGauge` expects `number`. Guard with a null check before rendering (show "—" when null). TypeScript strict mode will enforce this at build time.

---

## Notes for Subagent Execution

### Task dispatch
- Each numbered **Task** is one subagent dispatch. Do not combine tasks.
- **Backend tasks (8.2–8.4) are separate subagent dispatches** targeting `src/backend/`. Verify with `dotnet build` from the backend project directory.
- When modifying existing files, **read the file first** to understand current structure.

### Review process (MANDATORY after every phase)
- After all tasks in a phase are implemented, run the **build gate** (`npm run build` or `dotnet build`). Fix all errors.
- Then dispatch a **spec compliance reviewer subagent** — verify every requirement was implemented. If issues → fix with implementer subagent → re-review.
- Then dispatch a **code quality reviewer subagent** — check for bugs, runtime errors, React issues, TypeScript strictness. If issues → fix → re-review.
- **Do NOT skip reviews.** Do NOT move to the next phase with unfixed issues.
- **Do NOT start code quality review before spec compliance passes.** Wrong order wastes time.

### Build and verification gates
- **Always run `npm run build` at each phase verification** — catches TypeScript errors before cascade.
- The backend must be running for Phase 5+ verification.
- The ML service must be running for Phase 6+ prediction testing.

### Code conventions
- Import paths: **always `@/` aliases**, never relative paths (except within `services/` where `./api` is acceptable for sibling imports, consistent with Phases 0–4).
- React Router imports: **always from `react-router`**, not `react-router-dom`.
- Lightweight Charts: check installed version before writing chart code.
- `erasableSyntaxOnly: true` in tsconfig — do NOT use TypeScript enums, namespaces, or decorators.
- `noUnusedLocals: true` and `noUnusedParameters: true` — unused imports/vars will fail the build. Prefix with `_` if intentionally unused.

### Final review after all phases
- After Phase 9 passes both reviews, dispatch a **final code reviewer subagent** across the entire implementation (Phases 5–9).
- Then invoke **superpowers:finishing-a-development-branch** to complete the work.
