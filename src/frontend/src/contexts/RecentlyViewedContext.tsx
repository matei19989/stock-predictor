import { useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import * as stockService from '@/services/stockService';
import {
  RecentlyViewedContext,
  type RecentlyViewedItem,
} from './recentlyViewedContextValue';

const MAX_ITEMS = 5;

export function RecentlyViewedProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<RecentlyViewedItem[]>([]);

  useEffect(() => {
    stockService.getRecentlyViewed()
      .then(setItems)
      .catch(() => {});
  }, []);

  const add = useCallback((ticker: string) => {
    setItems((prev) => {
      const filtered = prev.filter((i) => i.ticker !== ticker);
      return [{ ticker, name: null }, ...filtered].slice(0, MAX_ITEMS);
    });

    stockService.recordVisit(ticker)
      .then(() => stockService.getRecentlyViewed())
      .then(setItems)
      .catch(() => {});
  }, []);

  return (
    <RecentlyViewedContext value={{ items, add }}>
      {children}
    </RecentlyViewedContext>
  );
}
