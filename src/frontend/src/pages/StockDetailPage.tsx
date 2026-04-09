import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router';
import { toast } from 'sonner';
import * as stockService from '@/services/stockService';
import * as watchlistService from '@/services/watchlistService';
import { ApiException } from '@/services/api';
import { usePrediction } from '@/hooks/usePrediction';
import { useWatchlist } from '@/hooks/useWatchlist';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import StockHeader from '@/components/stock/StockHeader';
import StockChart from '@/components/stock/StockChart';
import PredictionCard from '@/components/stock/PredictionCard';
import PriceSummary from '@/components/stock/PriceSummary';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import type { StockDetail } from '@/types';

export default function StockDetailPage() {
  const { ticker } = useParams<{ ticker: string }>();
  useDocumentTitle(ticker ?? '');
  const [stock, setStock] = useState<StockDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isTogglingWatchlist, setIsTogglingWatchlist] = useState(false);

  const {
    prediction,
    isLoading: predIsLoading,
    isPredicting,
    error: predError,
    fetch: fetchPrediction,
    predict,
  } = usePrediction();

  const { items, refetch } = useWatchlist();
  const inWatchlist = items.some(i => i.ticker === ticker);

  useEffect(() => {
    if (!ticker) return;

    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const data = await stockService.getDetail(ticker!);
        setStock(data);
      } catch (err) {
        if (err instanceof ApiException && err.status === 404) {
          setError('not_found');
        } else {
          setError('Failed to load stock data');
        }
      } finally {
        setIsLoading(false);
      }
    }

    void load();
    void fetchPrediction(ticker);
  }, [ticker, fetchPrediction]);

  async function handleToggleWatchlist() {
    if (!ticker) return;
    setIsTogglingWatchlist(true);
    try {
      if (inWatchlist) {
        await watchlistService.remove(ticker);
        toast.success(`${ticker} removed from watchlist`);
      } else {
        await watchlistService.add(ticker);
        toast.success(`${ticker} added to watchlist`);
      }
      await refetch();
    } catch {
      toast.error('Failed to update watchlist');
    } finally {
      setIsTogglingWatchlist(false);
    }
  }

  if (error === 'not_found') {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <h2 className="text-2xl font-bold">Stock not found</h2>
        <p className="text-sm text-muted-foreground">
          The ticker &ldquo;{ticker}&rdquo; could not be found.
        </p>
        <Link to="/dashboard" className="text-primary underline">
          Go to Dashboard
        </Link>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-4 py-16">
        <p className="text-sm text-destructive">{error}</p>
        <Button
          variant="outline"
          onClick={() => {
            setError(null);
            setIsLoading(true);
            stockService.getDetail(ticker!).then(setStock).catch(() => {
              setError('Failed to load stock data');
            }).finally(() => setIsLoading(false));
          }}
        >
          Try again
        </Button>
      </div>
    );
  }

  if (isLoading || !stock) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between">
          <div className="space-y-2">
            <Skeleton className="h-9 w-32" />
            <Skeleton className="h-5 w-48" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-9 w-28" />
            <Skeleton className="h-5 w-20" />
          </div>
        </div>
        <Skeleton className="h-[400px] w-full" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Skeleton className="h-60" />
          <Skeleton className="h-60" />
        </div>
      </div>
    );
  }

  const latestPrice = stock.prices.length > 0
    ? Number(stock.prices[stock.prices.length - 1].close) : null;
  const prevClose = stock.prices.length > 1
    ? Number(stock.prices[stock.prices.length - 2].close) : null;
  const change1dPct = latestPrice != null && prevClose != null && prevClose !== 0
    ? ((latestPrice - prevClose) / prevClose) * 100 : null;

  return (
    <div className="space-y-6">
      <StockHeader
        ticker={stock.ticker}
        name={stock.name}
        sector={stock.sector}
        latestPrice={latestPrice}
        change1dPct={change1dPct}
        isInWatchlist={inWatchlist}
        onToggleWatchlist={handleToggleWatchlist}
        isTogglingWatchlist={isTogglingWatchlist}
      />
      <StockChart prices={stock.prices} isLoading={false} />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <PredictionCard
          prediction={prediction}
          isLoading={predIsLoading}
          isPredicting={isPredicting}
          error={predError}
          onPredict={(h) => predict(ticker!, h)}
        />
        <PriceSummary prices={stock.prices} />
      </div>
    </div>
  );
}
