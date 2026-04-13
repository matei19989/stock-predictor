import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import * as watchlistService from '@/services/watchlistService';
import type { WatchlistItem } from '@/types';
import type { ReactNode } from 'react';
import { WatchlistContext } from './watchlistContextValue';

export function WatchlistProvider({ children }: { children: ReactNode }) {
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

  const add = useCallback(async (ticker: string) => {
    try {
      await watchlistService.add(ticker);
      toast.success(`${ticker} added to watchlist`);
      await fetchItems();
    } catch {
      toast.error(`Failed to add ${ticker}`);
    }
  }, [fetchItems]);

  const remove = useCallback(async (ticker: string) => {
    let snapshot: WatchlistItem[] = [];
    setItems((prev) => {
      snapshot = prev;
      return prev.filter((item) => item.ticker !== ticker);
    });

    try {
      await watchlistService.remove(ticker);
      toast.success(`${ticker} removed from watchlist`);
    } catch {
      setItems(snapshot);
      toast.error(`Failed to remove ${ticker}`);
    }
  }, []);

  return (
    <WatchlistContext value={{ items, isLoading, error, add, remove, refetch: fetchItems }}>
      {children}
    </WatchlistContext>
  );
}
