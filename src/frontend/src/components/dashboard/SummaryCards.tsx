import { ChartLine, TrendUp, Lightning } from '@phosphor-icons/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[1, 2, 3].map((i) => <SkeletonCard key={i} lines={3} />)}
      </div>
    );
  }

  // Signal distribution counts
  const signalCounts = SIGNAL_ORDER.reduce<Partial<Record<string, number>>>(
    (acc, signal) => {
      acc[signal] = items.filter((i) => i.latestSignal === signal).length;
      return acc;
    },
    {}
  );
  const noDataCount = items.filter((i) => i.latestSignal === null).length;

  // Strongest buy signal
  const strongestBuy = items
    .filter((i) => i.latestSignal === 'Buy' || i.latestSignal === 'Strong Buy')
    .sort((a, b) => (b.signalConfidence ?? 0) - (a.signalConfidence ?? 0))[0] ?? null;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {/* Card 1: Stocks Tracked */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Stocks Tracked
          </CardTitle>
          <ChartLine size={20} className="text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold">{items.length}</p>
        </CardContent>
      </Card>

      {/* Card 2: Signal Breakdown */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Signal Breakdown
          </CardTitle>
          <TrendUp size={20} className="text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm">
            {SIGNAL_ORDER.map((signal) =>
              (signalCounts[signal] ?? 0) > 0 ? (
                <span key={signal} className="flex items-center gap-1">
                  <div className={cn('h-2 w-2 rounded-full', SIGNAL_DOT_COLORS[signal])} />
                  {signalCounts[signal]} {signal}
                </span>
              ) : null
            )}
            {noDataCount > 0 && (
              <span className="flex items-center gap-1 text-muted-foreground">
                <div className="h-2 w-2 rounded-full bg-muted" />
                {noDataCount} No data
              </span>
            )}
            {items.length === 0 && (
              <span className="text-muted-foreground">No stocks yet</span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Card 3: Strongest Signal */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Strongest Buy
          </CardTitle>
          <Lightning size={20} className="text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {strongestBuy ? (
            <div className="flex flex-col gap-1">
              <p className="text-xl font-bold">{strongestBuy.ticker}</p>
              <div className="flex items-center gap-2">
                <SignalBadge signal={strongestBuy.latestSignal} />
                <span className="text-sm text-muted-foreground">
                  {((strongestBuy.signalConfidence ?? 0) * 100).toFixed(1)}% confidence
                </span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No buy signals yet</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
