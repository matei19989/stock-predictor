import { useContext } from 'react';
import { RecentlyViewedContext } from '@/contexts/recentlyViewedContextValue';

export function useRecentlyViewed() {
  const ctx = useContext(RecentlyViewedContext);
  if (!ctx) throw new Error('useRecentlyViewed must be used within RecentlyViewedProvider');
  return ctx;
}
