import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router';
import { ChartLine, ChartBar, Gear } from '@phosphor-icons/react';
import { useSidebar } from '@/contexts/SidebarContext';
import { cn } from '@/utils/cn';
import { useWatchlist } from '@/hooks/useWatchlist';
import SignalBadge from '@/components/common/SignalBadge';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';

export default function Sidebar() {
  const { isOpen, toggle, close } = useSidebar();
  const { items, isLoading } = useWatchlist();
  const location = useLocation();
  const [isMobile, setIsMobile] = useState(false);

  // Track viewport width
  useEffect(() => {
    const mql = window.matchMedia('(max-width: 1023px)');
    setIsMobile(mql.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  // Close mobile sidebar on navigation
  useEffect(() => {
    if (isMobile) close();
  }, [location.pathname, isMobile, close]);

  const sidebarContent = (
    <>
      {/* Navigation section */}
      <div className="py-4">
        <p className="text-xs uppercase font-semibold text-muted-foreground tracking-wider px-4 py-2">
          Navigation
        </p>
        <nav className="flex flex-col gap-1 px-2">
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-4 py-2 text-sm rounded-md hover:bg-accent',
                isActive && 'bg-accent font-medium'
              )
            }
          >
            <ChartLine size={16} />
            Dashboard
          </NavLink>
          <NavLink
            to="/predictions"
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-4 py-2 text-sm rounded-md hover:bg-accent',
                isActive && 'bg-accent font-medium'
              )
            }
          >
            <ChartBar size={16} />
            Predictions
          </NavLink>
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-4 py-2 text-sm rounded-md hover:bg-accent',
                isActive && 'bg-accent font-medium'
              )
            }
          >
            <Gear size={16} />
            Settings
          </NavLink>
        </nav>
      </div>

      <div className="mt-auto border-t pt-3">
        <p className="mb-2 px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Watchlist
        </p>
        <div className="max-h-64 overflow-y-auto">
          {isLoading ? (
            <div className="space-y-2 px-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-4 w-full" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <p className="px-4 text-xs text-muted-foreground">No stocks yet</p>
          ) : (
            items.map((item) => (
              <NavLink
                key={item.ticker}
                to={`/stocks/${item.ticker}`}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2 px-4 py-1.5 text-sm hover:bg-accent',
                    isActive && 'bg-accent font-medium'
                  )
                }
              >
                <SignalBadge signal={item.latestSignal} size="sm" />
                <span>{item.ticker}</span>
              </NavLink>
            ))
          )}
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop inline sidebar */}
      <aside
        className={cn(
          'hidden lg:flex flex-col w-64 border-r bg-card shrink-0',
          !isOpen && 'lg:hidden'
        )}
      >
        {sidebarContent}
      </aside>

      {/* Mobile sheet sidebar */}
      <Sheet open={isOpen && isMobile} onOpenChange={toggle}>
        <SheetContent side="left" className="w-64 p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          {sidebarContent}
        </SheetContent>
      </Sheet>
    </>
  );
}
