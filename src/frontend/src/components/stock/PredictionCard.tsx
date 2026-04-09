import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { HORIZON_LABELS } from '@/utils/constants';
import { formatRelativeTime, formatTimeUntil } from '@/utils/formatters';
import SignalBadge from '@/components/common/SignalBadge';
import ConfidenceGauge from '@/components/common/ConfidenceGauge';
import ProbabilityBars from '@/components/stock/ProbabilityBars';
import SkeletonCard from '@/components/common/SkeletonCard';
import type { Prediction, Horizon } from '@/types';

interface PredictionCardProps {
  prediction: Prediction | null;
  isLoading: boolean;
  isPredicting: boolean;
  error: string | null;
  onPredict: (horizon: Horizon) => void;
}

export default function PredictionCard({
  prediction,
  isLoading,
  isPredicting,
  error,
  onPredict,
}: PredictionCardProps) {
  const [horizon, setHorizon] = useState<Horizon>('3m');

  return (
    <Card>
      <CardHeader>
        <CardTitle>ML Prediction</CardTitle>
        <TooltipProvider>
          <div className="flex gap-2">
            {(['3m', '6m', '1y'] as Horizon[]).map(h => (
              <Tooltip key={h}>
                <TooltipTrigger asChild>
                  <Button
                    variant={horizon === h ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setHorizon(h)}
                    disabled={h !== '3m'}
                  >
                    {HORIZON_LABELS[h]}
                  </Button>
                </TooltipTrigger>
                {h !== '3m' && <TooltipContent>Coming soon</TooltipContent>}
              </Tooltip>
            ))}
          </div>
        </TooltipProvider>
      </CardHeader>

      <CardContent>
        {isLoading && <SkeletonCard lines={5} />}

        {!isLoading && error && (
          <p className="text-sm text-muted-foreground">{error}</p>
        )}

        {!isLoading && !error && !prediction && (
          <div className="flex flex-col items-center gap-3 py-6">
            <p className="text-sm text-muted-foreground">No prediction yet</p>
            <Button onClick={() => onPredict(horizon)} disabled={isPredicting}>
              {isPredicting ? 'Analyzing\u2026' : 'Get Prediction'}
            </Button>
          </div>
        )}

        {!isLoading && !error && prediction && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <SignalBadge signal={prediction.signal} size="lg" />
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPredict(horizon)}
                disabled={isPredicting}
              >
                {isPredicting ? 'Analyzing\u2026' : 'Refresh'}
              </Button>
            </div>

            <ConfidenceGauge
              confidence={prediction.confidence}
              lowConfidence={prediction.lowConfidence}
            />

            <ProbabilityBars
              probabilities={prediction.probabilities}
              predictedSignal={prediction.signal}
            />

            <p className="text-xs text-muted-foreground">
              Cached {formatRelativeTime(prediction.cachedAt)} &middot; Expires in{' '}
              {formatTimeUntil(prediction.expiresAt)}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
