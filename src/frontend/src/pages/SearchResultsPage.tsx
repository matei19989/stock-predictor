import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import * as stockService from '@/services/stockService';
import SearchResultCard from '@/components/search/SearchResultCard';
import EmptyState from '@/components/common/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import type { StockSearchResult } from '@/types';

export default function SearchResultsPage() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') ?? '';
  useDocumentTitle(query ? `Search: ${query}` : 'Search');
  const [results, setResults] = useState<StockSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(!!query.trim());
  const [error, setError] = useState<string | null>(null);
  const [prevQuery, setPrevQuery] = useState(query);

  if (query !== prevQuery) {
    setPrevQuery(query);
    if (query.trim()) {
      setIsLoading(true);
      setError(null);
    } else {
      setResults([]);
      setError(null);
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (!query.trim()) return;

    let cancelled = false;
    stockService
      .search(query.trim())
      .then((data) => { if (!cancelled) setResults(data); })
      .catch(() => { if (!cancelled) setError('Failed to load search results. Please try again.'); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [query]);

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-slide-up">
      <div className="space-y-2">
        <span className="inline-block rounded-full bg-purple-500/10 border border-purple-500/20 px-3 py-1 text-[10px] uppercase tracking-[0.2em] font-medium text-purple-400">
          Search
        </span>
        <h1 className="font-heading text-3xl font-bold tracking-[-0.03em]">Search Results</h1>
        {query && (
          <p className="text-sm text-gray-500">
            Results for &ldquo;{query}&rdquo;
          </p>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 stagger-children">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="animate-slide-up rounded-[1.5rem] bg-white/[0.03] p-1 ring-1 ring-white/[0.06]">
              <div className="rounded-[calc(1.5rem-0.25rem)] bg-white/[0.03] p-5">
                <Skeleton className="h-16 w-full rounded-lg bg-white/[0.04]" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <EmptyState
          title="Something went wrong"
          description={error}
        />
      ) : results.length === 0 ? (
        <EmptyState
          title={query ? `No stocks found for "${query}"` : 'Search for stocks'}
          description={
            query
              ? 'Try a different ticker or company name.'
              : 'Use the search bar to find S&P 500 stocks.'
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 stagger-children">
          {results.map((r) => (
            <div key={r.ticker} className="animate-slide-up">
              <SearchResultCard result={r} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
