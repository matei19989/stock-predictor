import { formatPrice, formatVolume } from '@/utils/formatters';
import type { PricePoint } from '@/types';

interface PriceSummaryProps {
  prices: PricePoint[];
}

export default function PriceSummary({ prices }: PriceSummaryProps) {
  if (prices.length === 0) return null;

  const yearPrices = prices.slice(-252);
  const high52w = Math.max(...yearPrices.map(p => Number(p.high)));
  const low52w = Math.min(...yearPrices.map(p => Number(p.low)));
  const avgVolume = yearPrices.reduce((sum, p) => sum + Number(p.volume), 0) / yearPrices.length;

  const stats = [
    { label: '52-Week High', value: formatPrice(high52w) },
    { label: '52-Week Low', value: formatPrice(low52w) },
    { label: 'Avg Volume', value: formatVolume(avgVolume) },
  ];

  return (
    <div className="rounded-[1.5rem] bg-white/[0.03] p-1 ring-1 ring-white/[0.06]">
      <div className="rounded-[calc(1.5rem-0.25rem)] bg-white/[0.03] overflow-hidden shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
        <div className="px-6 pt-6 pb-2 border-b border-white/[0.06]">
          <span className="text-[11px] uppercase tracking-[0.15em] font-medium text-gray-500">
            Price Summary
          </span>
        </div>
        <div className="px-6 py-6">
          <div className="grid grid-cols-3 gap-4">
            {stats.map(({ label, value }) => (
              <div key={label} className="space-y-1">
                <p className="text-[11px] uppercase tracking-[0.1em] text-gray-500">{label}</p>
                <p className="font-heading text-xl font-bold tracking-[-0.03em] tabular-nums">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
