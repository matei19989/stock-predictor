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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    stockService
      .search(query.trim())
      .then(setResults)
      .catch(() => setError('Failed to load search results. Please try again.'))
      .finally(() => setIsLoading(false));
  }, [query]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Search Results</h1>
        {query && (
          <p className="text-sm text-muted-foreground">
            Results for &ldquo;{query}&rdquo;
          </p>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-lg" />
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
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((r) => (
            <SearchResultCard key={r.ticker} result={r} />
          ))}
        </div>
      )}
    </div>
  );
}
