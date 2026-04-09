import { SIGNAL_ORDER, SIGNAL_DOT_COLORS } from '@/utils/constants';
import { cn } from '@/utils/cn';
import type { TradingSignal } from '@/types';

interface ProbabilityBarsProps {
  probabilities: Record<TradingSignal, number>;
  predictedSignal: TradingSignal;
}

export default function ProbabilityBars({ probabilities, predictedSignal }: ProbabilityBarsProps) {
  return (
    <div className="space-y-2">
      {SIGNAL_ORDER.map((signal) => {
        const pct = (probabilities[signal] ?? 0) * 100;
        const isActive = signal === predictedSignal;
        return (
          <div key={signal} className="flex items-center gap-3 text-sm">
            <span className={cn('w-24 text-right', isActive ? 'font-semibold' : 'text-muted-foreground')}>
              {signal}
            </span>
            <div className="flex-1 h-3 rounded-full bg-muted overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all', SIGNAL_DOT_COLORS[signal])}
                style={{ width: `${Math.max(pct, 1)}%` }}
              />
            </div>
            <span className={cn('w-14 tabular-nums', isActive ? 'font-semibold' : 'text-muted-foreground')}>
              {pct.toFixed(1)}%
            </span>
          </div>
        );
      })}
    </div>
  );
}
