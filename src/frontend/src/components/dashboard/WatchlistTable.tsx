import { useState } from 'react';
import { useNavigate, Link } from 'react-router';
import { ArrowUp, ArrowDown, Trash } from '@phosphor-icons/react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import SignalBadge from '@/components/common/SignalBadge';
import EmptyState from '@/components/common/EmptyState';
import { formatPrice, formatPct } from '@/utils/formatters';
import { cn } from '@/utils/cn';
import type { WatchlistItem } from '@/types';

type SortKey = keyof Pick<WatchlistItem, 'ticker' | 'name' | 'latestClose' | 'change1dPct' | 'signalConfidence'>;
type SortDir = 'asc' | 'desc';

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (col !== sortKey) return null;
  return sortDir === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />;
}

interface WatchlistTableProps {
  items: WatchlistItem[];
  onRemove: (ticker: string) => Promise<void>;
  isLoading: boolean;
}

export default function WatchlistTable({ items, onRemove, isLoading }: WatchlistTableProps) {
  const navigate = useNavigate();
  const [sortKey, setSortKey] = useState<SortKey>('ticker');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [confirmTicker, setConfirmTicker] = useState<string | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  const sorted = [...items].sort((a, b) => {
    const aVal = a[sortKey] ?? '';
    const bVal = b[sortKey] ?? '';
    if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  async function handleConfirmRemove() {
    if (!confirmTicker) return;
    setIsRemoving(true);
    await onRemove(confirmTicker);
    setIsRemoving(false);
    setConfirmTicker(null);
  }

  if (!isLoading && items.length === 0 && !confirmTicker) {
    return (
      <EmptyState
        title="Your watchlist is empty"
        description="Search for stocks to add them to your watchlist."
      />
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            {(
              [
                { key: 'ticker', label: 'Ticker' },
                { key: 'name', label: 'Name' },
                { key: 'latestClose', label: 'Price' },
                { key: 'change1dPct', label: '1D Change' },
              ] as { key: SortKey; label: string }[]
            ).map(({ key, label }) => (
              <TableHead
                key={key}
                className="cursor-pointer select-none"
                onClick={() => handleSort(key)}
                aria-label={`Sort by ${label}`}
              >
                <span className="flex items-center gap-1">
                  {label} <SortIcon col={key} sortKey={sortKey} sortDir={sortDir} />
                </span>
              </TableHead>
            ))}
            <TableHead>Signal</TableHead>
            <TableHead
              className="cursor-pointer select-none"
              onClick={() => handleSort('signalConfidence')}
              aria-label="Sort by Confidence"
            >
              <span className="flex items-center gap-1">
                Confidence <SortIcon col="signalConfidence" sortKey={sortKey} sortDir={sortDir} />
              </span>
            </TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading
            ? Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((__, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            : sorted.map((item) => (
                <TableRow
                  key={item.ticker}
                  className="cursor-pointer hover:bg-muted/50"
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
                  <TableCell className="text-muted-foreground">{item.name ?? '—'}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatPrice(item.latestClose)}
                  </TableCell>
                  <TableCell
                    className={cn(
                      'text-right tabular-nums',
                      item.change1dPct == null
                        ? 'text-muted-foreground'
                        : item.change1dPct >= 0
                        ? 'text-green-600'
                        : 'text-red-600'
                    )}
                  >
                    {formatPct(item.change1dPct)}
                  </TableCell>
                  <TableCell>
                    <SignalBadge signal={item.latestSignal} />
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {item.signalConfidence != null
                      ? `${(item.signalConfidence * 100).toFixed(1)}%`
                      : '—'}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      aria-label={`Remove ${item.ticker}`}
                      onClick={() => setConfirmTicker(item.ticker)}
                    >
                      <Trash size={14} />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
        </TableBody>
      </Table>

      <Dialog open={!!confirmTicker} onOpenChange={() => setConfirmTicker(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove {confirmTicker}?</DialogTitle>
            <DialogDescription>
              This will remove {confirmTicker} from your watchlist.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmTicker(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={isRemoving}
              onClick={() => void handleConfirmRemove()}
            >
              {isRemoving ? 'Removing…' : 'Remove'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
