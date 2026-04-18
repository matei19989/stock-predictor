import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePrediction } from '../usePrediction';
import * as predictionService from '@/services/predictionService';
import { ApiException } from '@/services/api';
import { ALL_STOCKS_CACHE_KEY } from '@/pages/AllStocksPage';

vi.mock('@/services/predictionService', () => ({
  create: vi.fn(),
  getLatest: vi.fn(),
  getUserPredictionCount: vi.fn(),
  getUserPredicted: vi.fn(),
}));

vi.mock('@/utils/notify', () => ({
  notifySuccess: vi.fn(),
  notifyError: vi.fn(),
}));

const fakePrediction = {
  ticker: 'AAPL',
  horizon: '3m',
  signal: 'Buy' as const,
  confidence: 0.42,
  probabilities: {
    'Strong Sell': 0.1,
    Sell: 0.1,
    Hold: 0.2,
    Buy: 0.42,
    'Strong Buy': 0.18,
  },
  featuresUsed: 22,
  lowConfidence: false,
  cachedAt: '2026-04-18T00:00:00Z',
  expiresAt: '2026-04-19T00:00:00Z',
};

describe('usePrediction', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('predict() stores the prediction and clears the all-stocks cache on success', async () => {
    vi.mocked(predictionService.create).mockResolvedValue(fakePrediction);
    sessionStorage.setItem(ALL_STOCKS_CACHE_KEY, '{"ts":1,"data":[]}');

    const { result } = renderHook(() => usePrediction());
    await act(async () => {
      await result.current.predict('AAPL', '3m');
    });

    expect(result.current.prediction).toEqual(fakePrediction);
    expect(result.current.error).toBeNull();
    expect(result.current.isPredicting).toBe(false);
    expect(sessionStorage.getItem(ALL_STOCKS_CACHE_KEY)).toBeNull();
    expect(vi.mocked(predictionService.create)).toHaveBeenCalledWith({
      ticker: 'AAPL',
      horizon: '3m',
    });
  });

  it('predict() maps 503 to the canonical "temporarily unavailable" message, ignoring the raw backend detail', async () => {
    vi.mocked(predictionService.create).mockRejectedValue(
      new ApiException({
        status: 503,
        title: 'MlServiceUnavailable',
        detail: 'raw backend message the user should not see',
      }),
    );

    const { result } = renderHook(() => usePrediction());
    await act(async () => {
      await result.current.predict('AAPL', '3m');
    });

    expect(result.current.error).toBe('Prediction service temporarily unavailable');
    expect(result.current.prediction).toBeNull();
  });

  it('predict() maps 501 to "not yet supported"', async () => {
    vi.mocked(predictionService.create).mockRejectedValue(
      new ApiException({
        status: 501,
        title: 'HorizonNotSupported',
        detail: 'backend detail',
      }),
    );

    const { result } = renderHook(() => usePrediction());
    await act(async () => {
      await result.current.predict('AAPL', '6m');
    });

    expect(result.current.error).toBe('This horizon is not yet supported');
  });

  it('predict() falls back to the backend detail for other ApiException statuses', async () => {
    vi.mocked(predictionService.create).mockRejectedValue(
      new ApiException({ status: 409, title: 'Conflict', detail: 'Already predicted today' }),
    );

    const { result } = renderHook(() => usePrediction());
    await act(async () => {
      await result.current.predict('AAPL', '3m');
    });

    expect(result.current.error).toBe('Already predicted today');
  });

  it('predict() does NOT clear the all-stocks cache on failure', async () => {
    sessionStorage.setItem(ALL_STOCKS_CACHE_KEY, '{"ts":1,"data":[]}');
    vi.mocked(predictionService.create).mockRejectedValue(
      new ApiException({ status: 503, title: 'x', detail: 'y' }),
    );

    const { result } = renderHook(() => usePrediction());
    await act(async () => {
      await result.current.predict('AAPL', '3m');
    });

    expect(sessionStorage.getItem(ALL_STOCKS_CACHE_KEY)).not.toBeNull();
  });

  it('fetch() accepts null (no cached prediction) without setting an error', async () => {
    vi.mocked(predictionService.getLatest).mockResolvedValue(null);

    const { result } = renderHook(() => usePrediction());
    await act(async () => {
      await result.current.fetch('AAPL', '3m');
    });

    expect(result.current.prediction).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('fetch() maps 503 to the canonical "temporarily unavailable" message', async () => {
    vi.mocked(predictionService.getLatest).mockRejectedValue(
      new ApiException({ status: 503, title: 'x', detail: 'y' }),
    );

    const { result } = renderHook(() => usePrediction());
    await act(async () => {
      await result.current.fetch('AAPL', '3m');
    });

    expect(result.current.error).toBe('Prediction service temporarily unavailable');
  });
});
