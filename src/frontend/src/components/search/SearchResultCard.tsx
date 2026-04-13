import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Plus, Check } from '@phosphor-icons/react';
import { useWatchlist } from '@/contexts/WatchlistContext';
import { formatPrice } from '@/utils/formatters';
import type { StockSearchResult } from '@/types';

interface SearchResultCardProps {
  result: StockSearchResult;
}

export default function SearchResultCard({ result }: SearchResultCardProps) {
  const navigate = useNavigate();
  const { add: addToWatchlist } = useWatchlist();
  const [inWatchlist, setInWatchlist] = useState(result.isInWatchlist);
  const [isAdding, setIsAdding] = useState(false);

  async function handleAdd(e: React.MouseEvent) {
    e.stopPropagation();
    setIsAdding(true);
    try {
      await addToWatchlist(result.ticker);
      setInWatchlist(true);
    } finally {
      setIsAdding(false);
    }
  }

  return (
    <div
      className="group cursor-pointer rounded-[1.5rem] bg-white/[0.03] p-1 ring-1 ring-white/[0.06] transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:ring-purple-500/15 hover:bg-white/[0.04]"
      onClick={() => navigate(`/stocks/${result.ticker}`)}
    >
      <div className="rounded-[calc(1.5rem-0.25rem)] bg-white/[0.03] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <p className="font-heading font-bold tracking-[-0.02em] text-white group-hover:text-purple-300 transition-colors duration-300">
              {result.ticker}
            </p>
            <p className="text-sm text-gray-400 truncate">{result.name ?? '—'}</p>
            {result.sector && (
              <span className="inline-block mt-1.5 text-[10px] uppercase tracking-[0.15em] text-gray-600">
                {result.sector}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 shrink-0 ml-3">
            <span className="tabular-nums font-medium text-gray-300">
              {formatPrice(result.latestClose)}
            </span>
            {inWatchlist ? (
              <span className="flex items-center gap-1 px-2.5 py-1 text-[10px] rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
                <Check size={10} weight="bold" />
                Watching
              </span>
            ) : (
              <button
                disabled={isAdding}
                onClick={handleAdd}
                className="flex items-center gap-1 px-2.5 py-1 text-[10px] rounded-lg border border-white/[0.08] text-gray-400 hover:text-white hover:bg-white/[0.06] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] disabled:opacity-40"
              >
                <Plus size={10} weight="bold" />
                {isAdding ? 'Adding…' : 'Add'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
