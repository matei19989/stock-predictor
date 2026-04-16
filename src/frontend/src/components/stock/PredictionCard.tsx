import { useState } from 'react';
import { Brain, ArrowsClockwise } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
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
    <div className="rounded-[1.5rem] bg-white/[0.03] p-1 ring-1 ring-white/[0.06]">
      <div className="rounded-[calc(1.5rem-0.25rem)] bg-white/[0.03] overflow-hidden shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-500/10">
              <Brain size={14} weight="light" className="text-purple-400" />
            </div>
            <span className="font-heading text-sm font-semibold tracking-[-0.02em]">
              ML Prediction
            </span>
          </div>
            <div className="flex gap-1.5">
              {(['3m', '6m', '1y'] as Horizon[]).map(h => (
                <button
                  key={h}
                  onClick={() => setHorizon(h)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${
                    horizon === h
                      ? 'bg-purple-500/15 text-purple-300 border border-purple-500/25'
                      : 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.04] border border-transparent'
                  }`}
                >
                  {HORIZON_LABELS[h]}
                </button>
              ))}
            </div>
        </div>

        {/* Content */}
        <div className="px-6 py-6">
          {isLoading && <SkeletonCard lines={5} />}

          {!isLoading && error && (
            <p className="text-sm text-gray-500">{error}</p>
          )}

          {!isLoading && !error && !prediction && (
            <div className="flex flex-col items-center gap-4 py-8">
              <p className="text-sm text-gray-500">No prediction yet</p>
              <Button
                onClick={() => onPredict(horizon)}
                disabled={isPredicting}
                className="group bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-0 h-10 px-6 text-sm font-medium rounded-xl shadow-[0_0_25px_rgba(168,85,247,0.2)] hover:shadow-[0_0_40px_rgba(168,85,247,0.3)] transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]"
              >
                {isPredicting ? 'Analyzing…' : 'Get Prediction'}
              </Button>
            </div>
          )}

          {!isLoading && !error && prediction && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <SignalBadge signal={prediction.signal} size="lg" />
                <button
                  onClick={() => onPredict(horizon)}
                  disabled={isPredicting}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-400 hover:text-white rounded-lg border border-white/[0.08] hover:bg-white/[0.06] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] disabled:opacity-40"
                >
                  <ArrowsClockwise size={12} weight="light" className={isPredicting ? 'animate-spin' : ''} />
                  {isPredicting ? 'Analyzing…' : 'Refresh'}
                </button>
              </div>

              <ConfidenceGauge
                confidence={prediction.confidence}
                lowConfidence={prediction.lowConfidence}
              />

              <ProbabilityBars
                probabilities={prediction.probabilities}
                predictedSignal={prediction.signal}
              />

              <p className="text-[11px] text-gray-600">
                Cached {formatRelativeTime(prediction.cachedAt)} · Expires in{' '}
                {formatTimeUntil(prediction.expiresAt)}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
