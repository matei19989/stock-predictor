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

export interface RegisterPendingResponse {
  message: string;
  email: string;
}

export type RegisterResponse = AuthResponse | RegisterPendingResponse;

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

export interface StockOverview {
  ticker: string;
  name: string | null;
  sector: string | null;
  latestClose: number | null;
  change1dPct: number | null;
  latestSignal: TradingSignal | null;
  signalConfidence: number | null;
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
  change1dPct: number | null;
  addedAt: string;
  latestSignal: TradingSignal | null;
  signalConfidence: number | null;
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
  confidence: number;
  probabilities: Record<TradingSignal, number>;
  featuresUsed: number;
  lowConfidence: boolean;
  cachedAt: string;
  expiresAt: string;
}

// === Enums ===

export type TradingSignal = 'Strong Sell' | 'Sell' | 'Hold' | 'Buy' | 'Strong Buy';
export type Horizon = '3m' | '6m' | '1y';

export interface UserPrediction {
  ticker: string;
  name: string | null;
  horizon: Horizon;
  signal: TradingSignal | null;
  confidence: number | null;
  predictedAt: string;
  expiresAt: string | null;
  isExpired: boolean;
}

// === Preferences ===

export interface UserPreferences {
  defaultChartRange: string;
  notificationsEnabled: boolean;
}

// === Error (RFC 7807 ProblemDetails) ===

export interface ApiError {
  type?: string;
  title: string;
  status: number;
  detail: string;
  instance?: string;
  correlationId?: string;
  errors?: Record<string, string[]>;
}

// === JWT Payload (decoded client-side — NOT validated) ===

export interface JwtPayload {
  sub: string;
  email: string;
  unique_name: string;
  exp: number;
  iat: number;
}
