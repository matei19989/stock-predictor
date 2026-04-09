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
