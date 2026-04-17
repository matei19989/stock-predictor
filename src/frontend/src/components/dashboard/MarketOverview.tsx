import { TrendUp, TrendDown, Minus } from '@phosphor-icons/react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/utils/cn';
import { formatPct } from '@/utils/formatters';
import { SIGNAL_ORDER } from '@/utils/constants';
import type { WatchlistItem } from '@/types';

interface MarketOverviewProps {
  items: WatchlistItem[];
  isLoading: boolean;
}

export default function MarketOverview({ items, isLoading }: MarketOverviewProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 stagger-children">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-slide-up">
            <div className="rounded-[1.5rem] bg-white/[0.03] p-1 ring-1 ring-white/[0.06]">
              <div className="rounded-[calc(1.5rem-0.25rem)] bg-white/[0.03] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                <Skeleton className="mb-4 h-3 w-28 rounded bg-white/[0.04]" />
                <div className="space-y-2.5">
                  <Skeleton className="h-4 w-full rounded bg-white/[0.04]" />
                  <Skeleton className="h-4 w-5/6 rounded bg-white/[0.04]" />
                  <Skeleton className="h-4 w-2/3 rounded bg-white/[0.04]" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (items.length === 0) return null;

  const gainers = [...items]
    .filter((i) => i.change1dPct != null && i.change1dPct > 0)
    .sort((a, b) => (b.change1dPct ?? 0) - (a.change1dPct ?? 0))
    .slice(0, 3);

  const losers = [...items]
    .filter((i) => i.change1dPct != null && i.change1dPct < 0)
    .sort((a, b) => (a.change1dPct ?? 0) - (b.change1dPct ?? 0))
    .slice(0, 3);

  // Signal distribution for a mini chart
  const signalDist = SIGNAL_ORDER.map((signal) => ({
    signal,
    count: items.filter((i) => i.latestSignal === signal).length,
  }));
  const maxCount = Math.max(...signalDist.map((d) => d.count), 1);

  const signalBarColors: Record<string, string> = {
    'Strong Buy': 'bg-emerald-500',
    'Buy': 'bg-green-500',
    'Hold': 'bg-amber-500',
    'Sell': 'bg-orange-500',
    'Strong Sell': 'bg-red-500',
  };

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 stagger-children">
      {/* Top Gainers */}
      <div className="animate-slide-up">
        <div className="rounded-[1.5rem] bg-white/[0.03] p-1 ring-1 ring-white/[0.06]">
          <div className="rounded-[calc(1.5rem-0.25rem)] bg-white/[0.03] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <div className="flex items-center gap-2 mb-4">
              <TrendUp size={14} weight="bold" className="text-green-400" />
              <span className="text-[11px] uppercase tracking-[0.15em] font-medium text-gray-500">
                Top Gainers
              </span>
            </div>
            {gainers.length === 0 ? (
              <p className="text-xs text-gray-600">No gainers today</p>
            ) : (
              <div className="space-y-2.5">
                {gainers.map((item) => (
                  <div key={item.ticker} className="flex items-center justify-between">
                    <span className="text-sm font-medium">{item.ticker}</span>
                    <span className="text-sm tabular-nums text-green-400 font-medium">
                      {formatPct(item.change1dPct)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Top Losers */}
      <div className="animate-slide-up">
        <div className="rounded-[1.5rem] bg-white/[0.03] p-1 ring-1 ring-white/[0.06]">
          <div className="rounded-[calc(1.5rem-0.25rem)] bg-white/[0.03] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <div className="flex items-center gap-2 mb-4">
              <TrendDown size={14} weight="bold" className="text-red-400" />
              <span className="text-[11px] uppercase tracking-[0.15em] font-medium text-gray-500">
                Top Losers
              </span>
            </div>
            {losers.length === 0 ? (
              <p className="text-xs text-gray-600">No losers today</p>
            ) : (
              <div className="space-y-2.5">
                {losers.map((item) => (
                  <div key={item.ticker} className="flex items-center justify-between">
                    <span className="text-sm font-medium">{item.ticker}</span>
                    <span className="text-sm tabular-nums text-red-400 font-medium">
                      {formatPct(item.change1dPct)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Signal Distribution — Vertical Bar Chart */}
      <div className="animate-slide-up">
        <div className="rounded-[1.5rem] bg-white/[0.03] p-1 ring-1 ring-white/[0.06]">
          <div className="rounded-[calc(1.5rem-0.25rem)] bg-white/[0.03] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <div className="flex items-center gap-2 mb-4">
              <Minus size={14} weight="bold" className="text-purple-400" />
              <span className="text-[11px] uppercase tracking-[0.15em] font-medium text-gray-500">
                Signal Distribution
              </span>
            </div>
            <div className="flex items-end justify-between gap-3 h-[140px] pt-6">
              {signalDist.map(({ signal, count }) => (
                <div key={signal} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                  <span className="text-[11px] tabular-nums text-gray-400 font-medium">
                    {count}
                  </span>
                  <div
                    className={cn(
                      'w-full rounded-t-lg transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] min-h-[4px]',
                      signalBarColors[signal],
                      count === 0 && 'opacity-20'
                    )}
                    style={{ height: `${maxCount > 0 ? Math.max((count / maxCount) * 100, 4) : 4}%` }}
                  />
                  <span className="text-[9px] text-gray-500 text-center leading-tight whitespace-nowrap">
                    {signal.replace('Strong ', 'S.')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
