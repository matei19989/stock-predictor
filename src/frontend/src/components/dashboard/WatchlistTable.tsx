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
  return sortDir === 'asc'
    ? <ArrowUp size={10} className="text-purple-400" />
    : <ArrowDown size={10} className="text-purple-400" />;
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
      {/* Section header */}
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[11px] uppercase tracking-[0.15em] font-medium text-gray-500">
          Watchlist
        </span>
        <span className="text-[11px] text-gray-600 tabular-nums">
          {items.length} {items.length === 1 ? 'stock' : 'stocks'}
        </span>
      </div>

      {/* Table wrapped in double-bezel with scrollable body */}
      <div className="rounded-[1.5rem] bg-white/[0.03] p-1 ring-1 ring-white/[0.06]">
        <div className="rounded-[calc(1.5rem-0.25rem)] bg-white/[0.03] overflow-hidden shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] max-h-[500px] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-white/[0.06] hover:bg-transparent">
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
                    className="cursor-pointer select-none text-[11px] uppercase tracking-[0.1em] text-gray-500 font-medium h-10"
                    onClick={() => handleSort(key)}
                    aria-label={`Sort by ${label}`}
                  >
                    <span className="flex items-center gap-1">
                      {label} <SortIcon col={key} sortKey={sortKey} sortDir={sortDir} />
                    </span>
                  </TableHead>
                ))}
                <TableHead className="text-[11px] uppercase tracking-[0.1em] text-gray-500 font-medium h-10">
                  Signal
                </TableHead>
                <TableHead
                  className="cursor-pointer select-none text-[11px] uppercase tracking-[0.1em] text-gray-500 font-medium h-10"
                  onClick={() => handleSort('signalConfidence')}
                  aria-label="Sort by Confidence"
                >
                  <span className="flex items-center gap-1">
                    Confidence <SortIcon col="signalConfidence" sortKey={sortKey} sortDir={sortDir} />
                  </span>
                </TableHead>
                <TableHead className="h-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i} className="border-b border-white/[0.04]">
                      {Array.from({ length: 7 }).map((__, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-4 w-full rounded bg-white/[0.04]" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                : sorted.map((item) => (
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
                      <TableCell className="text-gray-400">{item.name ?? '—'}</TableCell>
                      <TableCell className="text-right tabular-nums text-gray-300">
                        {formatPrice(item.latestClose)}
                      </TableCell>
                      <TableCell
                        className={cn(
                          'text-right tabular-nums font-medium',
                          item.change1dPct == null
                            ? 'text-gray-600'
                            : item.change1dPct >= 0
                            ? 'text-green-400'
                            : 'text-red-400'
                        )}
                      >
                        {formatPct(item.change1dPct)}
                      </TableCell>
                      <TableCell>
                        <SignalBadge signal={item.latestSignal} />
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-gray-500">
                        {item.signalConfidence != null
                          ? `${(item.signalConfidence * 100).toFixed(1)}%`
                          : '—'}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-gray-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]"
                          aria-label={`Remove ${item.ticker}`}
                          onClick={() => setConfirmTicker(item.ticker)}
                        >
                          <Trash size={14} weight="light" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={!!confirmTicker} onOpenChange={() => setConfirmTicker(null)}>
        <DialogContent className="glass-surface-elevated rounded-2xl border-white/[0.08] bg-[#111420]/95">
          <DialogHeader>
            <DialogTitle className="font-heading tracking-[-0.02em]">
              Remove {confirmTicker}?
            </DialogTitle>
            <DialogDescription className="text-gray-500">
              This will remove {confirmTicker} from your watchlist.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setConfirmTicker(null)}
              className="rounded-xl border-white/[0.08] hover:bg-white/[0.06]"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={isRemoving}
              onClick={() => void handleConfirmRemove()}
              className="rounded-xl"
            >
              {isRemoving ? 'Removing…' : 'Remove'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
