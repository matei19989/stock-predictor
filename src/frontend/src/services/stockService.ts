import api from './api';
import type { StockSearchResult, StockDetail, StockOverview } from '@/types';

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

export async function getAll(): Promise<StockOverview[]> {
  const { data } = await api.get<StockOverview[]>('/api/stocks');
  return data;
}

export async function recordVisit(ticker: string): Promise<void> {
  await api.post(`/api/stocks/${ticker}/visit`);
}

export async function getRecentlyViewed(): Promise<{ ticker: string; name: string | null }[]> {
  const { data } = await api.get<{ ticker: string; name: string | null }[]>('/api/stocks/recently-viewed');
  return data;
}
