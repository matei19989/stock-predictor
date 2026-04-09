import { useState } from 'react';
import { toast } from 'sonner';
import { useWatchlist } from '@/hooks/useWatchlist';
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
      <div className="flex flex-col items-center gap-4 py-16">
        <p className="text-sm text-destructive">{error}</p>
        <Button variant="outline" onClick={() => void refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Predictions</h1>
        <p className="text-sm text-muted-foreground">
          ML-powered trading signals for your watchlist
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
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
