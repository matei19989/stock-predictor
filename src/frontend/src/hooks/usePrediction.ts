import { useState, useCallback } from 'react';
import { notifySuccess } from '@/utils/notify';
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
      notifySuccess('Prediction generated');
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
