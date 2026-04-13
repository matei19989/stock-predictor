import { NavLink } from 'react-router';
import { useRecentlyViewed } from '@/hooks/useRecentlyViewed';
import { useWatchlist } from '@/hooks/useWatchlist';
import SignalBadge from '@/components/common/SignalBadge';
import { cn } from '@/utils/cn';

export default function RecentlyViewed() {
  const { items } = useRecentlyViewed();
  const { items: watchlistItems } = useWatchlist();

  if (items.length === 0) return null;

  return (
    <div className="py-3 px-3">
      <p className="px-3 mb-2 text-[10px] uppercase font-medium tracking-[0.2em] text-gray-500">
        Recently Viewed
      </p>
      <div className="flex flex-col gap-0.5">
        {items.map(({ ticker }) => {
          const watchlistMatch = watchlistItems.find((w) => w.ticker === ticker);
          return (
            <NavLink
              key={ticker}
              to={`/stocks/${ticker}`}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]',
                  isActive
                    ? 'bg-white/[0.06] text-white font-medium'
                    : 'text-gray-400 hover:text-white hover:bg-white/[0.04]',
                )
              }
            >
              <SignalBadge signal={watchlistMatch?.latestSignal ?? null} size="sm" />
              <span className="truncate">{ticker}</span>
            </NavLink>
          );
        })}
      </div>
    </div>
  );
}
