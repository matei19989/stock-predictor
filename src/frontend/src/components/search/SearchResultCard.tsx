import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Plus, Check } from '@phosphor-icons/react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import * as watchlistService from '@/services/watchlistService';
import { formatPrice } from '@/utils/formatters';
import type { StockSearchResult } from '@/types';

interface SearchResultCardProps {
  result: StockSearchResult;
}

export default function SearchResultCard({ result }: SearchResultCardProps) {
  const navigate = useNavigate();
  const [inWatchlist, setInWatchlist] = useState(result.isInWatchlist);
  const [isAdding, setIsAdding] = useState(false);

  async function handleAdd(e: React.MouseEvent) {
    e.stopPropagation();
    setIsAdding(true);
    try {
      await watchlistService.add(result.ticker);
      setInWatchlist(true);
      toast.success(`${result.ticker} added to watchlist`);
    } catch {
      toast.error(`Failed to add ${result.ticker}`);
    } finally {
      setIsAdding(false);
    }
  }

  return (
    <Card
      className="cursor-pointer transition-colors hover:bg-muted/50"
      onClick={() => navigate(`/stocks/${result.ticker}`)}
    >
      <CardContent className="flex items-center justify-between p-4">
        <div>
          <p className="font-semibold">{result.ticker}</p>
          <p className="text-sm text-muted-foreground">{result.name ?? '—'}</p>
          {result.sector && (
            <p className="text-xs text-muted-foreground">{result.sector}</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="tabular-nums font-medium">
            {formatPrice(result.latestClose)}
          </span>
          {inWatchlist ? (
            <Button variant="outline" size="sm" disabled>
              <Check size={14} className="mr-1" /> In Watchlist
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              disabled={isAdding}
              onClick={handleAdd}
            >
              <Plus size={14} className="mr-1" />
              {isAdding ? 'Adding\u2026' : 'Add'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
