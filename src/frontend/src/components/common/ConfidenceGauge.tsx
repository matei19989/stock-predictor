import { cn } from '@/utils/cn';

interface ConfidenceGaugeProps {
  confidence: number; // 0-1
  lowConfidence: boolean;
}

export default function ConfidenceGauge({ confidence, lowConfidence }: ConfidenceGaugeProps) {
  const pct = confidence * 100;
  const color = pct < 30
    ? 'text-red-400'
    : pct < 50
    ? 'text-amber-400'
    : 'text-green-400';

  const barColor = pct < 30
    ? 'bg-red-500'
    : pct < 50
    ? 'bg-amber-500'
    : 'bg-green-500';

  const barGlow = pct < 30
    ? 'shadow-[0_0_8px_rgba(239,68,68,0.3)]'
    : pct < 50
    ? 'shadow-[0_0_8px_rgba(245,158,11,0.3)]'
    : 'shadow-[0_0_8px_rgba(34,197,94,0.3)]';

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-[11px] uppercase tracking-[0.1em] text-gray-500">Confidence</span>
        <span className={cn('font-semibold tabular-nums text-sm', color)}>
          {pct.toFixed(1)}%
        </span>
      </div>
      <div className="h-2 rounded-full bg-white/[0.04] overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]',
            barColor,
            barGlow
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      {lowConfidence && (
        <p className="text-[11px] text-amber-400">
          Low confidence — treat with caution
        </p>
      )}
    </div>
  );
}
