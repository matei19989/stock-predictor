import { useState } from 'react';
import { toast } from 'sonner';
import { useWatchlist } from '@/contexts/WatchlistContext';
import * as predictionService from '@/services/predictionService';
import { ApiException } from '@/services/api';
import PredictionTable from '@/components/predictions/PredictionTable';
import EmptyState from '@/components/common/EmptyState';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

export default function PredictionsPage() {
  useDocumentTitle('Predictions');
  const { items, isLoading, error, refetch } = useWatchlist();
  const [requestingTicker, setRequestingTicker] = useState<string | null>(null);

  async function handleRequestPrediction(ticker: string) {
    setRequestingTicker(ticker);
    try {
      await predictionService.create({ ticker, horizon: '3m' });
      toast.success(`Prediction generated for ${ticker}`);
      await refetch();
    } catch (err) {
      if (err instanceof ApiException) {
        if (err.status === 503) toast.error('Prediction service temporarily unavailable');
        else if (err.status === 501) toast.error('This horizon is not yet supported');
        else toast.error(err.detail);
      }
    } finally {
      setRequestingTicker(null);
    }
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-4 py-24">
        <p className="text-sm text-red-400">{error}</p>
        <Button
          variant="outline"
          onClick={() => void refetch()}
          className="rounded-xl border-white/[0.08] hover:bg-white/[0.06]"
        >
          Try again
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-slide-up">
      <div className="space-y-2">
        <span className="inline-block rounded-full bg-purple-500/10 border border-purple-500/20 px-3 py-1 text-[10px] uppercase tracking-[0.2em] font-medium text-purple-400">
          ML Signals
        </span>
        <h1 className="font-heading text-3xl font-bold tracking-[-0.03em]">Predictions</h1>
        <p className="text-sm text-gray-500 leading-relaxed">
          ML-powered trading signals for your watchlist
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg bg-white/[0.04]" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          title="No stocks in your watchlist"
          description="Add stocks to your watchlist to see ML predictions."
        />
      ) : (
        <PredictionTable
          items={items}
          onRequestPrediction={handleRequestPrediction}
          requestingTicker={requestingTicker}
        />
      )}
    </div>
  );
}
