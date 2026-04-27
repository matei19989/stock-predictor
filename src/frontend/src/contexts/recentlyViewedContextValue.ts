import { createContext } from 'react';

export interface RecentlyViewedItem {
  ticker: string;
  name: string | null;
}

export interface RecentlyViewedContextValue {
  items: RecentlyViewedItem[];
  add: (ticker: string) => void;
}

export const RecentlyViewedContext = createContext<RecentlyViewedContextValue | null>(null);
