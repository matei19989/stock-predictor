import { useState } from 'react';
import { useNavigate, Link } from 'react-router';
import { ArrowUp, ArrowDown } from '@phosphor-icons/react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import SignalBadge from '@/components/common/SignalBadge';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { formatRelativeTime } from '@/utils/formatters';
import type { WatchlistItem } from '@/types';

type SortKey = 'ticker' | 'signalConfidence';
type SortDir = 'asc' | 'desc';

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

  function SortIcon({ col }: { col: SortKey }) {
    if (col !== sortKey) return null;
    return sortDir === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />;
  }

  const sorted = [...items].sort((a, b) => {
    const aVal = a[sortKey] ?? '';
    const bVal = b[sortKey] ?? '';
    if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead
            className="cursor-pointer select-none"
            onClick={() => handleSort('ticker')}
          >
            <span className="flex items-center gap-1">
              Ticker <SortIcon col="ticker" />
            </span>
          </TableHead>
          <TableHead>Name</TableHead>
          <TableHead>Signal</TableHead>
          <TableHead
            className="cursor-pointer select-none"
            onClick={() => handleSort('signalConfidence')}
          >
            <span className="flex items-center gap-1">
              Confidence <SortIcon col="signalConfidence" />
            </span>
          </TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sorted.map((item) => (
          <TableRow
            key={item.ticker}
            className="cursor-pointer"
            onClick={() => void navigate(`/stocks/${item.ticker}`)}
          >
            <TableCell className="font-semibold">
              <Link
                to={`/stocks/${item.ticker}`}
                className="hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                {item.ticker}
              </Link>
            </TableCell>
            <TableCell className="text-muted-foreground">
              {item.name ?? '—'}
            </TableCell>
            <TableCell>
              <SignalBadge signal={item.latestSignal} />
            </TableCell>
            <TableCell className="tabular-nums text-muted-foreground">
              {item.signalConfidence != null
                ? `${(item.signalConfidence * 100).toFixed(1)}%`
                : '—'}
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {item.latestSignal
                ? formatRelativeTime(item.addedAt)
                : 'No prediction'}
            </TableCell>
            <TableCell onClick={(e) => e.stopPropagation()}>
              {item.latestSignal ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => void navigate(`/stocks/${item.ticker}`)}
                >
                  View Details &rarr;
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={requestingTicker === item.ticker}
                  onClick={() => void onRequestPrediction(item.ticker)}
                >
                  {requestingTicker === item.ticker ? (
                    <span className="flex items-center gap-2">
                      <LoadingSpinner size="sm" />
                      Predicting...
                    </span>
                  ) : (
                    'Get Prediction'
                  )}
                </Button>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
