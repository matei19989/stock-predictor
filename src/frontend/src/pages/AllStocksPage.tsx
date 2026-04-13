import { useState, useEffect, useMemo } from 'react';
import { MagnifyingGlass } from '@phosphor-icons/react';
import * as stockService from '@/services/stockService';
import StockCard from '@/components/stocks/StockCard';
import { Skeleton } from '@/components/ui/skeleton';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import type { StockOverview } from '@/types';

const CACHE_KEY = 'sp_all_stocks';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function readCache(): StockOverview[] | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (raw) {
      const { data, ts } = JSON.parse(raw);
      if (Date.now() - ts < CACHE_TTL && data.length > 0) return data;
    }
  } catch { /* ignore corrupt cache */ }
  return null;
}

export default function AllStocksPage() {
  useDocumentTitle('All Stocks');
  const cached = readCache();
  const [stocks, setStocks] = useState<StockOverview[]>(cached ?? []);
  const [isLoading, setIsLoading] = useState(!cached);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [sector, setSector] = useState('All');

  useEffect(() => {
    if (stocks.length > 0) return; // already have cached data

    stockService.getAll()
      .then(data => {
        setStocks(data);
        sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data, ts: Date.now() }));
      })
      .catch(() => setError('Failed to load stocks'))
      .finally(() => setIsLoading(false));
  }, [stocks.length]);

  const sectors = useMemo(() => {
    const set = new Set(stocks.map(s => s.sector).filter(Boolean) as string[]);
    return ['All', ...Array.from(set).sort()];
  }, [stocks]);

  const filtered = useMemo(() => {
    let result = stocks;
    if (sector !== 'All') {
      result = result.filter(s => s.sector === sector);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(s =>
        s.ticker.toLowerCase().includes(q) ||
        (s.name?.toLowerCase().includes(q) ?? false)
      );
    }
    return result;
  }, [stocks, sector, search]);

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-slide-up">
      {/* Header */}
      <div className="space-y-2">
        <span className="inline-block rounded-full bg-purple-500/10 border border-purple-500/20 px-3 py-1 text-[10px] uppercase tracking-[0.2em] font-medium text-purple-400">
          Browse
        </span>
        <h1 className="font-heading text-3xl font-bold tracking-[-0.03em]">All Stocks</h1>
        <p className="text-sm text-gray-500 leading-relaxed">
          Browse all {stocks.length} S&P 500 stocks in our universe
        </p>
      </div>

      {/* Search + Sector filter */}
      <div className="space-y-3">
        <div className="relative max-w-md">
          <MagnifyingGlass
            size={14}
            weight="light"
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500"
          />
          <input
            placeholder="Filter by ticker or name…"
            className="glass-input w-full rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder:text-gray-600 outline-none"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {sectors.map(s => (
            <button
              key={s}
              onClick={() => setSector(s)}
              className={`px-3 py-1.5 text-[11px] font-medium rounded-lg transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${
                sector === s
                  ? 'bg-purple-500/15 text-purple-300 border border-purple-500/25'
                  : 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.04] border border-transparent'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="h-[130px] rounded-2xl bg-white/[0.04]" />
          ))}
        </div>
      ) : error ? (
        <p className="text-sm text-red-400 py-12 text-center">{error}</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-gray-500 py-12 text-center">
          No stocks match your filter.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map(stock => (
            <StockCard key={stock.ticker} stock={stock} />
          ))}
        </div>
      )}
    </div>
  );
}
