import { useState, useEffect, useCallback } from 'react';
import * as stockService from '@/services/stockService';

const MAX_ITEMS = 5;

interface RecentlyViewedItem {
  ticker: string;
  name: string | null;
}

export function useRecentlyViewed() {
  const [items, setItems] = useState<RecentlyViewedItem[]>([]);

  useEffect(() => {
    stockService.getRecentlyViewed()
      .then(setItems)
      .catch(() => {});
  }, []);

  const add = useCallback((ticker: string) => {
    // Optimistically update local state
    setItems((prev) => {
      const filtered = prev.filter((i) => i.ticker !== ticker);
      return [{ ticker, name: null }, ...filtered].slice(0, MAX_ITEMS);
    });

    // Fire-and-forget API call
    stockService.recordVisit(ticker).catch(() => {});
  }, []);

  return { items, add };
}
