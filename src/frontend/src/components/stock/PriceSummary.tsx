import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">Price Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4">
          {stats.map(({ label, value }) => (
            <div key={label}>
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="text-lg font-semibold tabular-nums">{value}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
