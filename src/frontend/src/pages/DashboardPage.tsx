import { useWatchlist } from '@/hooks/useWatchlist';
import SummaryCards from '@/components/dashboard/SummaryCards';
import WatchlistTable from '@/components/dashboard/WatchlistTable';
import { Button } from '@/components/ui/button';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

export default function DashboardPage() {
  useDocumentTitle('Dashboard');
  const { items, isLoading, error, remove, refetch } = useWatchlist();

  if (error) {
    return (
      <div className="flex flex-col items-center gap-4 py-16">
        <p className="text-sm text-destructive">{error}</p>
        <Button variant="outline" onClick={() => void refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Your watchlist overview</p>
      </div>
      <SummaryCards items={items} isLoading={isLoading} />
      <WatchlistTable items={items} onRemove={remove} isLoading={isLoading} />
    </div>
  );
}
