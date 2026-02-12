'use client';

import { useEffect, useRef, useState } from 'react';

interface PriceData {
  date: string;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
  volume: number | null;
  spread: number | null;
}

interface MiniChartProps {
  stockId: string | null;
}

function calculateMA(data: PriceData[], period: number): { time: string; value: number }[] {
  const result: { time: string; value: number }[] = [];
  for (let i = period - 1; i < data.length; i++) {
    let sum = 0;
    let count = 0;
    for (let j = i - period + 1; j <= i; j++) {
      if (data[j].close !== null) {
        sum += data[j].close!;
        count++;
      }
    }
    if (count === period) {
      result.push({
        time: data[i].date,
        value: Math.round((sum / period) * 100) / 100,
      });
    }
  }
  return result;
}

export function MiniChart({ stockId }: MiniChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ReturnType<typeof import('lightweight-charts').createChart> | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!stockId || !containerRef.current) return;

    let cancelled = false;

    async function renderChart() {
      if (!containerRef.current) return;

      setLoading(true);

      try {
        // Fetch price data
        const res = await fetch(`/api/stocks/${stockId}/prices?days=60`);
        if (!res.ok || cancelled) return;
        const json = await res.json();
        const prices: PriceData[] = json.data ?? [];

        if (cancelled || prices.length === 0) {
          setLoading(false);
          return;
        }

        // Dynamic import of lightweight-charts (client-only)
        const { createChart, CandlestickSeries, LineSeries, HistogramSeries } =
          await import('lightweight-charts');

        if (cancelled || !containerRef.current) return;

        // Remove previous chart
        if (chartRef.current) {
          chartRef.current.remove();
          chartRef.current = null;
        }

        const chart = createChart(containerRef.current, {
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
          layout: {
            background: { color: '#1E293B' },
            textColor: '#94A3B8',
          },
          grid: {
            vertLines: { color: '#1E293B' },
            horzLines: { color: '#334155' },
          },
          rightPriceScale: {
            borderColor: '#334155',
          },
          timeScale: {
            borderColor: '#334155',
          },
        });

        chartRef.current = chart;

        // Candlestick series
        const candleSeries = chart.addSeries(CandlestickSeries, {
          upColor: '#EF4444',
          downColor: '#22C55E',
          borderUpColor: '#EF4444',
          borderDownColor: '#22C55E',
          wickUpColor: '#EF4444',
          wickDownColor: '#22C55E',
        });

        const candleData = prices
          .filter((p) => p.open !== null && p.high !== null && p.low !== null && p.close !== null)
          .map((p) => ({
            time: p.date,
            open: p.open!,
            high: p.high!,
            low: p.low!,
            close: p.close!,
          }));

        candleSeries.setData(candleData as Parameters<typeof candleSeries.setData>[0]);

        // MA5 line (yellow)
        const ma5Data = calculateMA(prices, 5);
        if (ma5Data.length > 0) {
          const ma5Series = chart.addSeries(LineSeries, {
            color: '#FACC15',
            lineWidth: 1,
          });
          ma5Series.setData(ma5Data as Parameters<typeof ma5Series.setData>[0]);
        }

        // MA20 line (blue)
        const ma20Data = calculateMA(prices, 20);
        if (ma20Data.length > 0) {
          const ma20Series = chart.addSeries(LineSeries, {
            color: '#3B82F6',
            lineWidth: 1,
          });
          ma20Series.setData(ma20Data as Parameters<typeof ma20Series.setData>[0]);
        }

        // Volume histogram
        const volumeSeries = chart.addSeries(HistogramSeries, {
          priceFormat: { type: 'volume' },
          priceScaleId: 'volume',
        });

        chart.priceScale('volume').applyOptions({
          scaleMargins: {
            top: 0.8,
            bottom: 0,
          },
        });

        const volumeData = prices
          .filter((p) => p.volume !== null && p.close !== null)
          .map((p) => ({
            time: p.date,
            value: p.volume!,
            color: (p.spread ?? 0) >= 0 ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)',
          }));

        volumeSeries.setData(volumeData as Parameters<typeof volumeSeries.setData>[0]);

        chart.timeScale().fitContent();
      } catch {
        // silently fail
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    renderChart();

    return () => {
      cancelled = true;
    };
  }, [stockId]);

  // Handle resize
  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (chartRef.current) {
          const { width, height } = entry.contentRect;
          chartRef.current.resize(width, height);
        }
      }
    });

    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
    };
  }, []);

  // Cleanup chart on unmount
  useEffect(() => {
    return () => {
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, []);

  if (!stockId) {
    return (
      <div className="flex h-full min-h-[300px] items-center justify-center rounded-lg border border-[#1E293B] bg-[#1E293B]">
        <span className="text-sm text-[#94A3B8]">選擇股票以顯示K線圖</span>
      </div>
    );
  }

  return (
    <div className="relative h-full min-h-[300px] rounded-lg border border-[#1E293B] bg-[#1E293B]">
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#1E293B]/80">
          <span className="text-sm text-[#94A3B8]">載入中...</span>
        </div>
      )}
      <div ref={containerRef} className="h-full w-full" />
    </div>
  );
}
