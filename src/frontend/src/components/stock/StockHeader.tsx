import { Star } from '@phosphor-icons/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatPrice, formatPct } from '@/utils/formatters';

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
    <div className="flex flex-row justify-between items-start">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold">{ticker}</h1>
        {name && <p className="text-lg text-muted-foreground">{name}</p>}
        {sector && <Badge variant="secondary">{sector}</Badge>}
      </div>

      <div className="flex flex-col items-end gap-2">
        <div className="text-right">
          <p className="text-3xl font-bold tabular-nums">{formatPrice(latestPrice)}</p>
          {change1dPct != null && (
            <p
              className={`text-sm font-medium tabular-nums ${
                change1dPct >= 0 ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {formatPct(change1dPct)}
            </p>
          )}
        </div>

        <Button
          variant={isInWatchlist ? 'default' : 'outline'}
          size="sm"
          onClick={onToggleWatchlist}
          disabled={isTogglingWatchlist}
        >
          <Star
            weight={isInWatchlist ? 'fill' : 'regular'}
            className="mr-1.5 h-4 w-4"
          />
          {isInWatchlist ? 'In Watchlist' : 'Add to Watchlist'}
        </Button>
      </div>
    </div>
  );
}
