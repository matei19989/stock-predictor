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
