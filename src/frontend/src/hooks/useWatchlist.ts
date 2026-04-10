import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import * as watchlistService from '@/services/watchlistService';
import type { WatchlistItem } from '@/types';

interface UseWatchlistReturn {
  items: WatchlistItem[];
  isLoading: boolean;
  error: string | null;
  remove: (ticker: string) => Promise<void>;
  refetch: () => Promise<void>;
}

export function useWatchlist(): UseWatchlistReturn {
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

  const remove = useCallback(async (ticker: string) => {
    // Capture current state for rollback
    let snapshot: WatchlistItem[] = [];
    setItems((prev) => {
      snapshot = prev;
      return prev.filter((item) => item.ticker !== ticker);
    });

    try {
      await watchlistService.remove(ticker);
      toast.success(`${ticker} removed from watchlist`);
    } catch {
      setItems(snapshot); // revert
      toast.error(`Failed to remove ${ticker}`);
    }
  }, []);

  return { items, isLoading, error, remove, refetch: fetchItems };
}
