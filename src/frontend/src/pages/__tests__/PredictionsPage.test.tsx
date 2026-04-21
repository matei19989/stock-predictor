import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import PredictionsPage from '../PredictionsPage';
import { ApiException } from '@/services/api';
import type { PredictRequest, UserPrediction, WatchlistItem } from '@/types';

// ── Service mocks ───────────────────────────────────────────────────────────

const getUserPredictedMock = vi.fn();
const createMock = vi.fn();
vi.mock('@/services/predictionService', () => ({
  getUserPredicted: () => getUserPredictedMock(),
  create: (req: PredictRequest) => createMock(req),
  getLatest: vi.fn(),
  getUserPredictionCount: vi.fn(),
}));

// ── Watchlist hook mock ─────────────────────────────────────────────────────
//
// The page uses `useWatchlist()` from a React context; exposing it as a vi.fn
// lets each test set its own return value without standing up the provider.

const useWatchlistMock = vi.fn();
vi.mock('@/hooks/useWatchlist', () => ({
  useWatchlist: () => useWatchlistMock(),
}));

// ── Table-component stubs ───────────────────────────────────────────────────

vi.mock('@/components/predictions/PredictedTable', () => ({
  default: ({ items }: { items: UserPrediction[] }) => (
    <div data-testid="predicted-table">{items.length} predicted</div>
  ),
}));

vi.mock('@/components/predictions/NotPredictedTable', () => ({
  default: ({
    items,
    onRequestPrediction,
    requestingTicker,
  }: {
    items: WatchlistItem[];
    onRequestPrediction: (ticker: string) => void;
    requestingTicker: string | null;
  }) => (
    <div data-testid="not-predicted-table">
      <span data-testid="requesting-ticker">{requestingTicker ?? 'none'}</span>
      {items.map((i) => (
        <button key={i.ticker} type="button" onClick={() => onRequestPrediction(i.ticker)}>
          Predict {i.ticker}
        </button>
      ))}
    </div>
  ),
}));

// ── Silence toast side effects ──────────────────────────────────────────────

vi.mock('@/lib/toast', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
    message: vi.fn(),
    warning: vi.fn(),
  },
  sonnerToast: { error: vi.fn(), success: vi.fn() },
}));

vi.mock('@/utils/notify', () => ({
  notifySuccess: vi.fn(),
}));

// ── Fixtures ────────────────────────────────────────────────────────────────

const watchedApple: WatchlistItem = {
  ticker: 'AAPL',
  name: 'Apple Inc.',
  latestClose: 170,
  previousClose: 168,
  change1dPct: 1.19,
  addedAt: '2026-04-01T00:00:00Z',
  latestSignal: null,
  signalConfidence: null,
};

const watchedMsft: WatchlistItem = {
  ...watchedApple,
  ticker: 'MSFT',
  name: 'Microsoft Corp.',
};

const predictedApple: UserPrediction = {
  ticker: 'AAPL',
  name: 'Apple Inc.',
  horizon: '3m',
  signal: 'Buy',
  confidence: 0.42,
  predictedAt: '2026-04-20T10:00:00Z',
  expiresAt: '2026-04-21T10:00:00Z',
  isExpired: false,
};

function setWatchlist(partial: {
  items?: WatchlistItem[];
  isLoading?: boolean;
  error?: string | null;
}) {
  useWatchlistMock.mockReturnValue({
    items: partial.items ?? [],
    isLoading: partial.isLoading ?? false,
    error: partial.error ?? null,
    add: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
    refetch: vi.fn().mockResolvedValue(undefined),
  });
}

function renderPage() {
  return render(
    <MemoryRouter>
      <PredictionsPage />
    </MemoryRouter>,
  );
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('PredictionsPage', () => {
  beforeEach(() => {
    getUserPredictedMock.mockReset();
    createMock.mockReset();
    useWatchlistMock.mockReset();
  });

  it('shows the empty-watchlist state when the watchlist is empty', async () => {
    setWatchlist({ items: [] });
    getUserPredictedMock.mockResolvedValueOnce([]);
    renderPage();

    expect(await screen.findByText(/no stocks in your watchlist/i)).toBeInTheDocument();
  });

  it('renders the predicted table by default and can switch to the not-predicted tab', async () => {
    setWatchlist({ items: [watchedApple, watchedMsft] });
    getUserPredictedMock.mockResolvedValueOnce([predictedApple]);
    renderPage();

    expect(await screen.findByTestId('predicted-table')).toHaveTextContent('1 predicted');

    await userEvent.click(
      screen.getByRole('button', { name: /watchlisted · not predicted/i }),
    );
    expect(screen.getByTestId('not-predicted-table')).toBeInTheDocument();
    // AAPL already has a prediction, so only MSFT appears in the not-predicted set.
    expect(screen.getByRole('button', { name: /predict msft/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^predict aapl$/i })).not.toBeInTheDocument();
  });

  it('requests a prediction from the not-predicted tab and reloads both lists on success', async () => {
    setWatchlist({ items: [watchedMsft] });
    getUserPredictedMock.mockResolvedValue([]);
    createMock.mockResolvedValueOnce({
      ticker: 'MSFT',
      horizon: '3m',
      signal: 'Hold',
      confidence: 0.31,
      probabilities: {} as Record<string, number>,
      featuresUsed: 22,
      lowConfidence: false,
      cachedAt: '',
      expiresAt: '',
    });

    renderPage();
    await screen.findByTestId('predicted-table');

    await userEvent.click(
      screen.getByRole('button', { name: /watchlisted · not predicted/i }),
    );
    await userEvent.click(screen.getByRole('button', { name: /predict msft/i }));

    await waitFor(() => {
      expect(createMock).toHaveBeenCalledWith({ ticker: 'MSFT', horizon: '3m' });
    });
    // Once on mount + once after the successful predict.
    await waitFor(() => {
      expect(getUserPredictedMock).toHaveBeenCalledTimes(2);
    });
  });

  it('shows the error state with a try-again button when the predicted list fails to load', async () => {
    setWatchlist({ items: [watchedMsft] });
    getUserPredictedMock.mockRejectedValueOnce(
      new ApiException({ status: 500, title: 'Server', detail: 'boom' }),
    );
    renderPage();

    expect(await screen.findByText('boom')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });
});
