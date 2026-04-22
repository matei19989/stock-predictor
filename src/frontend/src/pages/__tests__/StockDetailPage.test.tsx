import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router';
import StockDetailPage from '../StockDetailPage';
import { ApiException } from '@/services/api';
import type { StockDetail } from '@/types';

// ── Service + hook mocks ────────────────────────────────────────────────────

const getDetailMock = vi.fn();
vi.mock('@/services/stockService', () => ({
  getDetail: (ticker: string) => getDetailMock(ticker),
  search: vi.fn(),
  getAll: vi.fn(),
  recordVisit: vi.fn(),
  getRecentlyViewed: vi.fn(),
}));

const fetchPredictionMock = vi.fn().mockResolvedValue(undefined);
const predictMock = vi.fn().mockResolvedValue(undefined);
vi.mock('@/hooks/usePrediction', () => ({
  usePrediction: () => ({
    prediction: null,
    isLoading: false,
    isPredicting: false,
    error: null,
    fetch: fetchPredictionMock,
    predict: predictMock,
  }),
}));

vi.mock('@/hooks/useWatchlist', () => ({
  useWatchlist: () => ({
    items: [],
    isLoading: false,
    error: null,
    add: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
    refetch: vi.fn().mockResolvedValue(undefined),
  }),
}));

const addRecentlyViewedMock = vi.fn();
vi.mock('@/hooks/useRecentlyViewed', () => ({
  useRecentlyViewed: () => ({
    add: addRecentlyViewedMock,
    items: [],
    isLoading: false,
  }),
}));

// ── Child-component stubs ───────────────────────────────────────────────────
//
// Heavy children (StockChart → lightweight-charts → canvas; StockHeader,
// PriceSummary, PredictionCard) are replaced with lean stubs so this test
// stays focused on the page's own state/effects rather than rendering-layer
// concerns. PredictionCard exposes two buttons so we can drive its callbacks.

vi.mock('@/components/stock/StockChart', () => ({
  default: () => <div data-testid="stock-chart" />,
}));

vi.mock('@/components/stock/StockHeader', () => ({
  default: ({ ticker, name }: { ticker: string; name: string | null }) => (
    <div data-testid="stock-header">
      {ticker} · {name}
    </div>
  ),
}));

vi.mock('@/components/stock/PriceSummary', () => ({
  default: () => <div data-testid="price-summary" />,
}));

vi.mock('@/components/stock/PredictionCard', () => ({
  default: ({
    horizon,
    onHorizonChange,
    onPredict,
  }: {
    horizon: string;
    onHorizonChange: (h: '3m' | '6m' | '1y') => void;
    onPredict: (h: '3m' | '6m' | '1y') => void;
  }) => (
    <div data-testid="prediction-card">
      <span data-testid="prediction-horizon">{horizon}</span>
      <button type="button" onClick={() => onHorizonChange('6m')}>
        Change horizon to 6m
      </button>
      <button type="button" onClick={() => onPredict('3m')}>
        Predict
      </button>
    </div>
  ),
}));

// ── Helpers ─────────────────────────────────────────────────────────────────

const validStock: StockDetail = {
  ticker: 'AAPL',
  name: 'Apple Inc.',
  sector: 'Technology',
  lastUpdatedAt: '2026-04-20T00:00:00Z',
  prices: [
    { date: '2026-04-18', open: 170, high: 172, low: 169, close: 171, volume: 1_000_000 },
    { date: '2026-04-19', open: 171, high: 174, low: 170, close: 173, volume: 1_100_000 },
  ],
};

function renderPage(ticker = 'AAPL') {
  return render(
    <MemoryRouter initialEntries={[`/stocks/${ticker}`]}>
      <Routes>
        <Route path="/stocks/:ticker" element={<StockDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('StockDetailPage', () => {
  beforeEach(() => {
    getDetailMock.mockReset();
    fetchPredictionMock.mockClear();
    predictMock.mockClear();
    addRecentlyViewedMock.mockClear();
  });

  it('renders loading skeletons while the stock detail is fetching', () => {
    // Pending promise keeps the page in its isLoading branch.
    getDetailMock.mockReturnValue(new Promise(() => {}));
    const { container } = renderPage();

    expect(screen.queryByTestId('stock-header')).not.toBeInTheDocument();
    expect(screen.queryByText(/stock not found/i)).not.toBeInTheDocument();
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
  });

  it('renders the stock header, chart, and prediction card once the detail loads', async () => {
    getDetailMock.mockResolvedValueOnce(validStock);
    renderPage();

    expect(await screen.findByTestId('stock-header')).toHaveTextContent('AAPL · Apple Inc.');
    expect(screen.getByTestId('stock-chart')).toBeInTheDocument();
    expect(screen.getByTestId('price-summary')).toBeInTheDocument();
    expect(screen.getByTestId('prediction-card')).toBeInTheDocument();
    expect(addRecentlyViewedMock).toHaveBeenCalledWith('AAPL');
  });

  it('shows the not-found screen when the detail endpoint returns 404', async () => {
    getDetailMock.mockRejectedValueOnce(
      new ApiException({ status: 404, title: 'NotFound', detail: 'missing' }),
    );
    renderPage('ZZZZ');

    expect(await screen.findByText(/stock not found/i)).toBeInTheDocument();
    expect(screen.getByText(/ZZZZ/)).toBeInTheDocument();
  });

  it('shows the generic error state with a try-again button on non-404 failures', async () => {
    getDetailMock.mockRejectedValueOnce(new Error('network boom'));
    renderPage();

    expect(await screen.findByText(/failed to load stock data/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('fetches the prediction with the default horizon, then refetches when horizon changes', async () => {
    getDetailMock.mockResolvedValue(validStock);
    renderPage();
    await screen.findByTestId('prediction-card');

    // Mount effect drives the first fetch with the default horizon ('3m').
    await waitFor(() => {
      expect(fetchPredictionMock).toHaveBeenCalledWith('AAPL', '3m');
    });
    fetchPredictionMock.mockClear();

    await userEvent.click(screen.getByRole('button', { name: /change horizon to 6m/i }));
    await waitFor(() => {
      expect(fetchPredictionMock).toHaveBeenCalledWith('AAPL', '6m');
    });
  });

  it('calls predict() when the prediction card triggers onPredict', async () => {
    getDetailMock.mockResolvedValue(validStock);
    renderPage();
    await screen.findByTestId('prediction-card');

    await userEvent.click(screen.getByRole('button', { name: /^predict$/i }));
    await waitFor(() => {
      expect(predictMock).toHaveBeenCalledWith('AAPL', '3m');
    });
  });
});
