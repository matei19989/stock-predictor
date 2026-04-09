import { cn } from '@/utils/cn';
import { SIGNAL_COLORS, SIGNAL_DOT_COLORS } from '@/utils/constants';
import type { TradingSignal } from '@/types';

interface SignalBadgeProps {
  signal: TradingSignal | null;
  size?: 'sm' | 'md' | 'lg';
}

export default function SignalBadge({ signal, size = 'md' }: SignalBadgeProps) {
  // 'sm' is a colored dot — used in the sidebar watchlist list
  if (size === 'sm') {
    return signal
      ? <div className={cn('h-2 w-2 shrink-0 rounded-full', SIGNAL_DOT_COLORS[signal])} title={signal} />
      : <div className="h-2 w-2 shrink-0 rounded-full bg-muted" title="No signal" />;
  }

  if (!signal) {
    return (
      <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
        —
      </span>
    );
  }

  const sizeClasses = {
    md: 'px-2 py-0.5 text-xs font-medium',
    lg: 'px-3 py-1 text-sm font-semibold',
  } as const;

  return (
    <span className={cn('inline-flex items-center rounded-full', SIGNAL_COLORS[signal], sizeClasses[size])}>
      {signal}
    </span>
  );
}
