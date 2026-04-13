import { TrendUp, TrendDown } from '@phosphor-icons/react';
import { useWatchlist } from '@/contexts/WatchlistContext';
import { formatPct } from '@/utils/formatters';
import type { WatchlistItem } from '@/types';

function getSentimentSegments(items: WatchlistItem[]) {
  let bullish = 0;
  let neutral = 0;
  let bearish = 0;
  let noData = 0;

  for (const item of items) {
    const s = item.latestSignal;
    if (s === 'Strong Buy' || s === 'Buy') bullish++;
    else if (s === 'Hold') neutral++;
    else if (s === 'Sell' || s === 'Strong Sell') bearish++;
    else noData++;
  }

  const total = items.length;
  if (total === 0) return [];

  const segments: { color: string; pct: number }[] = [];
  if (bullish > 0) segments.push({ color: 'bg-emerald-500', pct: (bullish / total) * 100 });
  if (neutral > 0) segments.push({ color: 'bg-amber-500', pct: (neutral / total) * 100 });
  if (bearish > 0) segments.push({ color: 'bg-red-500', pct: (bearish / total) * 100 });
  if (noData > 0) segments.push({ color: 'bg-gray-600', pct: (noData / total) * 100 });

  return segments;
}

function getTopMover(items: WatchlistItem[]): WatchlistItem | null {
  return items
    .filter((i) => i.change1dPct != null)
    .sort((a, b) => Math.abs(b.change1dPct!) - Math.abs(a.change1dPct!))[0] ?? null;
}

function getAvgConfidence(items: WatchlistItem[]): number | null {
  const withSignal = items.filter((i) => i.signalConfidence != null);
  if (withSignal.length === 0) return null;
  const sum = withSignal.reduce((acc, i) => acc + (i.signalConfidence ?? 0), 0);
  return sum / withSignal.length;
}

export default function PortfolioPulse() {
  const { items, isLoading } = useWatchlist();

  if (isLoading || items.length === 0) return null;

  const segments = getSentimentSegments(items);
  const topMover = getTopMover(items);
  const avgConf = getAvgConfidence(items);

  return (
    <div className="py-3 px-3">
      <p className="px-3 mb-3 text-[10px] uppercase font-medium tracking-[0.2em] text-gray-500">
        Portfolio Pulse
      </p>
      <div className="px-3 space-y-3">
        {/* Sentiment bar */}
        <div className="flex h-1 w-full overflow-hidden rounded-full">
          {segments.map(({ color, pct }, i) => (
            <div
              key={i}
              className={`${color} transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]`}
              style={{ width: `${pct}%` }}
            />
          ))}
        </div>

        {/* Top mover */}
        {topMover && (
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-gray-500">Top mover</span>
            <span className="flex items-center gap-1.5 text-[11px] font-medium">
              <span className="text-gray-300">{topMover.ticker}</span>
              {topMover.change1dPct != null && (
                <span className={`flex items-center gap-0.5 ${topMover.change1dPct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {topMover.change1dPct >= 0 ? <TrendUp size={10} weight="bold" /> : <TrendDown size={10} weight="bold" />}
                  {formatPct(topMover.change1dPct)}
                </span>
              )}
            </span>
          </div>
        )}

        {/* Avg confidence */}
        {avgConf != null && (
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-gray-500">Avg confidence</span>
            <span className="text-[11px] font-medium text-gray-300 tabular-nums">
              {(avgConf * 100).toFixed(1)}%
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
