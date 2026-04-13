import { createContext } from 'react';
import type { WatchlistItem } from '@/types';

export interface WatchlistContextValue {
  items: WatchlistItem[];
  isLoading: boolean;
  error: string | null;
  add: (ticker: string) => Promise<void>;
  remove: (ticker: string) => Promise<void>;
  refetch: () => Promise<void>;
}

export const WatchlistContext = createContext<WatchlistContextValue | null>(null);
