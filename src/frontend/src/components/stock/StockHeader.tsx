import { Star } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { formatPrice, formatPct } from '@/utils/formatters';
import { cn } from '@/utils/cn';

interface StockHeaderProps {
  ticker: string;
  name: string | null;
  sector: string | null;
  latestPrice: number | null;
  change1dPct: number | null;
  isInWatchlist: boolean;
  onToggleWatchlist: () => void;
  isTogglingWatchlist: boolean;
}

export default function StockHeader({
  ticker,
  name,
  sector,
  latestPrice,
  change1dPct,
  isInWatchlist,
  onToggleWatchlist,
  isTogglingWatchlist,
}: StockHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
      <div className="space-y-2">
        {sector && (
          <span className="inline-block rounded-full bg-purple-500/10 border border-purple-500/20 px-3 py-1 text-[10px] uppercase tracking-[0.2em] font-medium text-purple-400">
            {sector}
          </span>
        )}
        <h1 className="font-heading text-4xl font-bold tracking-[-0.04em] bg-gradient-to-b from-white to-gray-400 bg-clip-text text-transparent">
          {ticker}
        </h1>
        {name && <p className="text-lg text-gray-400 font-light">{name}</p>}
      </div>

      <div className="flex flex-col items-end gap-3">
        <div className="text-right">
          <p className="font-heading text-4xl font-bold tracking-[-0.04em] tabular-nums">
            {formatPrice(latestPrice)}
          </p>
          {change1dPct != null && (
            <p
              className={cn(
                'text-sm font-medium tabular-nums mt-1',
                change1dPct >= 0 ? 'text-green-400' : 'text-red-400'
              )}
            >
              {formatPct(change1dPct)}
            </p>
          )}
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleWatchlist}
          disabled={isTogglingWatchlist}
          className={cn(
            'rounded-xl px-4 h-9 text-sm transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.97]',
            isInWatchlist
              ? 'bg-purple-500/15 text-purple-300 border border-purple-500/25 hover:bg-purple-500/20'
              : 'border border-white/[0.08] text-gray-400 hover:text-white hover:bg-white/[0.06]'
          )}
        >
          <Star
            weight={isInWatchlist ? 'fill' : 'light'}
            className="mr-1.5 h-4 w-4"
          />
          {isInWatchlist ? 'In Watchlist' : 'Add to Watchlist'}
        </Button>
      </div>
    </div>
  );
}
