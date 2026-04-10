# StockPredictor Frontend — Phases 0–4 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use **superpowers:subagent-driven-development** to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. **Execution approach chosen: Subagent-Driven.**

**Goal:** Build the React frontend for StockPredictor from a bare Vite template through full project setup, app shell, authentication, landing page, and a live dashboard — all wired to the existing .NET 9 backend.

**Architecture:** Sequential five-phase build. Global state in two React Contexts (auth + sidebar). API calls only in `services/`; components consume custom hooks. `<BrowserRouter>` wraps `<AuthProvider>` in `main.tsx` so `useNavigate()` works inside the context. Axios interceptors handle JWT attach and 401 redirect. Tailwind CSS v4 + shadcn/ui for all UI. No Redux, no Zustand.

**Tech Stack:** React 19, TypeScript strict (ES2023), Vite 8, Tailwind CSS v4 (`@tailwindcss/vite`), shadcn/ui (New York/neutral), React Router v7 (`react-router`), Axios, React Hook Form + Zod, Sonner (toasts), Phosphor Icons (`@phosphor-icons/react`)

---

## What This Plan Adds vs the Previous Prompt

The previous prompt described **what** to build in prose. This plan shows **how** with executable steps, actual code, and verification gates.

| Area | Previous Prompt | This Plan |
|------|----------------|-----------|
| Execution approach | Not specified | Subagent-driven (one subagent per task) |
| Code content | Descriptions only | Full implementations for all foundation files |
| `ApiException` class | Mentioned, not shown | Complete class with typed constructor |
| JWT decode | Mentioned, not shown | Complete `decodeJwtPayload()` + `isTokenExpired()` |
| Navigation from axios | Not addressed | `navigation.ts` service pattern for outside-React redirects |
| `BrowserRouter` placement | "wrap app in ... BrowserRouter" | Explicitly wraps `<AuthProvider>` (required for `useNavigate()` in context) |
| Vite `/api` proxy | Mentioned in prose | Exact `vite.config.ts` code |
| `tsconfig` paths | Mentioned | Exact JSON patch to apply |
| `.env.local` | Not mentioned | Explicit file creation step |
| `SkeletonCard` | Missing | Added as `src/components/common/SkeletonCard.tsx` |
| Optimistic remove | Not mentioned | `useWatchlist` removes from UI immediately, reverts on API error |
| Phase verification | "Done when" prose | Exact browser checks + `npm run build` |
| Git commits | Not mentioned | Commit checkpoint after every phase |
| `shadcn init` CLI | "run npx shadcn@latest init" | Expected CLI prompts and answers |
| `SummaryCards` loading | Mentioned | `isLoading` prop + skeleton cards |
| `formatVolume` | Not mentioned | Added to formatters (needed by Sidebar/PriceSummary later) |

---

## Starting State

```
src/frontend/
├── src/
│   ├── App.tsx          ← Vite boilerplate — replace entirely
│   ├── App.css          ← delete
│   ├── index.css        ← replace with Tailwind v4 import
│   ├── main.tsx         ← replace entirely
│   └── assets/
│       ├── hero.png     ← keep (used in landing page)
│       ├── react.svg    ← can delete
│       └── vite.svg     ← can delete
├── public/
│   ├── favicon.svg      ← keep
│   └── icons.svg        ← keep (SVG sprite)
├── vite.config.ts       ← modify: add Tailwind plugin, @ alias, /api proxy
├── tsconfig.app.json    ← modify: add compilerOptions.paths
├── index.html           ← modify: title only
└── package.json         ← only react + react-dom installed
```

The backend is running at `http://localhost:5000`. All API endpoints are implemented. No frontend code exists yet beyond the Vite template.

---

## File Map

### Phase 0 — Modified / Created
- `vite.config.ts` — add Tailwind plugin, `@` alias, `/api` proxy
- `tsconfig.app.json` — add `baseUrl` + `paths`
- `index.html` — title only
- `src/index.css` — replace with Tailwind v4 import + CSS variables
- `src/env.d.ts` — Vite env type declarations
- `.env.local` — `VITE_API_URL` (empty, proxy handles routing)
- `src/utils/cn.ts` — re-export shadcn `cn()` helper
- `src/types/index.ts` — all TS interfaces mirroring backend DTOs
- `src/utils/constants.ts` — signal colors, signal order, horizon labels, localStorage keys
- `src/utils/formatters.ts` — price, percent, date, relative-time, volume formatters

### Phase 1 — Created
- `src/utils/navigation.ts` — navigate function usable outside React tree
- `src/services/api.ts` — axios instance, ApiException class, interceptors
- `src/utils/jwtUtils.ts` — `decodeJwtPayload()`, `isTokenExpired()`
- `src/contexts/AuthContext.tsx` — user/token state, login/register/logout (login/register wired in Phase 2)
- `src/contexts/SidebarContext.tsx` — open/close toggle with localStorage
- `src/hooks/useAuth.ts` — `useContext(AuthContext)` shorthand
- `src/components/auth/ProtectedRoute.tsx` — auth guard
- `src/components/layout/PublicLayout.tsx` — unauthenticated layout
- `src/components/layout/AppLayout.tsx` — navbar + sidebar + outlet
- `src/components/layout/Navbar.tsx` — logo, search placeholder, user menu
- `src/components/layout/Sidebar.tsx` — nav links + watchlist placeholder
- `src/components/common/ErrorBoundary.tsx` — React error boundary (class component)
- `src/components/common/LoadingSpinner.tsx` — fullPage and inline variants
- `src/components/common/SkeletonCard.tsx` — animated loading placeholder
- `src/pages/*.tsx` — all pages as stubs
- `src/App.tsx` — full router config
- `src/main.tsx` — providers + Toaster

### Phase 2 — Created / Modified
- `src/services/authService.ts` — `login()`, `register()`
- `src/contexts/AuthContext.tsx` — modified: wire `login`/`register` to authService
- `src/components/auth/LoginForm.tsx` — React Hook Form + Zod
- `src/components/auth/RegisterForm.tsx` — React Hook Form + Zod
- `src/pages/LoginPage.tsx` — implemented (was stub)
- `src/pages/RegisterPage.tsx` — implemented (was stub)

### Phase 3 — Modified
- `src/pages/LandingPage.tsx` — implemented (was stub)

### Phase 4 — Created / Modified
- `src/services/watchlistService.ts` — `getAll()`, `add()`, `remove()`
- `src/hooks/useWatchlist.ts` — fetch + optimistic remove
- `src/components/common/SignalBadge.tsx` — color-coded signal pill (sm/md/lg)
- `src/components/common/EmptyState.tsx` — reusable empty state
- `src/components/dashboard/SummaryCards.tsx` — three stat cards
- `src/components/dashboard/WatchlistTable.tsx` — sortable table with remove dialog
- `src/pages/DashboardPage.tsx` — implemented (was stub)
- `src/components/layout/Sidebar.tsx` — modified: add watchlist quick-access list

---

## Phase 0: Project Setup & Configuration

### Task 0.1: Install Dependencies

