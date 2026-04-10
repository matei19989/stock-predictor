5.5# Frontend Implementation Guide — StockPredictor

> **Purpose:** Comprehensive, session-portable guide for building the React frontend layer.  
> Each phase is self-contained and executable in a single focused prompt.  
> **Generated:** 2026-04-09 | **Status:** Ready for implementation

---

## Table of Contents

1. [Design Decisions](#1-design-decisions)
2. [Project Structure](#2-project-structure)
3. [Routes & Pages](#3-routes--pages)
4. [TypeScript Types (Backend DTO Mirror)](#4-typescript-types)
5. [Component Breakdown](#5-component-breakdown)
6. [State Management](#6-state-management)
7. [API Integration Layer](#7-api-integration-layer)
8. [Data Flow Diagrams](#8-data-flow-diagrams)
9. [Charts & Data Visualization](#9-charts--data-visualization)
10. [Authentication Flow](#10-authentication-flow)
11. [Phased Implementation Plan](#11-phased-implementation-plan)

---

## 1. Design Decisions

### Dashboard Layout → Watchlist Table + Summary Cards

The dashboard serves as the authenticated user's home. It shows:
- **Summary cards row** at the top: total stocks tracked, signal distribution breakdown (e.g., "2 Buy, 1 Hold, 1 Strong Buy, 1 no prediction"), strongest signal highlight
- **Watchlist table** below: ticker, company name, latest close, 1-day % change, signal badge, confidence bar, and row actions (view detail, remove)

**Why:** A table-only dashboard feels bare for a thesis demo. Adding summary cards provides an at-a-glance overview without the complexity of per-stock mini charts. The signal distribution card is particularly useful — it answers "what does the model think about my portfolio?" in one glance.

### Navigation → Top Navbar + Collapsible Left Sidebar

- **Top navbar (always visible):** App logo/name (left), search bar (center), user avatar/menu dropdown (right)
- **Left sidebar (collapsible):** Navigation links (Dashboard, Predictions, Settings) and a **watchlist quick-access list** showing each watched stock with a tiny signal-color dot. Clicking a stock navigates to its detail page.
- Sidebar is open by default on desktop, closed on tablet/smaller screens, togglable via hamburger icon in the navbar.

**Why:** Financial apps (Yahoo Finance, TradingView, Bloomberg Terminal) all use sidebar patterns for watchlist access. It makes the app feel purpose-built rather than generic. The collapsible behavior handles the responsive requirement without needing a separate mobile layout.

### Watchlist Management → Integrated into Dashboard (no separate page)

The dashboard IS the watchlist page. Adding stocks happens through search (navbar) → "Add to Watchlist" button on results. Removing stocks happens inline via a delete button on each watchlist row.

**Why:** A separate "Watchlist Management" page would duplicate the dashboard's table with slightly different actions. Inline management is more intuitive and reduces page count.

### Predictions Overview → Separate Page (signal-focused view)

A dedicated `/predictions` page shows all watchlist stocks in a **signal-focused table**: ticker, name, signal badge (color-coded), confidence gauge, prediction age ("2h ago", "expires in 22h"), and a "Get Prediction" button for stocks that don't have one.

**Why:** The dashboard focuses on prices/changes (market view), while the Predictions page focuses on ML signals (model view). This separation gives the app more depth and makes the thesis's ML component more visible. The data source is the same endpoint (`GET /api/watchlist` already returns `LatestSignal` and `SignalConfidence`), so there's no backend work needed.

### Landing Page → Public page with hero + feature highlights

Simple, clean public page: hero section with headline + CTA buttons (Sign Up / Login), a features section (3-4 cards: ML Predictions, Real-time Data, Watchlist Tracking, Sentiment Analysis), and a brief "how it works" section.

**Why:** Every SaaS-style app needs a landing page. It sets the tone, and for a thesis demo it's the first thing the evaluator sees.

### Stock Detail Page → Rich single-stock view

When the user clicks a stock (from dashboard, sidebar, search, or predictions page):
- **Header:** Ticker, company name, sector badge, latest price (large), 1-day change with color
- **Candlestick chart:** OHLCV data via Lightweight Charts (TradingView), time range selector (1M, 3M, 6M, 1Y, 5Y — default 1Y), volume bars below candles
- **Prediction card:** Signal badge (large, color-coded), confidence percentage with visual gauge, horizontal bar chart showing all 5 class probabilities, cache status ("Predicted 3h ago · Expires in 21h"), low-confidence warning if applicable
- **"Get Prediction" button** when no prediction exists or prediction is expired
- **Add/Remove Watchlist toggle** button
- **Price summary row:** 52-week high, 52-week low, average volume (computed client-side from price data)

**Why:** This is the core page of the app. The chart demonstrates data visualization skills, the prediction card showcases the ML pipeline, and the combined view gives users everything they need to make decisions.

### Search → Navbar search with dropdown + search results page

- **Navbar search bar:** Always visible. Typing triggers debounced API call (300ms). A dropdown appears with top 5 results (ticker, name, sector, price).
- **Clicking a dropdown result:** Navigates to `/stocks/:ticker`
- **Pressing Enter / clicking search icon:** Navigates to `/search?q=...` with full results page (up to 20 results in a card grid showing ticker, name, sector, price, watchlist status, and an add-to-watchlist button)

**Why:** The dropdown provides quick access for users who know the stock they want. The search results page handles browsing/discovery when comparing multiple stocks. The backend returns up to 20 results with rich data (ticker, name, sector, price, watchlist flag), which is too much for a dropdown but perfect for a results page.

### Settings/Profile → Display info + password change

- Display: username, email, account creation date
- Password change form: current password, new password, confirm new password
- Note: The backend doesn't have a password change endpoint yet. The guide will flag this as needing a backend addition, and the form will be built to integrate when it exists.

---

## 2. Project Structure

```
frontend/src/
├── components/
│   ├── ui/                          # shadcn/ui auto-generated components
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── card.tsx
│   │   ├── badge.tsx
│   │   ├── table.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── dialog.tsx
│   │   ├── skeleton.tsx
│   │   ├── tooltip.tsx
│   │   ├── separator.tsx
│   │   ├── progress.tsx
│   │   ├── avatar.tsx
│   │   └── sheet.tsx               # Mobile sidebar overlay
│   │
│   ├── layout/
│   │   ├── AppLayout.tsx           # Authenticated layout: navbar + sidebar + main content
│   │   ├── Navbar.tsx              # Top bar: logo, search, user menu
│   │   ├── Sidebar.tsx             # Left sidebar: nav links + watchlist quick-access
│   │   └── PublicLayout.tsx        # Unauthenticated layout: centered content
│   │
│   ├── auth/
│   │   ├── LoginForm.tsx           # Email + password form
│   │   ├── RegisterForm.tsx        # Username + email + password form
│   │   └── ProtectedRoute.tsx      # Redirects to /login if not authenticated
│   │
│   ├── dashboard/
│   │   ├── SummaryCards.tsx         # Stats row: total stocks, signal breakdown, top signal
│   │   └── WatchlistTable.tsx      # Sortable table with price, change, signal, actions
│   │
│   ├── stock/
│   │   ├── StockHeader.tsx         # Ticker, name, sector, price, change
│   │   ├── StockChart.tsx          # Lightweight Charts candlestick + volume wrapper
│   │   ├── PredictionCard.tsx      # Signal, confidence, probabilities, cache status
│   │   ├── ProbabilityBars.tsx     # Horizontal bar chart for 5 signal probabilities
│   │   └── PriceSummary.tsx        # 52w high/low, avg volume row
│   │
│   ├── search/
│   │   ├── SearchBar.tsx           # Navbar search input with debounce
│   │   ├── SearchDropdown.tsx      # Live dropdown with top 5 results
│   │   └── SearchResultCard.tsx    # Card for search results page
│   │
│   ├── predictions/
│   │   └── PredictionTable.tsx     # Signal-focused table for predictions page
│   │
│   └── common/
│       ├── SignalBadge.tsx          # Color-coded signal badge (reused everywhere)
│       ├── ConfidenceGauge.tsx      # Visual confidence percentage display
│       ├── LoadingSpinner.tsx       # Full-page and inline variants
│       ├── ErrorBoundary.tsx        # Per-route crash boundary
│       ├── EmptyState.tsx           # Reusable empty state with icon + message + CTA
│       └── SkeletonCard.tsx         # Loading placeholder shapes
│
├── pages/
│   ├── LandingPage.tsx              # Public: hero, features, CTA
│   ├── LoginPage.tsx                # Public: centered login form
│   ├── RegisterPage.tsx             # Public: centered register form
│   ├── DashboardPage.tsx            # Protected: summary cards + watchlist table
│   ├── StockDetailPage.tsx          # Protected: chart + prediction + info
│   ├── SearchResultsPage.tsx        # Protected: search results grid
│   ├── PredictionsPage.tsx          # Protected: signal-focused watchlist view
│   ├── SettingsPage.tsx             # Protected: profile info + password change
│   └── NotFoundPage.tsx             # 404 catch-all
│
├── services/
│   ├── api.ts                       # Axios instance, interceptors, base config
│   ├── authService.ts               # login(), register()
│   ├── stockService.ts              # search(), getDetail()
│   ├── watchlistService.ts          # getAll(), add(), remove()
│   └── predictionService.ts         # create(), getLatest()
│
├── hooks/
│   ├── useAuth.ts                   # AuthContext consumer shorthand
│   ├── useWatchlist.ts              # Fetch + mutate watchlist
│   ├── useStockSearch.ts            # Debounced search with dropdown state
│   └── usePrediction.ts            # Fetch/create prediction for a ticker
│
├── contexts/
│   ├── AuthContext.tsx               # User state, token, login/logout
│   └── SidebarContext.tsx            # Sidebar open/close toggle
│
├── types/
│   └── index.ts                     # All TS interfaces mirroring backend DTOs
│
├── utils/
│   ├── formatters.ts                # Price ($1,234.56), percent (+2.34%), date, relative time
│   ├── constants.ts                 # Signal colors, signal order, horizon labels, etc.
│   └── cn.ts                        # clsx + tailwind-merge utility (shadcn standard)
│
├── styles/
│   └── globals.css                  # Tailwind directives + CSS custom properties
│
├── App.tsx                          # Router configuration
├── main.tsx                         # React entry point
└── env.d.ts                         # Vite env type declarations
```

**File count estimate:** ~45 source files, well within manageable range. No file should exceed ~300 lines (target ~150 for components).

---

## 3. Routes & Pages

| Path | Page Component | Layout | Auth | Purpose |
|------|---------------|--------|------|---------|
| `/` | `LandingPage` | `PublicLayout` | Public | Hero, features, CTA |
| `/login` | `LoginPage` | `PublicLayout` | Public | Login form |
| `/register` | `RegisterPage` | `PublicLayout` | Public | Registration form |
| `/dashboard` | `DashboardPage` | `AppLayout` | Protected | Watchlist overview + summary |
| `/stocks/:ticker` | `StockDetailPage` | `AppLayout` | Protected | Chart + prediction + info |
| `/search` | `SearchResultsPage` | `AppLayout` | Protected | Full search results (query param: `?q=`) |
| `/predictions` | `PredictionsPage` | `AppLayout` | Protected | Signal-focused predictions view |
| `/settings` | `SettingsPage` | `AppLayout` | Protected | Profile + password change |
| `*` | `NotFoundPage` | `PublicLayout` | Public | 404 catch-all |

**Router structure (React Router v7):**
```
<BrowserRouter>
  <Routes>
    {/* Public routes */}
    <Route element={<PublicLayout />}>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
    </Route>

    {/* Protected routes */}
    <Route element={<ProtectedRoute />}>
      <Route element={<AppLayout />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/stocks/:ticker" element={<StockDetailPage />} />
        <Route path="/search" element={<SearchResultsPage />} />
        <Route path="/predictions" element={<PredictionsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
    </Route>

    <Route path="*" element={<NotFoundPage />} />
  </Routes>
</BrowserRouter>
```

**Navigation redirects:**
- Authenticated user visiting `/`, `/login`, `/register` → redirect to `/dashboard`
- Unauthenticated user visiting any protected route → redirect to `/login` with `?returnTo=` param

---

## 4. TypeScript Types

All interfaces mirror the backend DTOs exactly. Field names use camelCase (the .NET API returns camelCase JSON by default).

```typescript
// === Auth ===

interface LoginRequest {
  email: string;
  password: string;
}

interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

interface AuthResponse {
  token: string;
  username: string;
  email: string;
  expiresAt: string; // ISO 8601 UTC
}

// === Stocks ===

interface StockSearchResult {
  ticker: string;
  name: string | null;
  sector: string | null;
  latestClose: number | null;
  isInWatchlist: boolean;
}

interface StockDetail {
  ticker: string;
  name: string | null;
  sector: string | null;
  lastUpdatedAt: string; // ISO 8601 UTC
  prices: PricePoint[];
}

interface PricePoint {
  date: string;       // "yyyy-MM-dd"
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// === Watchlist ===

interface WatchlistItem {
  ticker: string;
  name: string | null;
  latestClose: number | null;
  previousClose: number | null;
  change1dPct: number | null;   // percentage: (latest-prev)/prev*100
  addedAt: string;              // ISO 8601 UTC
  latestSignal: TradingSignal | null;
  signalConfidence: number | null; // 0-1
}

interface AddToWatchlistRequest {
  ticker: string;
}

// === Predictions ===

interface PredictRequest {
  ticker: string;
  horizon: Horizon;
}

interface Prediction {
  ticker: string;
  horizon: string;
  signal: TradingSignal;
  confidence: number;          // 0-1
  probabilities: Record<TradingSignal, number>;
  featuresUsed: number;
  lowConfidence: boolean;
  cachedAt: string;            // ISO 8601 UTC
  expiresAt: string;           // ISO 8601 UTC
}

// === Enums (as string unions) ===

type TradingSignal = 'Strong Sell' | 'Sell' | 'Hold' | 'Buy' | 'Strong Buy';
type Horizon = '3m' | '6m' | '1y';

// === Error Response (RFC 7807 ProblemDetails) ===

interface ApiError {
  type?: string;
  title: string;
  status: number;
  detail: string;
  instance?: string;
  correlationId?: string;
  errors?: Record<string, string[]>; // Validation errors
}
```

---

## 5. Component Breakdown

### Smart Components (data-aware, fetch/mutate)

These components own data fetching, manage loading/error states, and pass data down to presentational children.

| Component | Data Source | Mutations | Notes |
|-----------|-----------|-----------|-------|
| `DashboardPage` | `GET /api/watchlist` | Remove from watchlist | Fetches on mount, re-fetches after mutations |
| `StockDetailPage` | `GET /api/stocks/{ticker}` + `GET /api/predictions/{ticker}` | Create prediction, add/remove watchlist | Parallel fetches on mount |
| `SearchResultsPage` | `GET /api/stocks/search?q=` | Add to watchlist | Fetches on mount + query change |
| `PredictionsPage` | `GET /api/watchlist` | Create prediction | Fetches on mount |
| `SettingsPage` | AuthContext (user info) | Password change (future) | Reads from context, no API fetch |
| `SearchBar` (in Navbar) | `GET /api/stocks/search?q=` | None | Debounced fetch, manages dropdown state |
| `Sidebar` | `GET /api/watchlist` | None | Consumes same data as dashboard (shared via hook or prop) |
| `Navbar` | AuthContext | Logout | User menu with logout action |

### Presentational Components (props only)

These components receive data via props and render UI. No direct API calls.

| Component | Key Props | Purpose |
|-----------|----------|---------|
| `SummaryCards` | `items: WatchlistItem[]` | Computes stats and renders summary cards |
| `WatchlistTable` | `items: WatchlistItem[]`, `onRemove`, `onViewDetail` | Renders sortable watchlist table rows |
| `StockHeader` | `ticker, name, sector, latestPrice, change1dPct` | Top banner on stock detail page |
| `StockChart` | `prices: PricePoint[]`, `defaultRange` | Lightweight Charts candlestick + volume |
| `PredictionCard` | `prediction: Prediction \| null`, `onRequestPrediction`, `loading` | Full prediction display or "get prediction" CTA |
| `ProbabilityBars` | `probabilities: Record<TradingSignal, number>` | Horizontal bars for each signal class |
| `PriceSummary` | `prices: PricePoint[]` | 52w high/low, avg volume (computed from props) |
| `SignalBadge` | `signal: TradingSignal` | Color-coded pill badge |
| `ConfidenceGauge` | `confidence: number, lowConfidence: boolean` | Visual percentage display |
| `SearchDropdown` | `results: StockSearchResult[]`, `onSelect`, `visible` | Floating dropdown below search bar |
| `SearchResultCard` | `result: StockSearchResult`, `onAddToWatchlist` | Card in search results grid |
| `PredictionTable` | `items: WatchlistItem[]`, `onRequestPrediction` | Signal-focused table |
| `LoginForm` | `onSubmit`, `loading`, `error` | Email + password form fields |
| `RegisterForm` | `onSubmit`, `loading`, `error` | Username + email + password form fields |
| `EmptyState` | `icon, title, description, actionLabel, onAction` | Generic empty state display |
| `ErrorBoundary` | `children, fallback` | Catches React render errors per route |
| `LoadingSpinner` | `fullPage?: boolean` | Spinner variant |
| `SkeletonCard` | `lines?: number` | Animated placeholder |

---

## 6. State Management

### Global State: AuthContext

```
AuthContext {
  user: { username, email } | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean          // true during initial JWT validation on app load
  login(email, password): Promise<void>
  register(username, email, password): Promise<void>
  logout(): void
}
```

- Token persisted in `localStorage` under key `"sp_token"`
- On app load: check localStorage for token → if present, decode JWT to extract user info → set isAuthenticated
- JWT decoding: extract `exp` claim to check if token is expired (no API call needed)
- On login: store token in localStorage, update context, redirect to dashboard
- On logout: clear localStorage, clear context, redirect to `/`
- The axios interceptor reads token from localStorage (not from context) to avoid stale closures

### Global State: SidebarContext

```
SidebarContext {
  isOpen: boolean
  toggle(): void
}
```

- Default: `true` on screens ≥ 1024px, `false` below
- Persisted in `localStorage` under key `"sp_sidebar"` for user preference

### Local State (per-page, via hooks)

| Hook | State | Used By |
|------|-------|---------|
| `useWatchlist()` | `{ items, isLoading, error, remove(), refetch() }` | DashboardPage, PredictionsPage, Sidebar |
| `useStockSearch(query)` | `{ results, isLoading }` | SearchBar, SearchResultsPage |
| `usePrediction(ticker, horizon)` | `{ prediction, isLoading, error, request() }` | StockDetailPage |

**No Redux/Zustand needed.** The app has straightforward data flow: each page fetches its own data, and the only truly shared state is auth + sidebar toggle.

### Data Sharing Between Components

The Sidebar needs watchlist data. Two clean approaches:
- **Option A (recommended):** Sidebar fetches its own watchlist data independently. The API call is lightweight and cached by the browser for a few seconds. This keeps components decoupled.
- **Option B:** Lift watchlist state up to AppLayout and pass down. More coupled but avoids duplicate fetch.

Go with Option A for simplicity — the watchlist endpoint returns small payloads quickly.

---

## 7. API Integration Layer

### Base Client (`services/api.ts`)

```
- Create axios instance with baseURL from VITE_API_URL env var
- Request interceptor: attach Authorization header from localStorage
- Response interceptor:
  - On 401: clear token, redirect to /login
  - On 4xx/5xx: parse ProblemDetails, throw structured error
  - Extract X-Correlation-Id for debugging (log to console in dev)
```

### Service Files

#### `authService.ts`
| Function | Endpoint | Request | Response |
|----------|----------|---------|----------|
| `login(email, password)` | `POST /api/auth/login` | `LoginRequest` | `AuthResponse` |
| `register(username, email, password)` | `POST /api/auth/register` | `RegisterRequest` | `AuthResponse` |

#### `stockService.ts`
| Function | Endpoint | Request | Response |
|----------|----------|---------|----------|
| `search(query)` | `GET /api/stocks/search?q={query}` | Query param | `StockSearchResult[]` |
| `getDetail(ticker)` | `GET /api/stocks/{ticker}` | Path param | `StockDetail` |

#### `watchlistService.ts`
| Function | Endpoint | Request | Response |
|----------|----------|---------|----------|
| `getAll()` | `GET /api/watchlist` | None | `WatchlistItem[]` |
| `add(ticker)` | `POST /api/watchlist` | `AddToWatchlistRequest` | void (201) |
| `remove(ticker)` | `DELETE /api/watchlist/{ticker}` | Path param | void (204) |

#### `predictionService.ts`
| Function | Endpoint | Request | Response |
|----------|----------|---------|----------|
| `create(ticker, horizon)` | `POST /api/predictions` | `PredictRequest` | `Prediction` |
| `getLatest(ticker, horizon)` | `GET /api/predictions/{ticker}?horizon={horizon}` | Path + query | `Prediction \| null` |

### Error Handling Pattern

All service functions throw a consistent error shape:

```typescript
class ApiException extends Error {
  status: number;
  title: string;
  detail: string;
  correlationId?: string;
  fieldErrors?: Record<string, string[]>;
}
```

Pages catch these and either:
- Show field-level errors (validation) inline on forms
- Show toast notification (sonner) for server errors
- Show "unavailable" badge for 503 (ML service down)
- Show "not supported" message for 501 (horizon not trained)

### Rate Limiting

Auth endpoints are rate-limited to 10 requests per 15 minutes. On 429 response, show a toast: "Too many attempts. Please try again in a few minutes."

---

## 8. Data Flow Diagrams

### Flow 1: Login → Dashboard

```
User submits LoginForm
  → authService.login(email, password)
    → POST /api/auth/login
    ← AuthResponse { token, username, email, expiresAt }
  → Store token in localStorage
  → Update AuthContext (user, isAuthenticated)
  → Navigate to /dashboard
  → DashboardPage mounts
    → useWatchlist() calls watchlistService.getAll()
      → GET /api/watchlist (with JWT header)
      ← WatchlistItem[] (with latestSignal, signalConfidence)
    → Render SummaryCards + WatchlistTable
  → Sidebar mounts
    → Fetches same watchlist data for quick-access list
```

### Flow 2: Search → Stock Detail → Get Prediction

```
User types "AAPL" in SearchBar
  → Debounce 300ms
  → stockService.search("AAPL")
    → GET /api/stocks/search?q=AAPL
    ← StockSearchResult[] (up to 20)
  → Show SearchDropdown with top 5

User clicks "AAPL - Apple Inc." in dropdown
  → Navigate to /stocks/AAPL

StockDetailPage mounts
  → Parallel requests:
    1. stockService.getDetail("AAPL")
       → GET /api/stocks/AAPL
       ← StockDetail { ticker, name, sector, prices[] }
    2. predictionService.getLatest("AAPL", "3m")
       → GET /api/predictions/AAPL?horizon=3m
       ← Prediction | null
  → Render StockHeader + StockChart + PredictionCard

If prediction is null (no cache):
  → PredictionCard shows "No prediction yet" + "Get Prediction" button

User clicks "Get Prediction"
  → predictionService.create("AAPL", "3m")
    → POST /api/predictions { ticker: "AAPL", horizon: "3m" }
    → Backend calls ML service POST /predict
    ← Prediction { signal, confidence, probabilities, ... }
  → PredictionCard updates with full prediction display

If ML service is down (503):
  → PredictionCard shows "Prediction temporarily unavailable" badge
  → Toast: "ML service is currently unavailable. Stock data and charts still work."
```

### Flow 3: Dashboard Watchlist Management

```
DashboardPage is mounted, watchlist loaded.

User searches for "NVDA" via SearchBar
  → Navigates to /search?q=NVDA or /stocks/NVDA

On Stock Detail page, user clicks "Add to Watchlist"
  → watchlistService.add("NVDA")
    → POST /api/watchlist { ticker: "NVDA" }
    ← 201 Created
  → Toast: "NVDA added to watchlist"
  → Button toggles to "Remove from Watchlist"

User returns to /dashboard
  → useWatchlist() re-fetches
  → NVDA now appears in watchlist table and sidebar

User clicks remove (X) on TSLA row in watchlist table
  → Confirmation dialog: "Remove TSLA from watchlist?"
  → watchlistService.remove("TSLA")
    → DELETE /api/watchlist/TSLA
    ← 204 No Content
  → Row removed from table, sidebar updated
  → Toast: "TSLA removed from watchlist"
```

### Flow 4: Predictions Page

```
User clicks "Predictions" in sidebar
  → Navigate to /predictions

PredictionsPage mounts
  → useWatchlist() calls GET /api/watchlist
  ← WatchlistItem[] (each has latestSignal, signalConfidence)
  → Render PredictionTable

Table shows:
  | Ticker | Name    | Signal     | Confidence | Status    | Action            |
  | AAPL   | Apple   | Buy (green)| 34.5%      | 3h ago    | View Details →    |
  | MSFT   | Microsoft| Hold (amber)| 28.1%     | 12h ago   | View Details →    |
  | GOOGL  | Alphabet| —          | —          | No prediction | Get Prediction |
  | AMZN   | Amazon  | Sell (orange)| 31.2%    | 23h ago   | View Details →    |
  | TSLA   | Tesla   | —          | —          | No prediction | Get Prediction |

User clicks "Get Prediction" on GOOGL
  → predictionService.create("GOOGL", "3m")
  → Loading spinner on button
  ← Prediction returned
  → Row updates with signal + confidence
  → Toast: "Prediction generated for GOOGL"
```

---

## 9. Charts & Data Visualization

### Candlestick Chart (StockChart component)

**Library:** `lightweight-charts` by TradingView

**Features:**
- Candlestick series for OHLC data (green up-candles, red down-candles)
- Volume histogram series below candles (same green/red coloring)
- Time range buttons: 1M, 3M, 6M, 1Y, 5Y — filter price data client-side
- Default range: 1Y (good balance of detail vs. overview)
- Crosshair with price/date tooltip
- Responsive: chart resizes with container via ResizeObserver
- Dark grid lines on white background (no dark mode)

**Data mapping:** Backend `PricePoint[]` → Lightweight Charts expects:
```
{ time: "2024-01-15", open: 150.25, high: 152.89, low: 150.02, close: 152.56 }
```
Direct mapping — `date` field is already in "yyyy-MM-dd" format.

**Volume mapping:**
```
{ time: "2024-01-15", value: 42891200, color: close >= open ? "#22c55e" : "#ef4444" }
```

### Probability Bars (ProbabilityBars component)

**No charting library needed** — built with Tailwind CSS.

Five horizontal bars, one per signal class, ordered top-to-bottom: Strong Buy → Buy → Hold → Sell → Strong Sell.

Each bar:
- Label on the left: "Strong Buy"
- Colored bar width = probability percentage of total
- Percentage text on the right: "6.2%"
- The predicted signal's bar is highlighted (bolder, slightly taller)

**Color scheme:**
```
Strong Buy  → emerald-500  (#10b981)
Buy         → green-500    (#22c55e)
Hold        → amber-500    (#f59e0b)
Sell        → orange-500   (#f97316)
Strong Sell → red-500      (#ef4444)
```

### Confidence Gauge (ConfidenceGauge component)

A circular progress ring or a simple horizontal progress bar showing the confidence percentage (0-100%).

- Under 30%: red color + "Low confidence" warning text
- 30-50%: amber color
- Over 50%: green color

Keep it simple — a progress bar with the percentage text is sufficient. The `lowConfidence` boolean from the backend drives the warning state.

### Signal Badge (SignalBadge component)

A pill-shaped badge using the same color scheme as probability bars. Used across:
- Watchlist table rows
- Sidebar watchlist list (small dot variant)
- Stock detail page prediction card (large variant)
- Predictions table

Should accept a `size` prop: `"sm"` (sidebar dot), `"md"` (table badge), `"lg"` (detail page).

### Summary Cards (SummaryCards component)

Three cards in a row (grid), computed from `WatchlistItem[]`:
1. **Stocks Tracked** — count of items, icon: ChartLine
2. **Signal Breakdown** — mini color-coded bar showing distribution (e.g., "2 Buy · 1 Hold · 1 Sell · 1 No Data"), icon: TrendUp
3. **Strongest Signal** — the watchlist stock with the highest confidence Buy/Strong Buy signal (if any), showing ticker + signal + confidence, icon: Lightning

---

## 10. Authentication Flow

### Token Lifecycle

```
Register/Login
  → API returns { token, username, email, expiresAt }
  → Store token in localStorage["sp_token"]
  → Decode JWT payload (base64) to extract { sub: guid, email, name, exp }
  → Set AuthContext { user: { username, email }, token, isAuthenticated: true }

App Load (page refresh)
  → Check localStorage["sp_token"]
  → If absent: isAuthenticated = false, done
  → If present: decode JWT, check exp against Date.now()
    → If expired: clear localStorage, isAuthenticated = false
    → If valid: set AuthContext from decoded claims, isAuthenticated = true
  → Show full-page spinner during this check (isLoading = true)

API Request
  → Axios interceptor reads token from localStorage
  → Attaches Authorization: Bearer {token}
  → If API returns 401:
    → Clear localStorage
    → Set isAuthenticated = false
    → Navigate to /login with toast "Session expired"

Logout
  → Clear localStorage["sp_token"]
  → Clear AuthContext
  → Navigate to /
```

### JWT Decoding (Client-Side)

No library needed — JWT payload is base64url encoded. A simple utility function:
```
function decodeJwtPayload(token: string): { sub: string; email: string; name: string; exp: number }
```
Extract the middle segment (between the two dots), base64url decode it, JSON.parse.

**Important:** This is NOT validation — the backend validates on every request. Client-side decode is only for displaying user info and checking expiry to avoid sending obviously-expired tokens.

### ProtectedRoute Component

Wraps all authenticated routes. On render:
- If `isLoading` (initial JWT check): show full-page spinner
- If `!isAuthenticated`: redirect to `/login?returnTo={currentPath}`
- If authenticated: render `<Outlet />`

### Auth Forms

**LoginForm:**
- Fields: email (required, valid email), password (required)
- Validation: Zod schema matching backend FluentValidation rules
- Submit: calls `authContext.login(email, password)`
- Error states: inline field errors (Zod), server error toast (wrong credentials), rate limit toast (429)
- Link: "Don't have an account? Register"

**RegisterForm:**
- Fields: username (required, 3-30 chars, alphanumeric + underscore), email (required, valid email), password (required, min 8 chars)
- Validation: Zod schema matching backend FluentValidation rules
- Submit: calls `authContext.register(username, email, password)`
- Error states: inline field errors, duplicate email/username toast (409), rate limit toast
- Link: "Already have an account? Login"

---

## 11. Phased Implementation Plan

### Phase 0: Project Setup & Configuration
**Prompt scope:** Install dependencies, configure tooling, create base files  
**Prerequisites:** Existing Vite + React 19 template (already present)  
**Estimated files:** ~8 config files + 3 source files

**Tasks:**
1. Install runtime dependencies:
   - `react-router` (v7)
   - `axios`
   - `react-hook-form` + `@hookform/resolvers` + `zod`
   - `sonner` (toast notifications)
   - `@phosphor-icons/react`
   - `lightweight-charts`
2. Install and configure Tailwind CSS v4:
   - `@tailwindcss/vite` (Vite plugin) + `tailwindcss`
   - Update `vite.config.ts` to include the Tailwind plugin
   - Replace `src/styles/globals.css` with Tailwind v4 `@import "tailwindcss"` directive + CSS custom properties for the color scheme
   - Delete the old `App.css` and `index.css`
3. Initialize shadcn/ui:
   - Run `npx shadcn@latest init` (New York style, neutral base)
   - Install initial components: button, input, card, badge, table, dropdown-menu, skeleton, tooltip, separator, progress, avatar, sheet, dialog, label
   - Creates `components/ui/` directory and `lib/utils.ts` (the `cn()` helper)
4. Configure Vite:
   - Add path alias: `@` → `./src` (for clean imports like `@/components/...`)
   - Add proxy: `/api` → `http://localhost:5000` (avoid CORS in dev)
5. Create `src/types/index.ts` with all TypeScript interfaces from Section 4
6. Create `src/utils/constants.ts` with signal color map, horizon labels, etc.
7. Create `src/utils/formatters.ts` with price, percent, date, relative-time formatters
8. Create `src/env.d.ts` for `VITE_API_URL` type declaration
9. Update `index.html`: change title to "StockPredictor", update favicon

**Done when:** `npm run dev` starts, Tailwind works, shadcn components render, path aliases resolve.

---

### Phase 1: Foundation — Layout, Routing, Auth Skeleton
**Prompt scope:** Create the app shell that every page lives inside  
**Prerequisites:** Phase 0 complete  
**Estimated files:** ~12 source files

**Tasks:**
1. Create `services/api.ts` — axios instance with base URL, request interceptor (attach JWT), response interceptor (401 handling, error parsing)
2. Create `contexts/AuthContext.tsx` — full implementation:
   - State: user, token, isAuthenticated, isLoading
   - Actions: login, register, logout
   - localStorage persistence
   - JWT decode on app load
3. Create `contexts/SidebarContext.tsx` — open/close toggle with localStorage persistence
4. Create `hooks/useAuth.ts` — simple `useContext(AuthContext)` wrapper
5. Create `components/auth/ProtectedRoute.tsx` — redirect to login if not authenticated
6. Create `components/layout/PublicLayout.tsx` — centered container, renders `<Outlet />`
7. Create `components/layout/AppLayout.tsx` — sidebar + navbar + main content area, renders `<Outlet />`
8. Create `components/layout/Navbar.tsx` — logo, search bar placeholder, user menu dropdown (username, Settings link, Logout button)
9. Create `components/layout/Sidebar.tsx` — nav links (Dashboard, Predictions, Settings) + watchlist quick-access list placeholder
10. Create all page files as stubs (just a heading + `export default`)
11. Create `App.tsx` — full router configuration per Section 3
12. Create `main.tsx` — wrap app in AuthProvider, SidebarProvider, BrowserRouter, Toaster (sonner)
13. Create `components/common/ErrorBoundary.tsx`
14. Create `components/common/LoadingSpinner.tsx`

**Done when:** Navigation works between all routes. Public routes show PublicLayout. Protected routes show AppLayout with navbar + sidebar. Unauthenticated access redirects to login. The app has a full working shell with placeholder content on every page.

---

### Phase 2: Authentication — Login & Register
**Prompt scope:** Full auth flow with forms, validation, and error handling  
**Prerequisites:** Phase 1 complete  
**Estimated files:** ~4 source files

**Tasks:**
1. Create `services/authService.ts` — login() and register() functions calling the backend
2. Create `components/auth/LoginForm.tsx`:
   - React Hook Form + Zod validation
   - Fields: email, password
   - Loading state on submit button
   - Inline validation errors
   - Server error display (toast for 401, 429)
   - "Don't have an account?" link
3. Create `components/auth/RegisterForm.tsx`:
   - React Hook Form + Zod validation
   - Fields: username, email, password
   - Matching backend validation rules (username 3-30 chars alphanumeric, password min 8)
   - Server error display (toast for 409, 429)
   - "Already have an account?" link
4. Implement `pages/LoginPage.tsx` — renders LoginForm inside a card
5. Implement `pages/RegisterPage.tsx` — renders RegisterForm inside a card
6. Wire up AuthContext.login/register to call authService + handle token storage + navigate

**Done when:** User can register a new account, log in, see the dashboard (placeholder), and log out. Token persists across page refreshes. Expired tokens redirect to login. Validation errors show inline. Server errors show as toasts.

---

### Phase 3: Landing Page
**Prompt scope:** Public landing page for unauthenticated visitors  
**Prerequisites:** Phase 1 complete (can be done in parallel with Phase 2)  
**Estimated files:** 1 source file

**Tasks:**
1. Implement `pages/LandingPage.tsx`:
   - **Hero section:** headline ("Smart Stock Predictions, Powered by Machine Learning"), subtitle (1-2 sentences about ML-powered trading signals), two CTA buttons (Get Started → /register, Login → /login), maybe a subtle chart illustration or gradient background
   - **Features section:** 3-4 cards in a grid:
     - "ML-Powered Signals" — XGBoost model analyzes 22 features to predict trading signals
     - "Real-Time Data" — Live stock prices from global markets, refreshed hourly
     - "Watchlist Tracking" — Track your favorite stocks, see daily changes at a glance
     - "Sentiment Analysis" — GDELT news sentiment from 66M+ global articles
   - **How It Works section (optional, if space):** 3 steps: Search → Predict → Decide
   - Clean, professional styling. Desktop-first. No dark mode.

**Done when:** Landing page renders at `/`, looks professional, CTAs link to login/register. Authenticated users visiting `/` are redirected to `/dashboard`.

---

### Phase 4: Dashboard — Watchlist + Summary Cards
**Prompt scope:** Core dashboard with real data from the watchlist API  
**Prerequisites:** Phase 2 complete (auth working, can make authenticated API calls)  
**Estimated files:** ~7 source files

**Tasks:**
1. Create `services/watchlistService.ts` — getAll(), add(), remove()
2. Create `hooks/useWatchlist.ts` — manages fetch state, exposes items/loading/error/remove/refetch
3. Create `components/common/SignalBadge.tsx` — color-coded pill badge with size variants
4. Create `components/common/EmptyState.tsx` — reusable: icon, title, description, action button
5. Create `components/dashboard/SummaryCards.tsx`:
   - Three cards: Stocks Tracked, Signal Breakdown, Strongest Signal
   - Computed from WatchlistItem[] props
   - Skeleton loading state
6. Create `components/dashboard/WatchlistTable.tsx`:
   - Columns: Ticker, Name, Price, Change (1d%), Signal, Confidence, Actions
   - Row click → navigate to /stocks/:ticker
   - Remove button with confirmation dialog
   - Sort by any column (client-side)
   - Skeleton rows during loading
   - Empty state: "Your watchlist is empty. Search for stocks to add."
7. Implement `pages/DashboardPage.tsx`:
   - Uses useWatchlist() hook
   - Renders SummaryCards + WatchlistTable
   - Error state with retry button
8. Update `components/layout/Sidebar.tsx`:
   - Fetch watchlist (or accept as prop from shared hook)
   - Render watchlist quick-access: ticker + tiny SignalBadge dot
   - Click navigates to /stocks/:ticker

**Done when:** Dashboard shows real watchlist data. Summary cards compute stats. Table rows are clickable. Remove works with confirmation. Empty state shows for new users (who should have 5 default stocks seeded by backend). Sidebar shows watchlist quick-access.

---

### Phase 5: Search
**Prompt scope:** Navbar search with dropdown + full search results page  
**Prerequisites:** Phase 4 complete (watchlist service exists for "add to watchlist" button)  
**Estimated files:** ~5 source files

**Tasks:**
1. Create `services/stockService.ts` — search() and getDetail()
2. Create `hooks/useStockSearch.ts` — debounced search (300ms), returns results + loading
3. Create `components/search/SearchBar.tsx`:
   - Input field in navbar with search icon (Phosphor MagnifyingGlass)
   - On input change: trigger debounced search
   - On Enter or search icon click: navigate to /search?q={query}
   - Manages dropdown visibility
4. Create `components/search/SearchDropdown.tsx`:
   - Positioned below SearchBar (absolute/portal)
   - Shows top 5 results: ticker (bold), name, sector, price
   - Click result → navigate to /stocks/:ticker, close dropdown
   - "View all results" link at bottom → navigate to /search?q={query}
   - Click outside → close dropdown
   - Loading skeleton while fetching
5. Create `components/search/SearchResultCard.tsx`:
   - Card showing: ticker, name, sector, price, watchlist status badge
   - "Add to Watchlist" button (or "In Watchlist" disabled badge)
   - Click card body → navigate to /stocks/:ticker
6. Implement `pages/SearchResultsPage.tsx`:
   - Reads `q` from URL search params
   - Fetches results on mount + param change
   - Renders grid of SearchResultCards
   - Empty state: "No stocks found for '{query}'"

**Done when:** User can type in the search bar, see dropdown suggestions, navigate to stock detail or search results page. Search results show accurate watchlist status. "Add to Watchlist" works from search results.

---

### Phase 6: Stock Detail — Chart + Prediction
**Prompt scope:** Full stock detail page with candlestick chart and prediction integration  
**Prerequisites:** Phase 5 complete (stock service exists)  
**Estimated files:** ~7 source files

**Tasks:**
1. Create `services/predictionService.ts` — create() and getLatest()
2. Create `hooks/usePrediction.ts` — manages fetch/create state for a ticker+horizon
3. Create `components/stock/StockHeader.tsx`:
   - Ticker (large, bold), company name, sector badge
   - Latest price (large number), 1-day change % with color (green up, red down)
   - Add/Remove Watchlist toggle button
4. Create `components/stock/StockChart.tsx`:
   - Lightweight Charts integration
   - Candlestick series from PricePoint[] data
   - Volume histogram below candles
   - Time range buttons: 1M, 3M, 6M, 1Y, 5Y (filter data client-side)
   - Default: 1Y
   - Responsive resize via ResizeObserver
   - Loading skeleton while data loads
5. Create `components/stock/PredictionCard.tsx`:
   - **Has prediction:** Large SignalBadge, confidence gauge, ProbabilityBars, cache status ("Predicted 3h ago · Expires in 21h"), low confidence warning
   - **No prediction:** "No prediction yet" message + "Get Prediction" button
   - **Loading:** Skeleton placeholder
   - **Error (503):** "Prediction service temporarily unavailable" with muted badge
   - **Error (501):** "This horizon is not yet supported" (for 6m/1y)
   - Horizon selector (dropdown: 3 months / 6 months / 1 year) — only 3m active, others show "Coming soon" or disabled
6. Create `components/stock/ProbabilityBars.tsx`:
   - Five horizontal bars with signal colors
   - Width proportional to probability
   - Predicted signal bar highlighted
7. Create `components/common/ConfidenceGauge.tsx`:
   - Progress bar with percentage text
   - Color changes based on level (red < 30%, amber 30-50%, green > 50%)
   - Warning text when lowConfidence is true
8. Create `components/stock/PriceSummary.tsx`:
   - Computed from PricePoint[]: 52-week high, 52-week low, average volume
   - Small stat cards in a row
9. Implement `pages/StockDetailPage.tsx`:
   - Read `:ticker` from URL params
   - Parallel fetch: stockService.getDetail() + predictionService.getLatest()
   - Render: StockHeader → StockChart → PredictionCard → PriceSummary
   - Watchlist add/remove via watchlistService
   - Error state for 404 (stock not found)

**Done when:** User can view any stock's chart with candlestick data, switch time ranges, see/request ML predictions with full probability breakdown, add/remove from watchlist. ML service down shows graceful degradation. Low confidence shows warning.

---

### Phase 7: Predictions Overview
**Prompt scope:** Signal-focused view of all watchlist predictions  
**Prerequisites:** Phase 6 complete (prediction service + SignalBadge exist)  
**Estimated files:** ~2 source files

**Tasks:**
1. Create `components/predictions/PredictionTable.tsx`:
   - Columns: Ticker, Name, Signal (badge), Confidence (gauge), Status ("3h ago" or "No prediction"), Action (View Details → or Get Prediction)
   - Rows without predictions show "—" for signal/confidence and a "Get Prediction" button
   - "Get Prediction" button calls predictionService.create() inline with loading state
   - Row click → navigate to /stocks/:ticker
   - Sort by signal strength or confidence
2. Implement `pages/PredictionsPage.tsx`:
   - Uses useWatchlist() to get items with signal data
   - Page header: "Predictions" with subtitle "ML-powered trading signals for your watchlist"
   - Renders PredictionTable
   - Empty state: "Add stocks to your watchlist to see predictions"

**Done when:** Predictions page shows signal-focused table. Users can request predictions inline. Clicking a row navigates to stock detail for full breakdown.

---

### Phase 8: Settings / Profile
**Prompt scope:** User profile display and password change  
**Prerequisites:** Phase 2 complete (auth context has user info)  
**Estimated files:** ~1 source file

**Tasks:**
1. Implement `pages/SettingsPage.tsx`:
   - **Profile section (card):**
     - Display: username, email (read-only fields)
     - Account created date (from JWT `iat` claim or just show "Member since [registration]")
   - **Password change section (card):**
     - React Hook Form + Zod: current password (required), new password (min 8), confirm new password (must match)
     - Note: backend doesn't have a password change endpoint yet
     - Build the form anyway; on submit show toast "Password change coming soon" (or wire up when backend endpoint is added)
     - Keep the form functional so it's ready to integrate
   - **Danger zone section (optional):**
     - "Delete Account" button (disabled / "coming soon") — standard pattern but not critical

**Backend gap:** No `PUT /api/auth/password` or similar endpoint exists. The frontend form should be built but will need a corresponding backend endpoint before it's functional. Flag this for a future backend task.

**Done when:** Settings page displays user info. Password change form validates input. The page is visually complete even if password change isn't wired to the backend yet.

---

### Phase 9: Polish & Error Handling
**Prompt scope:** Production-quality UX: loading states, error handling, responsive design, edge cases  
**Prerequisites:** All previous phases complete  
**Estimated files:** Edits to ~10-15 existing files

**Tasks:**
1. **Error boundaries:** Ensure each route is wrapped in ErrorBoundary with a fallback UI ("Something went wrong" + "Reload" button)
2. **Loading skeletons:** Replace raw spinners with skeleton placeholders for:
   - Dashboard: skeleton table rows + skeleton summary cards
   - Stock detail: skeleton chart area + skeleton prediction card
   - Search results: skeleton cards
3. **Empty states:** Audit every list/table for empty data:
   - Dashboard (empty watchlist): "Your watchlist is empty" + "Search for stocks" CTA
   - Search (no results): "No stocks found for '{query}'" + suggestion text
   - Predictions (no watchlist): "Add stocks to your watchlist first"
4. **Toast notifications** (sonner): Ensure all mutations show feedback:
   - Success: "Added to watchlist", "Removed from watchlist", "Prediction generated"
   - Error: "Failed to load data", "ML service unavailable", "Session expired"
   - Rate limit: "Too many attempts. Try again shortly."
5. **Responsive adjustments:**
   - Sidebar: collapsed by default below 1024px, overlay (Sheet) when opened
   - Dashboard table: horizontal scroll on narrow screens
   - Summary cards: stack vertically on small screens (grid cols: 3 → 1)
   - Stock detail: stack chart and prediction card vertically on narrow screens
   - Search results: 3 columns → 2 → 1
6. **404 page:** Implement NotFoundPage with a friendly message + "Go to Dashboard" link
7. **Favicon & title:** Dynamic page title per route (e.g., "AAPL — StockPredictor")
8. **Accessibility basics:** Proper `aria-labels` on icon buttons, keyboard navigation for dropdown, focus management on dialog open/close

**Done when:** The app handles all edge cases gracefully. No blank screens, no unhandled errors, no broken states. Loading states feel smooth. The app works on desktop and tablet widths.

---

## Appendix A: Dependency List

### Runtime Dependencies
```
react-router          # Routing (v7)
axios                 # HTTP client
react-hook-form       # Form management
@hookform/resolvers   # Zod resolver for RHF
zod                   # Schema validation
sonner                # Toast notifications
@phosphor-icons/react # Iconography
lightweight-charts    # TradingView candlestick charts
```

### Dev / Styling Dependencies
```
tailwindcss           # Utility-first CSS (v4)
@tailwindcss/vite     # Vite plugin for Tailwind v4
```

### shadcn/ui Components (copied into project, not npm packages)
```
button, input, card, badge, table, dropdown-menu, skeleton,
tooltip, separator, progress, avatar, sheet, dialog, label
```

---

## Appendix B: Environment Variables

| Variable | Dev Default | Docker | Purpose |
|----------|-----------|--------|---------|
| `VITE_API_URL` | (not needed — Vite proxy handles it) | `http://backend:5000/api` | Backend API base URL |

**Vite proxy config (dev only):**
```
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:5000',
      changeOrigin: true
    }
  }
}
```

---

## Appendix C: Signal Color Scheme

| Signal | Tailwind Class | Hex | Usage |
|--------|---------------|-----|-------|
| Strong Buy | `emerald-500` | `#10b981` | Badge bg, probability bar, chart annotation |
| Buy | `green-500` | `#22c55e` | Badge bg, probability bar |
| Hold | `amber-500` | `#f59e0b` | Badge bg, probability bar |
| Sell | `orange-500` | `#f97316` | Badge bg, probability bar |
| Strong Sell | `red-500` | `#ef4444` | Badge bg, probability bar |

---

## Appendix D: Backend Gaps

These items are needed for full frontend functionality but don't exist in the backend yet:

| Feature | Needed Endpoint | Priority | Workaround |
|---------|----------------|----------|------------|
| Password change | `PUT /api/auth/password` | Medium | Form built but shows "coming soon" |
| Delete account | `DELETE /api/auth/account` | Low | Button disabled |
| Prediction history (all per user) | `GET /api/predictions` (list) | Low | Use watchlist endpoint (has signal summary) |

None of these block the frontend implementation. The guide is designed around the existing backend API.
