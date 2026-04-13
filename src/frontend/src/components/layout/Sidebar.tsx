import { useEffect, useState, useRef, useCallback } from 'react';
import { NavLink, useLocation } from 'react-router';
import { ChartLine, ChartBar, Gear, SquaresFour } from '@phosphor-icons/react';
import { useSidebar } from '@/contexts/SidebarContext';
import { cn } from '@/utils/cn';
import { useWatchlist } from '@/contexts/WatchlistContext';
import SignalBadge from '@/components/common/SignalBadge';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import RecentlyViewed from '@/components/layout/RecentlyViewed';
import PortfolioPulse from '@/components/layout/PortfolioPulse';

const NAV_ITEMS = [
  { to: '/dashboard', icon: ChartLine, label: 'Dashboard' },
  { to: '/stocks', icon: SquaresFour, label: 'All Stocks' },
  { to: '/predictions', icon: ChartBar, label: 'Predictions' },
  { to: '/settings', icon: Gear, label: 'Settings' },
] as const;

const DIVIDER_STORAGE_KEY = 'sp_sidebar_divider';
const DEFAULT_WATCHLIST_HEIGHT = 240;
const MIN_WATCHLIST_HEIGHT = 80;
const MAX_WATCHLIST_HEIGHT = 500;

export default function Sidebar() {
  const { isOpen, toggle, close } = useSidebar();
  const { items, isLoading } = useWatchlist();
  const location = useLocation();
  const [isMobile, setIsMobile] = useState(
    () => window.matchMedia('(max-width: 1023px)').matches,
  );

  // Draggable divider state
  const [watchlistHeight, setWatchlistHeight] = useState(() => {
    try {
      const saved = localStorage.getItem(DIVIDER_STORAGE_KEY);
      return saved ? Number(saved) : DEFAULT_WATCHLIST_HEIGHT;
    } catch { return DEFAULT_WATCHLIST_HEIGHT; }
  });
  const isDragging = useRef(false);
  const startY = useRef(0);
  const startHeight = useRef(0);

  useEffect(() => {
    const mql = window.matchMedia('(max-width: 1023px)');
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    if (isMobile) close();
  }, [location.pathname, isMobile, close]);

  const handleDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    startY.current = e.clientY;
    startHeight.current = watchlistHeight;
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
  }, [watchlistHeight]);

  useEffect(() => {
    function handleMouseMove(e: MouseEvent) {
      if (!isDragging.current) return;
      const delta = startY.current - e.clientY;
      const newHeight = Math.max(MIN_WATCHLIST_HEIGHT, Math.min(MAX_WATCHLIST_HEIGHT, startHeight.current + delta));
      setWatchlistHeight(newHeight);
    }

    function handleMouseUp() {
      if (!isDragging.current) return;
      isDragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      try { localStorage.setItem(DIVIDER_STORAGE_KEY, String(watchlistHeight)); } catch {}
    }

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [watchlistHeight]);

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Navigation */}
      <div className="py-5 px-3">
        <p className="px-3 mb-2 text-[10px] uppercase font-medium tracking-[0.2em] text-gray-500">
          Navigation
        </p>
        <nav className="flex flex-col gap-0.5">
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'group flex items-center gap-3 px-3 py-2.5 text-sm rounded-xl transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]',
                  isActive
                    ? 'bg-white/[0.06] text-white font-medium shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]'
                    : 'text-gray-400 hover:text-white hover:bg-white/[0.04]'
                )
              }
            >
              <Icon
                size={16}
                weight="light"
                className="transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:scale-110"
              />
              {label}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Recently Viewed */}
      <RecentlyViewed />

      {/* Portfolio Pulse */}
      <PortfolioPulse />

      {/* Spacer pushes watchlist to bottom */}
      <div className="flex-1 min-h-0" />

      {/* Draggable divider */}
      <div
        onMouseDown={handleDragStart}
        className="group relative flex-shrink-0 h-3 cursor-row-resize flex items-center justify-center"
      >
        <div className="absolute inset-x-3 h-px bg-white/[0.06] group-hover:bg-purple-500/30 transition-colors duration-300" />
        <div className="relative w-8 h-1 rounded-full bg-white/[0.08] group-hover:bg-purple-500/40 transition-colors duration-300" />
      </div>

      {/* Watchlist — height controlled by drag */}
      <div className="flex-shrink-0 pb-4 px-3" style={{ height: watchlistHeight }}>
        <p className="px-3 mb-2 text-[10px] uppercase font-medium tracking-[0.2em] text-gray-500">
          Watchlist
          {!isLoading && items.length > 0 && (
            <span className="ml-1 text-gray-600">{items.length}</span>
          )}
        </p>
        <div className="h-[calc(100%-24px)] overflow-y-auto space-y-0.5">
          {isLoading ? (
            <div className="space-y-2 px-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-4 w-full rounded-lg bg-white/[0.04]" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <p className="px-3 text-xs text-gray-600">No stocks yet</p>
          ) : (
            items.map((item) => (
              <NavLink
                key={item.ticker}
                to={`/stocks/${item.ticker}`}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]',
                    isActive
                      ? 'bg-white/[0.06] text-white font-medium'
                      : 'text-gray-400 hover:text-white hover:bg-white/[0.04]'
                  )
                }
              >
                <SignalBadge signal={item.latestSignal} size="sm" />
                <span className="truncate">{item.ticker}</span>
              </NavLink>
            ))
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          'hidden lg:flex flex-col w-64 shrink-0 border-r border-white/[0.06] bg-white/[0.02]',
          !isOpen && 'lg:hidden'
        )}
      >
        {sidebarContent}
      </aside>

      {/* Mobile sheet */}
      <Sheet open={isOpen && isMobile} onOpenChange={toggle}>
        <SheetContent side="left" className="w-64 p-0 border-r border-white/[0.06] bg-[#0a0b10]">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          {sidebarContent}
        </SheetContent>
      </Sheet>
    </>
  );
}
