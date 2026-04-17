import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { notifySuccess } from '@/utils/notify';
import { useWatchlist } from '@/hooks/useWatchlist';
import * as predictionService from '@/services/predictionService';
import { ApiException } from '@/services/api';
import PredictedTable from '@/components/predictions/PredictedTable';
import NotPredictedTable from '@/components/predictions/NotPredictedTable';
import EmptyState from '@/components/common/EmptyState';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import type { UserPrediction } from '@/types';

type Tab = 'predicted' | 'not-predicted';

export default function PredictionsPage() {
  useDocumentTitle('Predictions');
  const { items: watchlist, isLoading: watchlistLoading, error: watchlistError, refetch: refetchWatchlist } = useWatchlist();
  const [predicted, setPredicted] = useState<UserPrediction[]>([]);
  const [predictedLoading, setPredictedLoading] = useState(true);
  const [predictedError, setPredictedError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('predicted');
  const [requestingTicker, setRequestingTicker] = useState<string | null>(null);

  async function loadPredicted() {
    setPredictedLoading(true);
    setPredictedError(null);
    try {
      const list = await predictionService.getUserPredicted();
      setPredicted(list);
    } catch (err) {
      setPredictedError(err instanceof ApiException ? err.detail : 'Failed to load predictions');
    } finally {
      setPredictedLoading(false);
    }
  }

  useEffect(() => { void loadPredicted(); }, []);

  async function handleRequestPrediction(ticker: string) {
    setRequestingTicker(ticker);
    try {
      await predictionService.create({ ticker, horizon: '3m' });
      notifySuccess(`Prediction generated for ${ticker}`);
      await Promise.all([refetchWatchlist(), loadPredicted()]);
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

  const notPredicted = watchlist.filter(w => !predicted.some(p => p.ticker === w.ticker));

  const isLoading = watchlistLoading || predictedLoading;
  const error = watchlistError ?? predictedError;

  if (error) {
    return (
      <div className="flex flex-col items-center gap-4 py-24">
        <p className="text-sm text-red-400">{error}</p>
        <Button
          variant="outline"
          onClick={() => { void refetchWatchlist(); void loadPredicted(); }}
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
          ML-powered trading signals split between what you've already predicted and what's still untouched in your watchlist.
        </p>
      </div>

      <div className="flex gap-2 border-b border-white/[0.06]">
        <TabButton active={tab === 'predicted'} onClick={() => setTab('predicted')}>
          Predicted <span className="ml-1.5 text-gray-500">({predicted.length})</span>
        </TabButton>
        <TabButton active={tab === 'not-predicted'} onClick={() => setTab('not-predicted')}>
          Watchlisted · not predicted <span className="ml-1.5 text-gray-500">({notPredicted.length})</span>
        </TabButton>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg bg-white/[0.04]" />
          ))}
        </div>
      ) : watchlist.length === 0 ? (
        <EmptyState
          title="No stocks in your watchlist"
          description="Add stocks to your watchlist to see ML predictions."
        />
      ) : tab === 'predicted' ? (
        <PredictedTable items={predicted} />
      ) : (
        <NotPredictedTable
          items={notPredicted}
          onRequestPrediction={handleRequestPrediction}
          requestingTicker={requestingTicker}
        />
      )}
    </div>
  );
}

function TabButton({
  active, onClick, children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
        active
          ? 'border-purple-500 text-white'
          : 'border-transparent text-gray-500 hover:text-gray-300'
      }`}
    >
      {children}
    </button>
  );
}
