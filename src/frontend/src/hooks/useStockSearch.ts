import { useState, useEffect, useRef } from 'react';
import * as stockService from '@/services/stockService';
import type { StockSearchResult } from '@/types';

interface UseStockSearchReturn {
  results: StockSearchResult[];
  isLoading: boolean;
}

export function useStockSearch(query: string, enabled = true): UseStockSearchReturn {
  const [results, setResults] = useState<StockSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (!enabled || query.trim().length < 1) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    clearTimeout(timeoutRef.current);

    timeoutRef.current = setTimeout(async () => {
      try {
        const data = await stockService.search(query.trim());
        setResults(data);
      } catch {
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(timeoutRef.current);
  }, [query, enabled]);

  return { results, isLoading };
}
