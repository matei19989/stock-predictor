import { useRef, useEffect, useState, useCallback } from 'react';
import { createChart, ColorType, CandlestickSeries, HistogramSeries, type Range, type Time } from 'lightweight-charts';
import { Skeleton } from '@/components/ui/skeleton';
import type { PricePoint } from '@/types';

type Range = '1M' | '3M' | '6M' | '1Y' | '5Y';

const RANGES: Range[] = ['1M', '3M', '6M', '1Y', '5Y'];

interface StockChartProps {
  prices: PricePoint[];
  isLoading: boolean;
}

function computeCutoffDate(range: Range): string {
  const now = new Date();
  switch (range) {
    case '1M': now.setMonth(now.getMonth() - 1); break;
    case '3M': now.setMonth(now.getMonth() - 3); break;
    case '6M': now.setMonth(now.getMonth() - 6); break;
    case '1Y': now.setFullYear(now.getFullYear() - 1); break;
    case '5Y': now.setFullYear(now.getFullYear() - 5); break;
  }
  return now.toISOString().slice(0, 10);
}

export default function StockChart({ prices, isLoading }: StockChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ReturnType<typeof createChart> | null>(null);
  const [range, setRange] = useState<Range>('1Y');

  // Build chart once with ALL data
  useEffect(() => {
    if (!containerRef.current || prices.length === 0) return;

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: 400,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#4b5563',
      },
      grid: {
        vertLines: { color: 'rgba(255,255,255,0.03)' },
        horzLines: { color: 'rgba(255,255,255,0.03)' },
      },
      timeScale: { borderColor: 'rgba(255,255,255,0.06)' },
      rightPriceScale: { borderColor: 'rgba(255,255,255,0.06)' },
    });

    chartRef.current = chart;

    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderUpColor: '#22c55e',
      borderDownColor: '#ef4444',
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
    });

    candlestickSeries.setData(
      prices.map(p => ({
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
      prices.map(p => ({
        time: p.date,
        value: Number(p.volume),
        color: Number(p.close) >= Number(p.open) ? '#22c55e30' : '#ef444430',
      }))
    );

    const ro = new ResizeObserver(entries => {
      const { width } = entries[0].contentRect;
      chart.applyOptions({ width });
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
    };
  }, [prices]);

  // Set visible range when range button changes
  const applyRange = useCallback((r: Range) => {
    const chart = chartRef.current;
    if (!chart || prices.length === 0) return;
    const from = computeCutoffDate(r);
    const to = prices[prices.length - 1].date;
    chart.timeScale().setVisibleRange({ from, to } as Range<Time>);
  }, [prices]);

  useEffect(() => {
    applyRange(range);
  }, [range, applyRange]);

  if (isLoading) {
    return <Skeleton className="h-[400px] w-full rounded-2xl bg-white/[0.04]" />;
  }

  if (prices.length === 0) {
    return (
      <div className="flex h-[400px] w-full items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.02] text-gray-600">
        No price data available
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-1">
        {RANGES.map(r => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${
              range === r
                ? 'bg-purple-500/15 text-purple-300 border border-purple-500/25'
                : 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.04] border border-transparent'
            }`}
          >
            {r}
          </button>
        ))}
      </div>
      <div className="rounded-[1.5rem] bg-white/[0.03] p-1 ring-1 ring-white/[0.06]">
        <div className="rounded-[calc(1.5rem-0.25rem)] bg-white/[0.02] overflow-hidden shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] p-2">
          <div ref={containerRef} className="h-[400px] w-full" />
        </div>
      </div>
    </div>
  );
}
