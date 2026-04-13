import { useState } from 'react';
import { useNavigate, Link } from 'react-router';
import { ArrowUp, ArrowDown } from '@phosphor-icons/react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import SignalBadge from '@/components/common/SignalBadge';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { formatRelativeTime } from '@/utils/formatters';
import type { WatchlistItem } from '@/types';

type SortKey = 'ticker' | 'signalConfidence';
type SortDir = 'asc' | 'desc';

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (col !== sortKey) return null;
  return sortDir === 'asc'
    ? <ArrowUp size={10} className="text-purple-400" />
    : <ArrowDown size={10} className="text-purple-400" />;
}

interface PredictionTableProps {
  items: WatchlistItem[];
  onRequestPrediction: (ticker: string) => Promise<void>;
  requestingTicker: string | null;
}

export default function PredictionTable({
  items,
  onRequestPrediction,
  requestingTicker,
}: PredictionTableProps) {
  const navigate = useNavigate();
  const [sortKey, setSortKey] = useState<SortKey>('ticker');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'signalConfidence' ? 'desc' : 'asc');
    }
  }

  const sorted = [...items].sort((a, b) => {
    const aVal = a[sortKey] ?? '';
    const bVal = b[sortKey] ?? '';
    if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  return (
    <div className="rounded-[1.5rem] bg-white/[0.03] p-1 ring-1 ring-white/[0.06]">
      <div className="rounded-[calc(1.5rem-0.25rem)] bg-white/[0.03] overflow-hidden shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-white/[0.06] hover:bg-transparent">
              <TableHead
                className="cursor-pointer select-none text-[11px] uppercase tracking-[0.1em] text-gray-500 font-medium h-10"
                onClick={() => handleSort('ticker')}
              >
                <span className="flex items-center gap-1">
                  Ticker <SortIcon col="ticker" sortKey={sortKey} sortDir={sortDir} />
                </span>
              </TableHead>
              <TableHead className="text-[11px] uppercase tracking-[0.1em] text-gray-500 font-medium h-10">
                Name
              </TableHead>
              <TableHead className="text-[11px] uppercase tracking-[0.1em] text-gray-500 font-medium h-10">
                Signal
              </TableHead>
              <TableHead
                className="cursor-pointer select-none text-[11px] uppercase tracking-[0.1em] text-gray-500 font-medium h-10"
                onClick={() => handleSort('signalConfidence')}
              >
                <span className="flex items-center gap-1">
                  Confidence <SortIcon col="signalConfidence" sortKey={sortKey} sortDir={sortDir} />
                </span>
              </TableHead>
              <TableHead className="text-[11px] uppercase tracking-[0.1em] text-gray-500 font-medium h-10">
                Status
              </TableHead>
              <TableHead className="text-[11px] uppercase tracking-[0.1em] text-gray-500 font-medium h-10">
                Action
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((item) => (
              <TableRow
                key={item.ticker}
                className="cursor-pointer border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]"
                onClick={() => void navigate(`/stocks/${item.ticker}`)}
              >
                <TableCell className="font-semibold text-white">
                  <Link
                    to={`/stocks/${item.ticker}`}
                    className="hover:text-purple-400 transition-colors duration-300"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {item.ticker}
                  </Link>
                </TableCell>
                <TableCell className="text-gray-400">
                  {item.name ?? '—'}
                </TableCell>
                <TableCell>
                  <SignalBadge signal={item.latestSignal} />
                </TableCell>
                <TableCell className="tabular-nums text-gray-500">
                  {item.signalConfidence != null
                    ? `${(item.signalConfidence * 100).toFixed(1)}%`
                    : '—'}
                </TableCell>
                <TableCell className="text-xs text-gray-500">
                  {item.latestSignal
                    ? formatRelativeTime(item.addedAt)
                    : 'No prediction'}
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  {item.latestSignal ? (
                    <button
                      className="text-xs text-purple-400 hover:text-purple-300 transition-colors duration-300"
                      onClick={() => void navigate(`/stocks/${item.ticker}`)}
                    >
                      View Details →
                    </button>
                  ) : (
                    <button
                      disabled={requestingTicker === item.ticker}
                      onClick={() => void onRequestPrediction(item.ticker)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-white/[0.08] text-gray-400 hover:text-white hover:bg-white/[0.06] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] disabled:opacity-40"
                    >
                      {requestingTicker === item.ticker ? (
                        <span className="flex items-center gap-2">
                          <LoadingSpinner size="sm" />
                          Predicting…
                        </span>
                      ) : (
                        'Get Prediction'
                      )}
                    </button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
