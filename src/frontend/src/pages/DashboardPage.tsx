import { useWatchlist } from '@/contexts/WatchlistContext';
import SummaryCards from '@/components/dashboard/SummaryCards';
import WatchlistTable from '@/components/dashboard/WatchlistTable';
import MarketOverview from '@/components/dashboard/MarketOverview';
import { Button } from '@/components/ui/button';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

export default function DashboardPage() {
  useDocumentTitle('Dashboard');
  const { items, isLoading, error, remove, refetch } = useWatchlist();

  if (error) {
    return (
      <div className="flex flex-col items-center gap-4 py-24">
        <p className="text-sm text-red-400">{error}</p>
        <Button
          variant="outline"
          onClick={() => void refetch()}
          className="rounded-xl border-white/[0.08] hover:bg-white/[0.06]"
        >
          Try again
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-slide-up">
      {/* Page header */}
      <div className="space-y-2">
        <span className="inline-block rounded-full bg-purple-500/10 border border-purple-500/20 px-3 py-1 text-[10px] uppercase tracking-[0.2em] font-medium text-purple-400">
          Overview
        </span>
        <h1 className="font-heading text-3xl font-bold tracking-[-0.03em]">Dashboard</h1>
        <p className="text-sm text-gray-500 leading-relaxed">
          Your portfolio at a glance — watchlist, signals, and market overview.
        </p>
      </div>

      <SummaryCards items={items} isLoading={isLoading} />
      <MarketOverview items={items} isLoading={isLoading} />
      <WatchlistTable items={items} onRemove={remove} isLoading={isLoading} />
    </div>
  );
}
