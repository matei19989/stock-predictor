import { cn } from '@/utils/cn';
import { SIGNAL_DOT_COLORS } from '@/utils/constants';
import type { TradingSignal } from '@/types';

const SIGNAL_BADGE_STYLES: Record<TradingSignal, string> = {
  'Strong Buy':  'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
  'Buy':         'bg-green-500/15 text-green-400 border-green-500/25',
  'Hold':        'bg-amber-500/15 text-amber-400 border-amber-500/25',
  'Sell':        'bg-orange-500/15 text-orange-400 border-orange-500/25',
  'Strong Sell': 'bg-red-500/15 text-red-400 border-red-500/25',
};

interface SignalBadgeProps {
  signal: TradingSignal | null;
  size?: 'sm' | 'md' | 'lg';
}

export default function SignalBadge({ signal, size = 'md' }: SignalBadgeProps) {
  if (size === 'sm') {
    return signal
      ? <div className={cn('h-2 w-2 shrink-0 rounded-full', SIGNAL_DOT_COLORS[signal])} title={signal} />
      : <div className="h-2 w-2 shrink-0 rounded-full bg-gray-700" title="No signal" />;
  }

  if (!signal) {
    return (
      <span className="inline-flex items-center rounded-full bg-white/[0.04] border border-white/[0.08] px-2.5 py-0.5 text-[11px] text-gray-500">
        —
      </span>
    );
  }

  const sizeClasses = {
    md: 'px-2.5 py-0.5 text-[11px] font-medium border',
    lg: 'px-3.5 py-1 text-sm font-semibold border',
  } as const;

  return (
    <span className={cn(
      'inline-flex items-center rounded-full',
      SIGNAL_BADGE_STYLES[signal],
      sizeClasses[size]
    )}>
      {signal}
    </span>
  );
}