- [ ] In `src/frontend/`, run:

```bash
npm install react-router axios react-hook-form @hookform/resolvers zod sonner @phosphor-icons/react lightweight-charts
npm install -D @tailwindcss/vite tailwindcss
```

Expected: no errors, `package.json` `dependencies` and `devDependencies` updated.

### Task 0.2: Configure Vite

- [ ] Replace `vite.config.ts` entirely:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
})
```

### Task 0.3: Add TypeScript Path Alias

- [ ] In `tsconfig.app.json`, add `baseUrl` and `paths` inside `compilerOptions`. The final `compilerOptions` object must be:

```json
{
  "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.app.tsbuildinfo",
  "target": "ES2023",
  "useDefineForClassFields": true,
  "lib": ["ES2023", "DOM", "DOM.Iterable"],
  "module": "ESNext",
  "types": ["vite/client"],
  "skipLibCheck": true,
  "moduleResolution": "bundler",
  "allowImportingTsExtensions": true,
  "verbatimModuleSyntax": true,
  "moduleDetection": "force",
  "noEmit": true,
  "jsx": "react-jsx",
  "strict": true,
  "noUnusedLocals": true,
  "noUnusedParameters": true,
  "erasableSyntaxOnly": true,
  "noFallthroughCasesInSwitch": true,
  "noUncheckedSideEffectImports": true,
  "baseUrl": ".",
  "paths": {
    "@/*": ["./src/*"]
  }
}
```

### Task 0.4: Initialize shadcn/ui

- [ ] Run `npx shadcn@latest init` and answer the CLI prompts:

```
Which style would you like to use?          › New York
Which color would you like to use?          › Neutral
Would you like to use CSS variables?        › Yes
```

shadcn will detect Tailwind v4 and configure accordingly — no `tailwind.config.js` is created.

- [ ] Install all shadcn components used in Phases 0–4:

```bash
npx shadcn@latest add button input card badge table dropdown-menu skeleton tooltip separator progress avatar sheet dialog label
```

Expected: `src/components/ui/` directory populated. `src/lib/utils.ts` created (contains `cn()` helper).

### Task 0.5: Set Up Global Styles

- [ ] Delete `src/App.css` (remove the file entirely)
- [ ] Replace `src/index.css` with the following. If shadcn's `init` already wrote CSS variables here, keep them and just ensure the first line is the Tailwind import:

```css
@import "tailwindcss";

:root {
  --background: 0 0% 100%;
  --foreground: 240 10% 3.9%;
  --card: 0 0% 100%;
  --card-foreground: 240 10% 3.9%;
  --popover: 0 0% 100%;
  --popover-foreground: 240 10% 3.9%;
  --primary: 240 5.9% 10%;
  --primary-foreground: 0 0% 98%;
  --secondary: 240 4.8% 95.9%;
  --secondary-foreground: 240 5.9% 10%;
  --muted: 240 4.8% 95.9%;
  --muted-foreground: 240 3.8% 46.1%;
  --accent: 240 4.8% 95.9%;
  --accent-foreground: 240 5.9% 10%;
  --destructive: 0 84.2% 60.2%;
  --destructive-foreground: 0 0% 98%;
  --border: 240 5.9% 90%;
  --input: 240 5.9% 90%;
  --ring: 240 5.9% 10%;
  --radius: 0.5rem;
}
```

### Task 0.6: Create Foundation Source Files

- [ ] Create `src/env.d.ts`:

```typescript
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

- [ ] Create `.env.local` in `src/frontend/` (not committed to git — add to `.gitignore` if not already there):

```
VITE_API_URL=
```

Leave empty. The Vite dev proxy maps `/api` → `http://localhost:5000`, so no base URL is needed for local development.

- [ ] Create `src/utils/cn.ts`:

```typescript
export { cn } from '@/lib/utils';
```

- [ ] Create `src/types/index.ts`:

```typescript
// === Auth ===

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  username: string;
  email: string;
  expiresAt: string; // ISO 8601 UTC
}

// === Stocks ===

export interface StockSearchResult {
  ticker: string;
  name: string | null;
  sector: string | null;
  latestClose: number | null;
  isInWatchlist: boolean;
}

export interface StockDetail {
  ticker: string;
  name: string | null;
  sector: string | null;
  lastUpdatedAt: string;
  prices: PricePoint[];
}

export interface PricePoint {
  date: string;   // "yyyy-MM-dd"
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// === Watchlist ===

export interface WatchlistItem {
  ticker: string;
  name: string | null;
  latestClose: number | null;
  previousClose: number | null;
  change1dPct: number | null;   // (latest - prev) / prev * 100
  addedAt: string;              // ISO 8601 UTC
  latestSignal: TradingSignal | null;
  signalConfidence: number | null; // 0–1
}

export interface AddToWatchlistRequest {
  ticker: string;
}

// === Predictions ===

export interface PredictRequest {
  ticker: string;
  horizon: Horizon;
}

export interface Prediction {
  ticker: string;
  horizon: string;
  signal: TradingSignal;
  confidence: number;          // 0–1
  probabilities: Record<TradingSignal, number>;
  featuresUsed: number;
  lowConfidence: boolean;
  cachedAt: string;            // ISO 8601 UTC
  expiresAt: string;           // ISO 8601 UTC
}

// === Enums ===

export type TradingSignal = 'Strong Sell' | 'Sell' | 'Hold' | 'Buy' | 'Strong Buy';
export type Horizon = '3m' | '6m' | '1y';

// === Error (RFC 7807 ProblemDetails) ===

export interface ApiError {
  type?: string;
  title: string;
  status: number;
  detail: string;
  instance?: string;
  correlationId?: string;
  errors?: Record<string, string[]>; // field-level validation errors
}

// === JWT Payload (decoded client-side — NOT validated) ===

export interface JwtPayload {
  sub: string;   // user GUID
  email: string;
  name: string;  // username
  exp: number;   // expiry in seconds since epoch
  iat: number;   // issued at
}
```

- [ ] Create `src/utils/constants.ts`:

```typescript
import type { TradingSignal, Horizon } from '@/types';

export const SIGNAL_COLORS: Record<TradingSignal, string> = {
  'Strong Buy':  'bg-emerald-500 text-white',
  'Buy':         'bg-green-500 text-white',
  'Hold':        'bg-amber-500 text-white',
  'Sell':        'bg-orange-500 text-white',
  'Strong Sell': 'bg-red-500 text-white',
};

export const SIGNAL_DOT_COLORS: Record<TradingSignal, string> = {
  'Strong Buy':  'bg-emerald-500',
  'Buy':         'bg-green-500',
  'Hold':        'bg-amber-500',
  'Sell':        'bg-orange-500',
  'Strong Sell': 'bg-red-500',
};

// Ordered from most bullish to most bearish — used for probability bars and sorting
export const SIGNAL_ORDER: TradingSignal[] = [
  'Strong Buy',
  'Buy',
  'Hold',
  'Sell',
  'Strong Sell',
];

export const HORIZON_LABELS: Record<Horizon, string> = {
  '3m': '3 Months',
  '6m': '6 Months',
  '1y': '1 Year',
};

// localStorage keys — centralized to avoid typos
export const TOKEN_KEY = 'sp_token';
export const SIDEBAR_KEY = 'sp_sidebar';
```

