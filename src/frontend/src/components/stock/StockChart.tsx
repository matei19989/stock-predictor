import { useRef, useEffect, useState, useMemo } from 'react';
import { createChart, ColorType, CandlestickSeries, HistogramSeries } from 'lightweight-charts';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { PricePoint } from '@/types';

type Range = '1M' | '3M' | '6M' | '1Y' | '5Y';

const RANGES: Range[] = ['1M', '3M', '6M', '1Y', '5Y'];

interface StockChartProps {
  prices: PricePoint[];
  isLoading: boolean;
}

function filterByRange(prices: PricePoint[], range: Range): PricePoint[] {
  const now = new Date();
  const cutoff = new Date();
  switch (range) {
    case '1M': cutoff.setMonth(now.getMonth() - 1); break;
    case '3M': cutoff.setMonth(now.getMonth() - 3); break;
    case '6M': cutoff.setMonth(now.getMonth() - 6); break;
    case '1Y': cutoff.setFullYear(now.getFullYear() - 1); break;
    case '5Y': cutoff.setFullYear(now.getFullYear() - 5); break;
  }
  return prices.filter(p => new Date(p.date) >= cutoff);
}

export default function StockChart({ prices, isLoading }: StockChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [range, setRange] = useState<Range>('1Y');

  const filtered = useMemo(() => filterByRange(prices, range), [prices, range]);

  useEffect(() => {
    if (!containerRef.current || filtered.length === 0) return;

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: 400,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#64748b',
      },
      grid: {
        vertLines: { color: '#e2e8f0' },
        horzLines: { color: '#e2e8f0' },
      },
      timeScale: { borderColor: '#e2e8f0' },
      rightPriceScale: { borderColor: '#e2e8f0' },
    });

    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderUpColor: '#22c55e',
      borderDownColor: '#ef4444',
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
    });

    candlestickSeries.setData(
      filtered.map(p => ({
        time: p.date,
        open: Number(p.open),
        high: Number(p.high),
        low: Number(p.low),
        close: Number(p.close),
      }))
    );

    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: '#94a3b8',
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
    });

    chart.priceScale('volume').applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });

    volumeSeries.setData(
      filtered.map(p => ({
        time: p.date,
        value: Number(p.volume),
        color: Number(p.close) >= Number(p.open) ? '#22c55e40' : '#ef444440',
      }))
    );

    chart.timeScale().fitContent();

    const ro = new ResizeObserver(entries => {
      const { width } = entries[0].contentRect;
      chart.applyOptions({ width });
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      chart.remove();
    };
  }, [filtered]);

  if (isLoading) {
    return <Skeleton className="h-[400px] w-full" />;
  }

  if (prices.length === 0) {
    return (
      <div className="flex h-[400px] w-full items-center justify-center text-muted-foreground">
        No price data available
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-1">
        {RANGES.map(r => (
          <Button
            key={r}
            variant={range === r ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setRange(r)}
          >
            {r}
          </Button>
        ))}
      </div>
      <div ref={containerRef} className="h-[400px] w-full" />
    </div>
  );
}
