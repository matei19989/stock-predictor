import { Skeleton } from '@/components/ui/skeleton';
import { formatPrice } from '@/utils/formatters';
import { cn } from '@/utils/cn';
import type { StockSearchResult } from '@/types';

interface SearchDropdownProps {
  results: StockSearchResult[];
  isLoading: boolean;
  onSelect: (ticker: string) => void;
  onViewAll: () => void;
  activeIndex?: number;
}

export default function SearchDropdown({
  results,
  isLoading,
  onSelect,
  onViewAll,
  activeIndex = -1,
}: SearchDropdownProps) {
  if (isLoading) {
    return (
      <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-md border bg-popover shadow-lg">
        <div className="space-y-1 p-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-md border bg-popover shadow-lg">
        <p className="px-4 py-3 text-sm text-muted-foreground">No stocks found</p>
      </div>
    );
  }

  const visibleResults = results.slice(0, 5);

  return (
    <div
      className="absolute top-full left-0 right-0 z-50 mt-1 rounded-md border bg-popover shadow-lg"
      role="listbox"
    >
      {visibleResults.map((result, index) => (
        <div
          key={result.ticker}
          role="option"
          aria-selected={index === activeIndex}
          className={cn(
            'flex cursor-pointer items-center justify-between px-4 py-2 hover:bg-accent',
            index === activeIndex && 'bg-accent'
          )}
          onClick={() => onSelect(result.ticker)}
        >
          <div>
            <span className="font-semibold">{result.ticker}</span>
            <span className="ml-2 text-sm text-muted-foreground">{result.name}</span>
          </div>
          <div className="text-right text-sm">
            <span className="tabular-nums">{formatPrice(result.latestClose)}</span>
            {result.isInWatchlist && (
              <span className="ml-2 text-xs text-muted-foreground">In watchlist</span>
            )}
          </div>
        </div>
      ))}
      <div className="border-t px-4 py-2">
        <button
          className="text-sm text-primary hover:underline"
          onClick={() => onViewAll()}
        >
          View all results
        </button>
      </div>
    </div>
  );
}
