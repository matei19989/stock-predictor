import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router';
import * as stockService from '@/services/stockService';
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
import type { StockDetail, Horizon } from '@/types';
import { useRecentlyViewed } from '@/hooks/useRecentlyViewed';

export default function StockDetailPage() {
  const { ticker } = useParams<{ ticker: string }>();
  useDocumentTitle(ticker ?? '');
  const [stock, setStock] = useState<StockDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isTogglingWatchlist, setIsTogglingWatchlist] = useState(false);
  const [horizon, setHorizon] = useState<Horizon>('3m');

  const {
    prediction,
    isLoading: predIsLoading,
    isPredicting,
    error: predError,
    fetch: fetchPrediction,
    predict,
  } = usePrediction();

  const { items, add: addToWatchlist, remove: removeFromWatchlist } = useWatchlist();
  const inWatchlist = items.some(i => i.ticker === ticker);

  const { add: addRecentlyViewed } = useRecentlyViewed();

  useEffect(() => {
    if (!ticker) return;
    addRecentlyViewed(ticker);

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
  }, [ticker, addRecentlyViewed]);

  // Re-fetch the prediction whenever the ticker or the selected horizon changes.
  // If no prediction exists for the new horizon the hook sets prediction=null and
  // the card falls back to its "No prediction yet" empty state.
  useEffect(() => {
    if (!ticker) return;
    void fetchPrediction(ticker, horizon);
  }, [ticker, horizon, fetchPrediction]);

  async function handleToggleWatchlist() {
    if (!ticker) return;
    setIsTogglingWatchlist(true);
    try {
      if (inWatchlist) {
        await removeFromWatchlist(ticker);
      } else {
        await addToWatchlist(ticker);
      }
    } finally {
      setIsTogglingWatchlist(false);
    }
  }

  if (error === 'not_found') {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24 animate-slide-up">
        <span className="inline-block rounded-full bg-red-500/10 border border-red-500/20 px-3 py-1 text-[10px] uppercase tracking-[0.2em] font-medium text-red-400">
          Not found
        </span>
        <h2 className="font-heading text-2xl font-bold tracking-[-0.03em]">Stock not found</h2>
        <p className="text-sm text-gray-500">
          The ticker &ldquo;{ticker}&rdquo; could not be found.
        </p>
        <Link
          to="/dashboard"
          className="text-purple-400 hover:text-purple-300 text-sm transition-colors duration-300"
        >
          Go to Dashboard
        </Link>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-4 py-24">
        <p className="text-sm text-red-400">{error}</p>
        <Button
          variant="outline"
          className="rounded-xl border-white/[0.08] hover:bg-white/[0.06]"
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
      <div className="max-w-7xl mx-auto space-y-6 animate-slide-up">
        <div className="flex justify-between">
          <div className="space-y-2">
            <Skeleton className="h-9 w-32 rounded-lg bg-white/[0.04]" />
            <Skeleton className="h-5 w-48 rounded-lg bg-white/[0.04]" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-9 w-28 rounded-lg bg-white/[0.04]" />
            <Skeleton className="h-5 w-20 rounded-lg bg-white/[0.04]" />
          </div>
        </div>
        <Skeleton className="h-[400px] w-full rounded-2xl bg-white/[0.04]" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Skeleton className="h-60 rounded-2xl bg-white/[0.04]" />
          <Skeleton className="h-60 rounded-2xl bg-white/[0.04]" />
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
    <div className="max-w-7xl mx-auto space-y-6 animate-slide-up">
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
          horizon={horizon}
          onHorizonChange={setHorizon}
          onPredict={(h) => predict(ticker!, h)}
        />
        <PriceSummary prices={stock.prices} />
      </div>
    </div>
  );
}
