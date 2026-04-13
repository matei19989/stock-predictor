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
      <div className="absolute top-full left-0 right-0 z-50 mt-2 rounded-xl bg-[#111420] border border-white/[0.08] shadow-[0_8px_40px_rgba(0,0,0,0.6)] p-2">
        <div className="space-y-1">
          <Skeleton className="h-10 w-full rounded-lg bg-white/[0.04]" />
          <Skeleton className="h-10 w-full rounded-lg bg-white/[0.04]" />
          <Skeleton className="h-10 w-full rounded-lg bg-white/[0.04]" />
        </div>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="absolute top-full left-0 right-0 z-50 mt-2 rounded-xl bg-[#111420] border border-white/[0.08] shadow-[0_8px_40px_rgba(0,0,0,0.6)]">
        <p className="px-4 py-3 text-sm text-gray-500">No stocks found</p>
      </div>
    );
  }

  const visibleResults = results.slice(0, 5);

  return (
    <div
      className="absolute top-full left-0 right-0 z-50 mt-2 rounded-xl bg-[#111420] border border-white/[0.08] shadow-[0_8px_40px_rgba(0,0,0,0.6)] overflow-hidden"
      role="listbox"
    >
      {visibleResults.map((result, index) => (
        <div
          key={result.ticker}
          role="option"
          aria-selected={index === activeIndex}
          className={cn(
            'flex cursor-pointer items-center justify-between px-4 py-2.5 transition-colors duration-200 ease-[cubic-bezier(0.32,0.72,0,1)]',
            index === activeIndex
              ? 'bg-white/[0.06]'
              : 'hover:bg-white/[0.04]'
          )}
          onClick={() => onSelect(result.ticker)}
        >
          <div>
            <span className="font-semibold text-sm text-white">{result.ticker}</span>
            <span className="ml-2 text-xs text-gray-500">{result.name}</span>
          </div>
          <div className="text-right text-sm">
            <span className="tabular-nums text-gray-300">{formatPrice(result.latestClose)}</span>
            {result.isInWatchlist && (
              <span className="ml-2 text-[10px] text-purple-400 uppercase tracking-wider">Watching</span>
            )}
          </div>
        </div>
      ))}
      <div className="border-t border-white/[0.06] px-4 py-2.5">
        <button
          className="text-xs text-purple-400 hover:text-purple-300 transition-colors duration-300"
          onClick={() => onViewAll()}
        >
          View all results →
        </button>
      </div>
    </div>
  );
}
