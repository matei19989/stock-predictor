import { SIGNAL_ORDER } from '@/utils/constants';
import { cn } from '@/utils/cn';
import type { TradingSignal } from '@/types';

const BAR_COLORS: Record<TradingSignal, string> = {
  'Strong Buy': 'bg-emerald-500',
  'Buy': 'bg-green-500',
  'Hold': 'bg-amber-500',
  'Sell': 'bg-orange-500',
  'Strong Sell': 'bg-red-500',
};

const BAR_GLOWS: Record<TradingSignal, string> = {
  'Strong Buy': 'shadow-[0_0_12px_rgba(16,185,129,0.3)]',
  'Buy': 'shadow-[0_0_12px_rgba(34,197,94,0.3)]',
  'Hold': 'shadow-[0_0_12px_rgba(245,158,11,0.3)]',
  'Sell': 'shadow-[0_0_12px_rgba(249,115,22,0.3)]',
  'Strong Sell': 'shadow-[0_0_12px_rgba(239,68,68,0.3)]',
};

interface ProbabilityBarsProps {
  probabilities: Record<TradingSignal, number>;
  predictedSignal: TradingSignal;
}

export default function ProbabilityBars({ probabilities, predictedSignal }: ProbabilityBarsProps) {
  return (
    <div className="space-y-2.5">
      {SIGNAL_ORDER.map((signal) => {
        const pct = (probabilities[signal] ?? 0) * 100;
        const isActive = signal === predictedSignal;
        return (
          <div key={signal} className="flex items-center gap-3 text-sm">
            <span className={cn(
              'w-24 text-right text-xs',
              isActive ? 'font-semibold text-white' : 'text-gray-500'
            )}>
              {signal}
            </span>
            <div className="flex-1 h-2.5 rounded-full bg-white/[0.04] overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]',
                  BAR_COLORS[signal],
                  isActive && BAR_GLOWS[signal]
                )}
                style={{ width: `${Math.max(pct, 1.5)}%` }}
              />
            </div>
            <span className={cn(
              'w-14 tabular-nums text-xs',
              isActive ? 'font-semibold text-white' : 'text-gray-500'
            )}>
              {pct.toFixed(1)}%
            </span>
          </div>
        );
      })}
    </div>
  );
}