- [ ] Create `src/utils/formatters.ts`:

```typescript
export function formatPrice(value: number | null | undefined): string {
  if (value == null) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatPct(value: number | null | undefined): string {
  if (value == null) return '—';
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

export function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatRelativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function formatTimeUntil(isoString: string): string {
  const diff = new Date(isoString).getTime() - Date.now();
  if (diff <= 0) return 'expired';
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h`;
}

export function formatVolume(value: number): string {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000)     return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000)         return `${(value / 1_000).toFixed(0)}K`;
  return value.toString();
}
```

### Task 0.7: Update index.html

- [ ] In `index.html`, update the `<title>` tag:

```html
<title>StockPredictor</title>
```

### Task 0.8: Phase 0 Verification

- [ ] Run `npm run dev` — dev server starts at `http://localhost:5173` with no errors
- [ ] Open browser — Vite template renders (expected; shell isn't built yet)
- [ ] Temporarily add `<p className="text-blue-500">Tailwind works</p>` to `App.tsx` — blue text confirms Tailwind v4 is active
- [ ] Temporarily add `import { formatPrice } from '@/utils/formatters'` to `App.tsx` — no TS error confirms `@/` alias works
- [ ] Run `npm run build` — TypeScript compiles without errors
- [ ] Revert the test additions to `App.tsx`

- [ ] Git commit:

```bash
git add src/ vite.config.ts tsconfig.app.json index.html .env.local
git commit -m "feat(frontend): phase 0 — tooling setup, types, constants, formatters"
```

---

## Phase 1: Foundation — Layout, Routing, Auth Skeleton

### Task 1.1: Navigation Service

The axios response interceptor (in `api.ts`) needs to redirect on 401 but lives outside the React tree — it cannot call `useNavigate()`. This module bridges that gap.

- [ ] Create `src/utils/navigation.ts`:

```typescript
// Allows the axios interceptor to navigate without access to React hooks.
// Set by AuthContext on mount via setNavigate().

type NavigateFn = (to: string, options?: { replace?: boolean }) => void;

let _navigate: NavigateFn | null = null;

export function setNavigate(fn: NavigateFn): void {
  _navigate = fn;
}

export function navigateTo(to: string, options?: { replace?: boolean }): void {
  if (_navigate) {
    _navigate(to, options);
  } else {
    // Fallback before React Router has mounted
    window.location.href = to;
  }
}
```

### Task 1.2: API Service

- [ ] Create `src/services/api.ts`:

```typescript
import axios, { type AxiosError } from 'axios';
import { TOKEN_KEY } from '@/utils/constants';
import type { ApiError } from '@/types';

// ── ApiException ──────────────────────────────────────────────────────────────

export class ApiException extends Error {
  readonly status: number;
  readonly title: string;
  readonly detail: string;
  readonly correlationId?: string;
  readonly fieldErrors?: Record<string, string[]>;

  constructor(error: ApiError) {
    super(error.detail || error.title);
    this.name = 'ApiException';
    this.status = error.status;
    this.title = error.title;
    this.detail = error.detail;
    this.correlationId = error.correlationId;
    this.fieldErrors = error.errors;
  }
}

// ── Axios instance ────────────────────────────────────────────────────────────

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15_000,
});

// Attach JWT on every request.
// Reads from localStorage at call time — never captures the value in a closure.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Normalize errors and handle 401.
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiError>) => {
    if (error.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      // Full reload to clear React state cleanly; navigateTo('/login') would
      // require the React Router to be mounted, which may not be the case here.
      window.location.href = '/login';
      return Promise.reject(
        new ApiException({ status: 401, title: 'Unauthorized', detail: 'Session expired' })
      );
    }

    const data = error.response?.data;
    if (data && typeof data === 'object' && 'title' in data) {
      throw new ApiException(data as ApiError);
    }

    throw new ApiException({
      status: error.response?.status ?? 0,
      title: 'Network Error',
      detail: error.message ?? 'An unexpected error occurred',
    });
  }
);

export default api;
```

### Task 1.3: JWT Utility

- [ ] Create `src/utils/jwtUtils.ts`:

```typescript
import type { JwtPayload } from '@/types';

/**
 * Decode a JWT payload without verifying the signature.
 * Only used to read user info and check token expiry on the client.
 * The backend validates the token on every API request.
 */
export function decodeJwtPayload(token: string): JwtPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    // Base64url → Base64 → JSON
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + (4 - (base64.length % 4)) % 4, '=');
    const json = atob(padded);
    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
}

/** Returns true if the token's exp claim is in the past. */
export function isTokenExpired(payload: JwtPayload): boolean {
  return payload.exp * 1000 < Date.now();
}
```

### Task 1.4: AuthContext

`AuthProvider` must be mounted inside `<BrowserRouter>` (done in `main.tsx`) so it can call `useNavigate()`.

- [ ] Create `src/contexts/AuthContext.tsx`:

```typescript
import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { TOKEN_KEY } from '@/utils/constants';
import { decodeJwtPayload, isTokenExpired } from '@/utils/jwtUtils';
import type { AuthResponse } from '@/types';

interface User {
  username: string;
  email: string;
}

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  /** Called by login/register after a successful API response. */
  setAuthFromResponse: (response: AuthResponse) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [user, setUser]       = useState<User | null>(null);
  const [token, setToken]     = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(TOKEN_KEY);
    if (stored) {
      const payload = decodeJwtPayload(stored);
      if (payload && !isTokenExpired(payload)) {
        setToken(stored);
        setUser({ username: payload.name, email: payload.email });
      } else {
        localStorage.removeItem(TOKEN_KEY);
      }
    }
    setIsLoading(false);
  }, []);

  const setAuthFromResponse = useCallback((response: AuthResponse) => {
    localStorage.setItem(TOKEN_KEY, response.token);
    setToken(response.token);
    setUser({ username: response.username, email: response.email });
  }, []);

  // login and register are replaced in Task 2.2 once authService exists.
  // They throw here so Phase 1 compilation succeeds without authService.
  const login = useCallback(async (_email: string, _password: string): Promise<void> => {
    throw new Error('AuthContext.login: wire up in Task 2.2');
  }, []);

  const register = useCallback(async (_username: string, _email: string, _password: string): Promise<void> => {
    throw new Error('AuthContext.register: wire up in Task 2.2');
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
    navigate('/');
  }, [navigate]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token,
        isLoading,
        login,
        register,
        logout,
        setAuthFromResponse,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used inside <AuthProvider>');
  return ctx;
}
```

### Task 1.5: SidebarContext

- [ ] Create `src/contexts/SidebarContext.tsx`:

```typescript
import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { SIDEBAR_KEY } from '@/utils/constants';

interface SidebarContextValue {
  isOpen: boolean;
  toggle: () => void;
  close: () => void;
}

const SidebarContext = createContext<SidebarContextValue | null>(null);

function getDefaultOpen(): boolean {
  const stored = localStorage.getItem(SIDEBAR_KEY);
  if (stored !== null) return stored === 'true';
  return window.innerWidth >= 1024;
}

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState<boolean>(getDefaultOpen);

  const toggle = useCallback(() => {
    setIsOpen((prev) => {
      const next = !prev;
      localStorage.setItem(SIDEBAR_KEY, String(next));
      return next;
    });
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    localStorage.setItem(SIDEBAR_KEY, 'false');
  }, []);

  return (
    <SidebarContext.Provider value={{ isOpen, toggle, close }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar(): SidebarContextValue {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error('useSidebar must be used inside <SidebarProvider>');
  return ctx;
}
```

### Task 1.6: useAuth Hook

- [ ] Create `src/hooks/useAuth.ts`:

```typescript
export { useAuthContext as useAuth } from '@/contexts/AuthContext';
```

### Task 1.7: Common Components

- [ ] Create `src/components/common/LoadingSpinner.tsx`:

```typescript
import { cn } from '@/utils/cn';

interface LoadingSpinnerProps {
  fullPage?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'h-4 w-4 border-2',
  md: 'h-8 w-8 border-2',
  lg: 'h-12 w-12 border-4',
} as const;

export default function LoadingSpinner({ fullPage = false, size = 'md' }: LoadingSpinnerProps) {
  const spinner = (
    <div
      role="status"
      aria-label="Loading"
      className={cn(
        'animate-spin rounded-full border-muted border-t-primary',
        sizeClasses[size]
      )}
    />
  );

  if (fullPage) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
        {spinner}
      </div>
    );
  }

  return spinner;
}
```

- [ ] Create `src/components/common/ErrorBoundary.tsx`:

```typescript
import { Component, type ReactNode, type ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 p-8 text-center">
          <h2 className="text-xl font-semibold text-destructive">Something went wrong</h2>
          <p className="max-w-sm text-sm text-muted-foreground">{this.state.error?.message}</p>
          <button
            className="text-sm underline hover:no-underline"
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
```

- [ ] Create `src/components/common/SkeletonCard.tsx`:

```typescript
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/utils/cn';

interface SkeletonCardProps {
  lines?: number;
  className?: string;
}

export default function SkeletonCard({ lines = 3, className }: SkeletonCardProps) {
  return (
    <div className={cn('space-y-2 p-4', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={i === 0 ? 'h-4 w-3/4' : 'h-4 w-full'} />
      ))}
    </div>
  );
}
```

### Task 1.8: ProtectedRoute

- [ ] Create `src/components/auth/ProtectedRoute.tsx`:

```typescript
import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuth } from '@/hooks/useAuth';
import LoadingSpinner from '@/components/common/LoadingSpinner';

export default function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <LoadingSpinner fullPage />;

  if (!isAuthenticated) {
    return (
      <Navigate
        to={`/login?returnTo=${encodeURIComponent(location.pathname)}`}
        replace
      />
    );
  }

  return <Outlet />;
}
```

### Task 1.9: PublicLayout

If the user is authenticated and visits `/`, `/login`, or `/register`, redirect them to the dashboard.

- [ ] Create `src/components/layout/PublicLayout.tsx`:

```typescript
import { Navigate, Outlet } from 'react-router';
import { useAuth } from '@/hooks/useAuth';
import LoadingSpinner from '@/components/common/LoadingSpinner';

export default function PublicLayout() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <LoadingSpinner fullPage />;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  return (
    <div className="min-h-screen bg-background">
      <Outlet />
    </div>
  );
}
```

### Task 1.10: Navbar

- [ ] Create `src/components/layout/Navbar.tsx`:

Build the full component (~120 lines). Key elements:

- **Root:** `<header>` with `h-14 border-b bg-card px-4 flex items-center gap-3 shrink-0`
- **Left:** `<button>` with Phosphor `<List size={20} />` icon calling `useSidebar().toggle()`. Then `<Link to="/dashboard">` with "StockPredictor" text (bold).
- **Center:** `<div className="flex-1 max-w-md mx-auto">` containing a shadcn `<Input placeholder="Search stocks..." />` (non-functional; wired in Phase 5). Add Phosphor `<MagnifyingGlass>` as a left icon via relative positioning.
- **Right:** shadcn `<DropdownMenu>`. Trigger is a shadcn `<Avatar>` showing first letter of `user?.username`. Menu items: `<DropdownMenuLabel>{user?.username}</DropdownMenuLabel>`, separator, `<DropdownMenuItem asChild><Link to="/settings">Settings</Link></DropdownMenuItem>`, separator, `<DropdownMenuItem onClick={logout}>Log out</DropdownMenuItem>`.
- Import `useAuth` from `@/hooks/useAuth` and `useSidebar` from `@/contexts/SidebarContext`.

### Task 1.11: Sidebar

- [ ] Create `src/components/layout/Sidebar.tsx`:

Build the full component (~100 lines). Key elements:

- **Root:** `<aside className={cn('flex flex-col w-64 border-r bg-card shrink-0 transition-all', isOpen ? 'flex' : 'hidden lg:hidden')}>` — entirely hidden when `isOpen` is false. On desktop, the layout collapses gracefully (no need for Sheet overlay in Phase 1).
- **Nav section:** heading "Navigation" (`text-xs uppercase font-semibold text-muted-foreground tracking-wider px-4 py-2`). Three nav items using `<NavLink>` from `react-router`:
  - `<ChartLine />` "Dashboard" → `/dashboard`
  - `<ChartBar />` "Predictions" → `/predictions`
  - `<Gear />` "Settings" → `/settings`
  - Active style: `className={({ isActive }) => cn('flex items-center gap-3 px-4 py-2 text-sm rounded-md hover:bg-accent', isActive && 'bg-accent font-medium')}`
- **Watchlist section (placeholder):** heading "Watchlist". Body: `<span className="px-4 text-xs text-muted-foreground">Loading...</span>`. This section is replaced in Task 4.8.
- Import `useSidebar` from `@/contexts/SidebarContext`.

### Task 1.12: AppLayout

- [ ] Create `src/components/layout/AppLayout.tsx`:

```typescript
import { Outlet } from 'react-router';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import ErrorBoundary from '@/components/common/ErrorBoundary';

export default function AppLayout() {
  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-6">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
```

### Task 1.13: Page Stubs

- [ ] Create each page file as a minimal stub. Use this pattern consistently:

```typescript
// src/pages/DashboardPage.tsx
export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold">Dashboard</h1>
    </div>
  );
}
```

Create stubs for all 9 pages: `LandingPage`, `LoginPage`, `RegisterPage`, `DashboardPage`, `StockDetailPage`, `SearchResultsPage`, `PredictionsPage`, `SettingsPage`.

The 404 page is slightly more complete:

```typescript
// src/pages/NotFoundPage.tsx
import { Link } from 'react-router';

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-6xl font-bold text-muted-foreground">404</h1>
      <p className="text-lg text-muted-foreground">Page not found</p>
      <Link to="/" className="text-sm underline">Go home</Link>
    </div>
  );
}
```

### Task 1.14: App.tsx — Router Configuration

- [ ] Replace `src/App.tsx` entirely. Note: no `<BrowserRouter>` here — it lives in `main.tsx`.

```typescript
import { Routes, Route } from 'react-router';
import PublicLayout from '@/components/layout/PublicLayout';
import AppLayout from '@/components/layout/AppLayout';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import LandingPage from '@/pages/LandingPage';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import DashboardPage from '@/pages/DashboardPage';
import StockDetailPage from '@/pages/StockDetailPage';
import SearchResultsPage from '@/pages/SearchResultsPage';
import PredictionsPage from '@/pages/PredictionsPage';
import SettingsPage from '@/pages/SettingsPage';
import NotFoundPage from '@/pages/NotFoundPage';

export default function App() {
  return (
    <Routes>
      {/* Public routes — redirect to /dashboard if authenticated */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      {/* Protected routes — redirect to /login if not authenticated */}
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
  );
}
```

### Task 1.15: main.tsx — Entry Point

Critical ordering: `<BrowserRouter>` must wrap `<AuthProvider>` so `useNavigate()` works inside the context.

- [ ] Replace `src/main.tsx` entirely:

```typescript
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/contexts/AuthContext';
import { SidebarProvider } from '@/contexts/SidebarContext';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* BrowserRouter wraps AuthProvider so useNavigate() works inside the context */}
    <BrowserRouter>
      <AuthProvider>
        <SidebarProvider>
          <App />
          <Toaster position="top-right" richColors closeButton />
        </SidebarProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);
```

### Task 1.16: Phase 1 Verification

- [ ] Run `npm run build` — TypeScript compiles without errors (fix any before proceeding)
- [ ] Run `npm run dev`, open `http://localhost:5173`
- [ ] Visit `/` — LandingPage stub renders (not redirected; no token)
- [ ] Visit `/dashboard` — redirects to `/login?returnTo=%2Fdashboard`
- [ ] Visit `/login` — LoginPage stub renders, navbar/sidebar are NOT visible (PublicLayout)
- [ ] Check console — no runtime errors

- [ ] Git commit:

```bash
git add src/ vite.config.ts tsconfig.app.json
git commit -m "feat(frontend): phase 1 — app shell, routing, auth skeleton"
```

---

## Phase 2: Authentication — Login & Register

### Task 2.1: authService

- [ ] Create `src/services/authService.ts`:

```typescript
import api from './api';
import type { AuthResponse } from '@/types';

export async function login(email: string, password: string): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/api/auth/login', { email, password });
  return data;
}

export async function register(
  username: string,
  email: string,
  password: string
): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/api/auth/register', {
    username,
    email,
    password,
  });
  return data;
}
```

### Task 2.2: Wire AuthContext login/register

- [ ] In `src/contexts/AuthContext.tsx`, add the following import at the top of the file:

```typescript
import * as authService from '@/services/authService';
```

- [ ] Replace the placeholder `login` function with:

```typescript
const login = useCallback(async (email: string, password: string): Promise<void> => {
  const response = await authService.login(email, password);
  setAuthFromResponse(response);
  const params = new URLSearchParams(window.location.search);
  const returnTo = params.get('returnTo') ?? '/dashboard';
  navigate(returnTo, { replace: true });
}, [navigate, setAuthFromResponse]);
```

- [ ] Replace the placeholder `register` function with:

```typescript
const register = useCallback(
  async (username: string, email: string, password: string): Promise<void> => {
    const response = await authService.register(username, email, password);
    setAuthFromResponse(response);
    navigate('/dashboard', { replace: true });
  },
  [navigate, setAuthFromResponse]
);
```

`logout` navigates to `/` and was already implemented in Task 1.4 — no changes needed.

### Task 2.3: LoginForm

- [ ] Create `src/components/auth/LoginForm.tsx`:

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { ApiException } from '@/services/api';

const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginForm() {
  const { login } = useAuth();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(data: LoginFormData) {
    try {
      await login(data.email, data.password);
    } catch (err) {
      if (err instanceof ApiException) {
        if (err.status === 401) toast.error('Invalid email or password');
        else if (err.status === 429) toast.error('Too many attempts. Please try again later.');
        else toast.error(err.detail);
      }
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" {...register('email')} />
        {errors.email && (
          <p className="text-xs text-destructive">{errors.email.message}</p>
        )}
      </div>

      <div className="space-y-1">
        <Label htmlFor="password">Password</Label>
        <Input id="password" type="password" {...register('password')} />
        {errors.password && (
          <p className="text-xs text-destructive">{errors.password.message}</p>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? 'Signing in…' : 'Sign In'}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{' '}
        <Link to="/register" className="underline hover:no-underline">
          Register
        </Link>
      </p>
    </form>
  );
}
```

### Task 2.4: RegisterForm

- [ ] Create `src/components/auth/RegisterForm.tsx`:

Same structure as LoginForm. Key differences:

```typescript
const registerSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be at most 30 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Only letters, numbers, and underscores'),
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});
```

On submit error: 409 → `toast.error('Email or username already taken')`, 429 → rate limit toast.

Footer link: `Already have an account? <Link to="/login">Sign In</Link>`

Call `const { register: registerUser } = useAuth()` (rename to avoid clash with RHF's `register`).

### Task 2.5: LoginPage and RegisterPage

- [ ] Implement `src/pages/LoginPage.tsx`:

```typescript
import LoginForm from '@/components/auth/LoginForm';

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">StockPredictor</h1>
          <p className="text-sm text-muted-foreground">Sign in to your account</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
```

- [ ] Implement `src/pages/RegisterPage.tsx` with the same centered layout, `<h1>StockPredictor</h1>`, subtitle "Create an account", and `<RegisterForm />`.

### Task 2.6: Phase 2 Verification

Backend must be running at `http://localhost:5000` for these checks.

- [ ] `npm run dev`, navigate to `/login`
- [ ] Submit empty form — inline validation errors appear per field ✓
- [ ] Submit `test@test.com` / `wrongpassword` — toast "Invalid email or password" ✓
- [ ] Navigate to `/register` — create a new account → redirects to `/dashboard` ✓
- [ ] Refresh page — still authenticated (token in `localStorage["sp_token"]`) ✓
- [ ] Click "Log out" in navbar → redirects to `/`, localStorage cleared ✓
- [ ] Navigate to `/dashboard` directly → redirects to `/login?returnTo=%2Fdashboard` ✓
- [ ] Log in → redirects to `/dashboard` (returnTo honored) ✓
- [ ] `npm run build` — zero TypeScript errors ✓

- [ ] Git commit:

```bash
git add src/
git commit -m "feat(frontend): phase 2 — authentication login and register"
```

---

## Phase 3: Landing Page

### Task 3.1: LandingPage

- [ ] Implement `src/pages/LandingPage.tsx` (~180 lines). Three sections:

**Hero section:**
```typescript
<section className="flex min-h-[65vh] flex-col items-center justify-center gap-6 px-4 text-center">
  <h1 className="max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl">
    Smart Stock Predictions,{' '}
    <span className="text-primary">Powered by Machine Learning</span>
  </h1>
  <p className="max-w-lg text-lg text-muted-foreground">
    XGBoost-powered trading signals — Strong Sell to Strong Buy — built from
    22 technical indicators and global news sentiment from 66M+ articles.
  </p>
  <div className="flex gap-3">
    <Button asChild size="lg">
      <Link to="/register">Get Started</Link>
    </Button>
    <Button asChild variant="outline" size="lg">
      <Link to="/login">Sign In</Link>
    </Button>
  </div>
</section>
```

**Features section** (`<section className="bg-muted/40 py-16 px-4">`):

`<h2>` "Why StockPredictor?" centered above a `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto`.

Four shadcn `<Card>` components. Each: Phosphor icon (size 32, `className="text-primary mb-3"`), bold title, description paragraph.

| Icon | Title | Description |
|------|-------|-------------|
| `<Brain />` | ML-Powered Signals | XGBoost model analyzes 22 technical and sentiment features to classify each stock's outlook. |
| `<ChartLine />` | Real-Time Data | Stock prices fetched hourly from global markets via yfinance. Always fresh, always fast. |
| `<Star />` | Watchlist Tracking | Track any S&P 500 stock. See price, daily change, and ML signal at a glance. |
| `<Newspaper />` | Sentiment Analysis | GDELT global news — 66M+ articles analyzed. Coverage for 84% of S&P 500 stocks. |

**How It Works section** (`<section className="py-16 px-4 max-w-3xl mx-auto text-center">`):

```typescript
<h2 className="text-2xl font-bold mb-8">How It Works</h2>
<div className="flex items-center justify-center gap-4 text-sm">
  {['Search for a stock', 'Request a prediction', 'Read the signal'].map((step, i) => (
    <div key={i} className="flex items-center gap-4">
      <div className="flex flex-col items-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
          {i + 1}
        </div>
        <span className="text-muted-foreground">{step}</span>
      </div>
      {i < 2 && <ArrowRight className="text-muted-foreground" />}
    </div>
  ))}
</div>
```

**Footer:** `<footer className="py-8 text-center text-sm text-muted-foreground">StockPredictor &middot; Bachelor&apos;s Thesis Project</footer>`

### Task 3.2: Phase 3 Verification

- [ ] Navigate to `/` (without token) — hero, features, how-it-works render ✓
- [ ] "Get Started" → `/register` ✓, "Sign In" → `/login` ✓
- [ ] Log in → navigate to `/` → redirects to `/dashboard` ✓
- [ ] `npm run build` — no TypeScript errors ✓

- [ ] Git commit:

```bash
git add src/pages/LandingPage.tsx
git commit -m "feat(frontend): phase 3 — landing page"
```

---

## Phase 4: Dashboard — Watchlist + Summary Cards

### Task 4.1: watchlistService

- [ ] Create `src/services/watchlistService.ts`:

```typescript
import api from './api';
import type { WatchlistItem, AddToWatchlistRequest } from '@/types';

export async function getAll(): Promise<WatchlistItem[]> {
  const { data } = await api.get<WatchlistItem[]>('/api/watchlist');
  return data;
}

export async function add(ticker: string): Promise<void> {
  const body: AddToWatchlistRequest = { ticker };
  await api.post('/api/watchlist', body);
}

export async function remove(ticker: string): Promise<void> {
  await api.delete(`/api/watchlist/${ticker}`);
}
```

### Task 4.2: useWatchlist Hook

Optimistic remove: update UI immediately, revert if the API call fails.

- [ ] Create `src/hooks/useWatchlist.ts`:

```typescript
import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import * as watchlistService from '@/services/watchlistService';
import type { WatchlistItem } from '@/types';

interface UseWatchlistReturn {
  items: WatchlistItem[];
  isLoading: boolean;
  error: string | null;
  remove: (ticker: string) => Promise<void>;
  refetch: () => Promise<void>;
}

export function useWatchlist(): UseWatchlistReturn {
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

  const remove = useCallback(async (ticker: string) => {
    // Capture current state for rollback
    let snapshot: WatchlistItem[] = [];
    setItems((prev) => {
      snapshot = prev;
      return prev.filter((item) => item.ticker !== ticker);
    });

    try {
      await watchlistService.remove(ticker);
      toast.success(`${ticker} removed from watchlist`);
    } catch {
      setItems(snapshot); // revert
      toast.error(`Failed to remove ${ticker}`);
    }
  }, []);

  return { items, isLoading, error, remove, refetch: fetchItems };
}
```

### Task 4.3: SignalBadge

- [ ] Create `src/components/common/SignalBadge.tsx`:

```typescript
import { cn } from '@/utils/cn';
import { SIGNAL_COLORS, SIGNAL_DOT_COLORS } from '@/utils/constants';
import type { TradingSignal } from '@/types';

interface SignalBadgeProps {
  signal: TradingSignal | null;
  size?: 'sm' | 'md' | 'lg';
}

export default function SignalBadge({ signal, size = 'md' }: SignalBadgeProps) {
  // 'sm' is a colored dot — used in the sidebar watchlist list
  if (size === 'sm') {
    return signal
      ? <div className={cn('h-2 w-2 shrink-0 rounded-full', SIGNAL_DOT_COLORS[signal])} title={signal} />
      : <div className="h-2 w-2 shrink-0 rounded-full bg-muted" title="No signal" />;
  }

  if (!signal) {
    return (
      <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
        —
      </span>
    );
  }

  const sizeClasses = {
    md: 'px-2 py-0.5 text-xs font-medium',
    lg: 'px-3 py-1 text-sm font-semibold',
  } as const;

  return (
    <span className={cn('inline-flex items-center rounded-full', SIGNAL_COLORS[signal], sizeClasses[size])}>
      {signal}
    </span>
  );
}
```

### Task 4.4: EmptyState

- [ ] Create `src/components/common/EmptyState.tsx`:

```typescript
import { Button } from '@/components/ui/button';
import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      {icon && <div className="text-4xl text-muted-foreground">{icon}</div>}
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      {actionLabel && onAction && (
        <Button variant="outline" onClick={onAction} className="mt-2">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
```

### Task 4.5: SummaryCards

- [ ] Create `src/components/dashboard/SummaryCards.tsx`:

```typescript
import { ChartLine, TrendUp, Lightning } from '@phosphor-icons/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import SkeletonCard from '@/components/common/SkeletonCard';
import SignalBadge from '@/components/common/SignalBadge';
import { SIGNAL_ORDER, SIGNAL_DOT_COLORS } from '@/utils/constants';
import { cn } from '@/utils/cn';
import type { WatchlistItem } from '@/types';

interface SummaryCardsProps {
  items: WatchlistItem[];
  isLoading: boolean;
}

export default function SummaryCards({ items, isLoading }: SummaryCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[1, 2, 3].map((i) => <SkeletonCard key={i} lines={3} />)}
      </div>
    );
  }

  // Signal distribution counts
  const signalCounts = SIGNAL_ORDER.reduce<Partial<Record<string, number>>>(
    (acc, signal) => {
      acc[signal] = items.filter((i) => i.latestSignal === signal).length;
      return acc;
    },
    {}
  );
  const noDataCount = items.filter((i) => i.latestSignal === null).length;

  // Strongest buy signal
  const strongestBuy = items
    .filter((i) => i.latestSignal === 'Buy' || i.latestSignal === 'Strong Buy')
    .sort((a, b) => (b.signalConfidence ?? 0) - (a.signalConfidence ?? 0))[0] ?? null;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {/* Card 1: Stocks Tracked */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Stocks Tracked
          </CardTitle>
          <ChartLine size={20} className="text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold">{items.length}</p>
        </CardContent>
      </Card>

      {/* Card 2: Signal Breakdown */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Signal Breakdown
          </CardTitle>
          <TrendUp size={20} className="text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm">
            {SIGNAL_ORDER.map((signal) =>
              (signalCounts[signal] ?? 0) > 0 ? (
                <span key={signal} className="flex items-center gap-1">
                  <div className={cn('h-2 w-2 rounded-full', SIGNAL_DOT_COLORS[signal])} />
                  {signalCounts[signal]} {signal}
                </span>
              ) : null
            )}
            {noDataCount > 0 && (
              <span className="flex items-center gap-1 text-muted-foreground">
                <div className="h-2 w-2 rounded-full bg-muted" />
                {noDataCount} No data
              </span>
            )}
            {items.length === 0 && (
              <span className="text-muted-foreground">No stocks yet</span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Card 3: Strongest Signal */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Strongest Buy
          </CardTitle>
          <Lightning size={20} className="text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {strongestBuy ? (
            <div className="flex flex-col gap-1">
              <p className="text-xl font-bold">{strongestBuy.ticker}</p>
              <div className="flex items-center gap-2">
                <SignalBadge signal={strongestBuy.latestSignal} />
                <span className="text-sm text-muted-foreground">
                  {((strongestBuy.signalConfidence ?? 0) * 100).toFixed(1)}% confidence
                </span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No buy signals yet</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

### Task 4.6: WatchlistTable

- [ ] Create `src/components/dashboard/WatchlistTable.tsx`:

```typescript
import { useState } from 'react';
import { useNavigate, Link } from 'react-router';
import { ArrowUp, ArrowDown, Trash } from '@phosphor-icons/react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import SignalBadge from '@/components/common/SignalBadge';
import EmptyState from '@/components/common/EmptyState';
import { formatPrice, formatPct } from '@/utils/formatters';
import { cn } from '@/utils/cn';
import type { WatchlistItem } from '@/types';

type SortKey = keyof Pick<WatchlistItem, 'ticker' | 'name' | 'latestClose' | 'change1dPct' | 'signalConfidence'>;
type SortDir = 'asc' | 'desc';

interface WatchlistTableProps {
  items: WatchlistItem[];
  onRemove: (ticker: string) => Promise<void>;
  isLoading: boolean;
}

export default function WatchlistTable({ items, onRemove, isLoading }: WatchlistTableProps) {
  const navigate = useNavigate();
  const [sortKey, setSortKey] = useState<SortKey>('ticker');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [confirmTicker, setConfirmTicker] = useState<string | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (col !== sortKey) return null;
    return sortDir === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />;
  }

  const sorted = [...items].sort((a, b) => {
    const aVal = a[sortKey] ?? '';
    const bVal = b[sortKey] ?? '';
    if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  async function handleConfirmRemove() {
    if (!confirmTicker) return;
    setIsRemoving(true);
    await onRemove(confirmTicker);
    setIsRemoving(false);
    setConfirmTicker(null);
  }

  if (!isLoading && items.length === 0) {
    return (
      <EmptyState
        title="Your watchlist is empty"
        description="Search for stocks to add them to your watchlist."
      />
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            {(
              [
                { key: 'ticker', label: 'Ticker' },
                { key: 'name', label: 'Name' },
                { key: 'latestClose', label: 'Price' },
                { key: 'change1dPct', label: '1D Change' },
              ] as { key: SortKey; label: string }[]
            ).map(({ key, label }) => (
              <TableHead
                key={key}
                className="cursor-pointer select-none"
                onClick={() => handleSort(key)}
              >
                <span className="flex items-center gap-1">
                  {label} <SortIcon col={key} />
                </span>
              </TableHead>
            ))}
            <TableHead>Signal</TableHead>
            <TableHead
              className="cursor-pointer select-none"
              onClick={() => handleSort('signalConfidence')}
            >
              <span className="flex items-center gap-1">
                Confidence <SortIcon col="signalConfidence" />
              </span>
            </TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading
            ? Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((__, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            : sorted.map((item) => (
                <TableRow
                  key={item.ticker}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => navigate(`/stocks/${item.ticker}`)}
                >
                  <TableCell className="font-semibold">
                    <Link
                      to={`/stocks/${item.ticker}`}
                      className="hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {item.ticker}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{item.name ?? '—'}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatPrice(item.latestClose)}
                  </TableCell>
                  <TableCell
                    className={cn(
                      'text-right tabular-nums',
                      item.change1dPct == null
                        ? 'text-muted-foreground'
                        : item.change1dPct >= 0
                        ? 'text-green-600'
                        : 'text-red-600'
                    )}
                  >
                    {formatPct(item.change1dPct)}
                  </TableCell>
                  <TableCell>
                    <SignalBadge signal={item.latestSignal} />
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {item.signalConfidence != null
                      ? `${(item.signalConfidence * 100).toFixed(1)}%`
                      : '—'}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => setConfirmTicker(item.ticker)}
                    >
                      <Trash size={14} />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
        </TableBody>
      </Table>

      <Dialog open={!!confirmTicker} onOpenChange={() => setConfirmTicker(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove {confirmTicker}?</DialogTitle>
            <DialogDescription>
              This will remove {confirmTicker} from your watchlist.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmTicker(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={isRemoving}
              onClick={() => void handleConfirmRemove()}
            >
              {isRemoving ? 'Removing…' : 'Remove'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
```

### Task 4.7: DashboardPage

- [ ] Implement `src/pages/DashboardPage.tsx`:

```typescript
import { useWatchlist } from '@/hooks/useWatchlist';
import SummaryCards from '@/components/dashboard/SummaryCards';
import WatchlistTable from '@/components/dashboard/WatchlistTable';
import { Button } from '@/components/ui/button';

export default function DashboardPage() {
  const { items, isLoading, error, remove, refetch } = useWatchlist();

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
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Your watchlist overview</p>
      </div>
      <SummaryCards items={items} isLoading={isLoading} />
      <WatchlistTable items={items} onRemove={remove} isLoading={isLoading} />
    </div>
  );
}
```

### Task 4.8: Update Sidebar — Watchlist Quick-Access

Replace the placeholder watchlist section added in Task 1.11.

- [ ] In `src/components/layout/Sidebar.tsx`, add imports:

```typescript
import { useWatchlist } from '@/hooks/useWatchlist';
import SignalBadge from '@/components/common/SignalBadge';
import { Skeleton } from '@/components/ui/skeleton';
import { NavLink, useNavigate } from 'react-router';
```

- [ ] Inside the Sidebar component, add:

```typescript
const { items, isLoading } = useWatchlist();
```

- [ ] Replace the placeholder watchlist section with:

```typescript
<div className="mt-auto border-t pt-3">
  <p className="mb-2 px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
    Watchlist
  </p>
  <div className="max-h-64 overflow-y-auto">
    {isLoading ? (
      <div className="space-y-2 px-4">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-4 w-full" />)}
      </div>
    ) : items.length === 0 ? (
      <p className="px-4 text-xs text-muted-foreground">No stocks yet</p>
    ) : (
      items.map((item) => (
        <NavLink
          key={item.ticker}
          to={`/stocks/${item.ticker}`}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-2 px-4 py-1.5 text-sm hover:bg-accent',
              isActive && 'bg-accent font-medium'
            )
          }
        >
          <SignalBadge signal={item.latestSignal} size="sm" />
          <span>{item.ticker}</span>
        </NavLink>
      ))
    )}
  </div>
</div>
```

Note: Sidebar fetches its own watchlist data independently of DashboardPage — this avoids prop-drilling and keeps components decoupled. The API call is fast and the backend returns cached data.

### Task 4.9: Phase 4 Verification

Backend must be running.

- [ ] `npm run dev`, log in
- [ ] Navigate to `/dashboard` — table loads with real data (AAPL, MSFT, GOOGL, AMZN, TSLA for new accounts) ✓
- [ ] Summary cards: "Stocks Tracked" shows 5, Signal Breakdown shows distribution ✓
- [ ] Click a table row — navigates to `/stocks/AAPL` (stub) ✓
- [ ] Click the trash icon on a row — confirmation dialog appears ✓
- [ ] Confirm removal — row disappears immediately (optimistic), toast "AAPL removed from watchlist" ✓
- [ ] If backend call fails — row reappears (test by stopping the backend temporarily) ✓
- [ ] Click "Ticker" column header — rows sort alphabetically; click again — reverses ✓
- [ ] Sidebar shows watchlist items with signal dots ✓
- [ ] Click a sidebar item — navigates to `/stocks/AAPL` ✓
- [ ] `npm run build` — zero TypeScript errors ✓

- [ ] Git commit:

```bash
git add src/
git commit -m "feat(frontend): phase 4 — dashboard with watchlist, summary cards, and sidebar"
```

---

## Self-Review

### Spec Coverage Check

| Spec Requirement | Covered In |
|---|---|
| Install all runtime + dev dependencies | Task 0.1 |
| Tailwind v4 via `@tailwindcss/vite` | Task 0.2 |
| `@` path alias in Vite + TypeScript | Task 0.2, 0.3 |
| shadcn/ui init (New York, neutral) + components | Task 0.4 |
| CSS custom properties + Tailwind import | Task 0.5 |
| `VITE_API_URL` env declaration | Task 0.6 |
| All TypeScript interfaces (backend DTOs) | Task 0.6 (`types/index.ts`) |
| Signal colors + order + constants | Task 0.6 (`constants.ts`) |
| All formatters (price, pct, date, relative, volume) | Task 0.6 (`formatters.ts`) |
| Vite `/api` proxy for dev CORS bypass | Task 0.2 |
| Axios instance with JWT interceptor | Task 1.2 |
| `ApiException` class | Task 1.2 |
| JWT decode without library | Task 1.3 |
| `AuthContext` (full: user, token, isLoading, login, register, logout) | Task 1.4, 2.2 |
| `SidebarContext` (localStorage persistence, default by screen width) | Task 1.5 |
| `ProtectedRoute` (loading spinner, returnTo redirect) | Task 1.8 |
| `PublicLayout` (redirect auth users to dashboard) | Task 1.9 |
| `AppLayout` (navbar + sidebar + outlet + ErrorBoundary) | Task 1.12 |
| `Navbar` (hamburger, logo, search placeholder, user dropdown) | Task 1.10 |
| `Sidebar` (nav links with active state) | Task 1.11 |
| `ErrorBoundary` | Task 1.7 |
| `LoadingSpinner` (fullPage + inline) | Task 1.7 |
| `SkeletonCard` | Task 1.7 |
| All page stubs | Task 1.13 |
| Full router config (React Router v7) | Task 1.14 |
| Providers + Toaster in `main.tsx` | Task 1.15 |
| `authService` login/register | Task 2.1 |
| `AuthContext` login navigates to returnTo | Task 2.2 |
| `LoginForm` (Zod, inline errors, toasts for 401/429) | Task 2.3 |
| `RegisterForm` (Zod, inline errors, toasts for 409/429) | Task 2.4 |
| Login/Register pages | Task 2.5 |
| Landing page (hero, features, how it works, footer) | Task 3.1 |
| `watchlistService` (getAll, add, remove) | Task 4.1 |
| `useWatchlist` (optimistic remove) | Task 4.2 |
| `SignalBadge` (sm/md/lg, null signal) | Task 4.3 |
| `EmptyState` | Task 4.4 |
| `SummaryCards` (3 cards, skeleton, signal breakdown) | Task 4.5 |
| `WatchlistTable` (sort, remove dialog, skeleton, empty state) | Task 4.6 |
| `DashboardPage` (error state + retry) | Task 4.7 |
| Sidebar watchlist quick-access (signal dot, independent fetch) | Task 4.8 |

### Issues Found and Fixed

1. **`useWatchlist.remove` stale closure:** Uses a functional `setItems` update to capture `snapshot` correctly without `items` in the dependency array — avoids recreating the callback on every state change.
2. **`SummaryCards` needs `isLoading` prop:** DashboardPage passes `isLoading` down; SummaryCards shows skeleton when true. Added to component signature.
3. **`Sidebar` imports:** `cn` must be imported from `@/utils/cn` (not `@/lib/utils` directly).
4. **React Hook Form `register` naming conflict:** In `RegisterForm`, `useAuth().register` must be aliased (e.g., `registerUser`) to avoid colliding with RHF's `register` function.
5. **`noUnusedParameters`:** Phase 1's placeholder `login`/`register` in AuthContext use `_email`, `_password`, `_username` prefixes so TypeScript strict mode doesn't error.

---

## Notes for Subagent Execution

- Each numbered **Task** is one subagent dispatch. Do not combine tasks.
- **Always run `npm run build` at each phase verification** — it catches TypeScript errors before they cascade into later phases.
- Phases 0–1 produce no visible UI changes beyond the Vite template — this is expected.
- The backend must be running (`http://localhost:5000`) for Phase 2+ verification.
- Phase 3 (landing page) can be verified without the backend running.
- Import paths: **always use `@/` aliases**, never relative paths like `../../utils/cn`.
- React Router imports: **always from `react-router`**, not `react-router-dom`.
- Tailwind v4: **`@import "tailwindcss"`**, not `@tailwind base/components/utilities`.
