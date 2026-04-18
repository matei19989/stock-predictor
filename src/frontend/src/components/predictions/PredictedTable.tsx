import { Link } from 'react-router';
import type { UserPrediction } from '@/types';
import SignalBadge from '@/components/common/SignalBadge';
import { formatRelativeTime } from '@/utils/formatters';
import { HORIZON_LABELS } from '@/utils/constants';

interface Props {
  items: UserPrediction[];
}

export default function PredictedTable({ items }: Props) {
  if (items.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-gray-500">
        You haven't generated any predictions yet.
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
            <th className="px-4 py-3">Horizon</th>
            <th className="px-4 py-3">Signal</th>
            <th className="px-4 py-3">Confidence</th>
            <th className="px-4 py-3">Predicted</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {sorted.map(p => (
            <tr key={`${p.ticker}-${p.horizon}`} className="border-t border-white/[0.04] hover:bg-white/[0.02]">
              <td className="px-4 py-3 font-medium">{p.ticker}</td>
              <td className="px-4 py-3 text-gray-400">{HORIZON_LABELS[p.horizon]}</td>
              <td className="px-4 py-3">
                {p.signal ? <SignalBadge signal={p.signal} size="sm" /> : <span className="text-gray-500">expired</span>}
              </td>
              <td className="px-4 py-3 text-gray-400">
                {p.confidence != null ? `${(p.confidence * 100).toFixed(0)}%` : '—'}
              </td>
              <td className="px-4 py-3 text-gray-500">{formatRelativeTime(p.predictedAt)}</td>
              <td className="px-4 py-3 text-right">
                <Link to={`/stocks/${p.ticker}`} className="text-xs text-purple-400 hover:text-purple-300">
                  View →
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
