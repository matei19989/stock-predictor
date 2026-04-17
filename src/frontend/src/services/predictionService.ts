import api from './api';
import { ApiException } from './api';
import type { PredictRequest, Prediction, UserPrediction } from '@/types';

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
      return null;
    }
    throw err;
  }
}

export async function getUserPredictionCount(): Promise<number> {
  const { data } = await api.get<{ count: number }>('/api/predictions/user/count');
  return data.count;
}

export async function getUserPredicted(): Promise<UserPrediction[]> {
  const { data } = await api.get<UserPrediction[]>('/api/predictions/user/predicted');
  return data;
}
