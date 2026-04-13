import { ChartLine, TrendUp, Lightning } from '@phosphor-icons/react';
import SkeletonCard from '@/components/common/SkeletonCard';
import SignalBadge from '@/components/common/SignalBadge';
import { SIGNAL_ORDER, SIGNAL_DOT_COLORS } from '@/utils/constants';
import { cn } from '@/utils/cn';
import type { WatchlistItem } from '@/types';

interface SummaryCardsProps {
  items: WatchlistItem[];
  isLoading: boolean;
}

export default function SummaryCards({ items, isLoading }: SummaryCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 stagger-children">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-slide-up rounded-[1.5rem] bg-white/[0.03] p-1 ring-1 ring-white/[0.06]">
            <div className="rounded-[calc(1.5rem-0.25rem)] bg-white/[0.03] p-6">
              <SkeletonCard lines={3} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const signalCounts = SIGNAL_ORDER.reduce<Partial<Record<string, number>>>(
    (acc, signal) => {
      acc[signal] = items.filter((i) => i.latestSignal === signal).length;
      return acc;
    },
    {}
  );
  const noDataCount = items.filter((i) => i.latestSignal === null).length;

  const strongestBuy = items
    .filter((i) => i.latestSignal === 'Buy' || i.latestSignal === 'Strong Buy')
    .sort((a, b) => (b.signalConfidence ?? 0) - (a.signalConfidence ?? 0))[0] ?? null;

  const cards = [
    {
      icon: ChartLine,
      label: 'Stocks Tracked',
      content: (
        <p className="font-heading text-4xl font-bold tracking-[-0.04em] bg-gradient-to-b from-white to-gray-500 bg-clip-text text-transparent">
          {items.length}
        </p>
      ),
    },
    {
      icon: TrendUp,
      label: 'Signal Breakdown',
      content: (
        <div className="flex flex-wrap gap-x-3 gap-y-1.5 text-sm">
          {SIGNAL_ORDER.map((signal) =>
            (signalCounts[signal] ?? 0) > 0 ? (
              <span key={signal} className="flex items-center gap-1.5">
                <div className={cn('h-2 w-2 rounded-full', SIGNAL_DOT_COLORS[signal])} />
                <span className="text-gray-300">{signalCounts[signal]}</span>
                <span className="text-gray-500 text-xs">{signal}</span>
              </span>
            ) : null
          )}
          {noDataCount > 0 && (
            <span className="flex items-center gap-1.5 text-gray-600">
              <div className="h-2 w-2 rounded-full bg-gray-700" />
              {noDataCount} No data
            </span>
          )}
          {items.length === 0 && (
            <span className="text-gray-600">No stocks yet</span>
          )}
        </div>
      ),
    },
    {
      icon: Lightning,
      label: 'Strongest Buy',
      content: strongestBuy ? (
        <div className="flex flex-col gap-1.5">
          <p className="font-heading text-2xl font-bold tracking-[-0.03em]">{strongestBuy.ticker}</p>
          <div className="flex items-center gap-2">
            <SignalBadge signal={strongestBuy.latestSignal} />
            <span className="text-sm text-gray-500 tabular-nums">
              {((strongestBuy.signalConfidence ?? 0) * 100).toFixed(1)}%
            </span>
          </div>
        </div>
      ) : (
        <p className="text-sm text-gray-600">No buy signals yet</p>
      ),
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 stagger-children">
      {cards.map(({ icon: Icon, label, content }) => (
        <div key={label} className="animate-slide-up group">
          {/* Outer shell */}
          <div className="rounded-[1.5rem] bg-white/[0.03] p-1 ring-1 ring-white/[0.06] transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:ring-purple-500/15 hover:bg-white/[0.04]">
            {/* Inner core */}
            <div className="rounded-[calc(1.5rem-0.25rem)] bg-white/[0.03] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[11px] uppercase tracking-[0.15em] font-medium text-gray-500">
                  {label}
                </span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10 text-purple-400 transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:scale-110">
                  <Icon size={16} weight="light" />
                </div>
              </div>
              {content}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
