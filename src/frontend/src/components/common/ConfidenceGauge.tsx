import { Progress } from '@/components/ui/progress';
import { cn } from '@/utils/cn';

interface ConfidenceGaugeProps {
  confidence: number; // 0-1
  lowConfidence: boolean;
}

export default function ConfidenceGauge({ confidence, lowConfidence }: ConfidenceGaugeProps) {
  const pct = confidence * 100;
  const color = pct < 30 ? 'text-red-600' : pct < 50 ? 'text-amber-600' : 'text-green-600';

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Confidence</span>
        <span className={cn('font-semibold tabular-nums', color)}>
          {pct.toFixed(1)}%
        </span>
      </div>
      <Progress value={pct} className="h-2" />
      {lowConfidence && (
        <p className="text-xs text-amber-600">
          Low confidence — treat with caution
        </p>
      )}
    </div>
  );
}
