import type { WatchlistItem } from '@/types';
import { formatPrice } from '@/utils/formatters';

interface Props {
  items: WatchlistItem[];
  onRequestPrediction: (ticker: string) => Promise<void>;
  requestingTicker: string | null;
}

export default function NotPredictedTable({ items, onRequestPrediction, requestingTicker }: Props) {
  if (items.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-gray-500">
        Every stock in your watchlist already has at least one prediction.
      </p>
    );
  }

  const sorted = [...items].sort((a, b) => a.ticker.localeCompare(b.ticker));

  return (
    <div className="rounded-xl border border-white/[0.06] overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-white/[0.02] text-left text-[11px] uppercase tracking-[0.1em] text-gray-500">
          <tr>
            <th className="px-4 py-3">Ticker</th>
            <th className="px-4 py-3">Name</th>
            <th className="px-4 py-3">Last close</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {sorted.map(item => (
            <tr key={item.ticker} className="border-t border-white/[0.04] hover:bg-white/[0.02]">
              <td className="px-4 py-3 font-medium">{item.ticker}</td>
              <td className="px-4 py-3 text-gray-400">{item.name ?? '—'}</td>
              <td className="px-4 py-3 text-gray-400">
                {item.latestClose != null ? formatPrice(item.latestClose) : '—'}
              </td>
              <td className="px-4 py-3 text-right">
                <button
                  type="button"
                  onClick={() => void onRequestPrediction(item.ticker)}
                  disabled={requestingTicker === item.ticker}
                  className="text-xs px-3 py-1.5 rounded-lg bg-purple-500/15 text-purple-300 border border-purple-500/25 hover:bg-purple-500/25 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {requestingTicker === item.ticker ? 'Analyzing…' : 'Get prediction'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
