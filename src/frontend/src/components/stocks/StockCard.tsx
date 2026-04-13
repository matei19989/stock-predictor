import { useNavigate } from 'react-router';
import { formatPrice, formatPct } from '@/utils/formatters';
import SignalBadge from '@/components/common/SignalBadge';
import { cn } from '@/utils/cn';
import type { StockOverview } from '@/types';

interface StockCardProps {
  stock: StockOverview;
}

export default function StockCard({ stock }: StockCardProps) {
  const navigate = useNavigate();

  return (
    <div
      className="group cursor-pointer rounded-[1.25rem] bg-white/[0.03] p-0.5 ring-1 ring-white/[0.06] transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:ring-purple-500/15 hover:bg-white/[0.04]"
      onClick={() => navigate(`/stocks/${stock.ticker}`)}
    >
      <div className="rounded-[calc(1.25rem-0.125rem)] bg-white/[0.03] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
        {/* Ticker + Name */}
        <div className="mb-3">
          <p className="font-heading text-sm font-bold tracking-[-0.02em] text-white group-hover:text-purple-300 transition-colors duration-300">
            {stock.ticker}
          </p>
          <p className="text-xs text-gray-500 truncate">
            {stock.name ?? '—'}
          </p>
        </div>

        {/* Price + Change */}
        <div className="flex items-baseline justify-between mb-3">
          <span className="text-sm tabular-nums font-medium text-gray-300">
            {stock.latestClose != null ? formatPrice(stock.latestClose) : '—'}
          </span>
          {stock.change1dPct != null && (
            <span
              className={cn(
                'text-xs tabular-nums font-medium',
                stock.change1dPct >= 0 ? 'text-green-400' : 'text-red-400'
              )}
            >
              {formatPct(stock.change1dPct)}
            </span>
          )}
        </div>

        {/* Signal */}
        <div>
          {stock.latestSignal ? (
            <SignalBadge signal={stock.latestSignal} size="md" />
          ) : (
            <span className="text-[10px] text-gray-600 uppercase tracking-wider">
              No prediction
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
