'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface KLineChartProps {
  stockId: string;
}

type TimeRange = '1m' | '3m' | '6m' | '1y' | '2y';

type MAKey = 'ma5' | 'ma10' | 'ma20' | 'ma60' | 'ma120' | 'ma240';

type SubplotKey = 'rsi' | 'macd' | 'kd' | 'bollinger';

interface PriceData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  spread: number;
}

interface MAData {
  date: string;
  value: number;
}

interface RSIData {
  date: string;
  value: number;
}

interface MACDData {
  date: string;
  dif: number;
  signal: number;
  histogram: number;
}

interface KDData {
  date: string;
  k: number;
  d: number;
}

interface BollingerData {
  date: string;
  upper: number;
  middle: number;
  lower: number;
}

interface IndicatorsResponse {
  ma5?: MAData[];
  ma10?: MAData[];
  ma20?: MAData[];
  ma60?: MAData[];
  ma120?: MAData[];
  ma240?: MAData[];
  rsi?: RSIData[];
  macd?: MACDData[];
  kd?: KDData[];
  bollinger?: BollingerData[];
}

interface APIResponse {
  data: {
    prices: PriceData[];
    indicators: IndicatorsResponse;
  };
}

interface CrosshairData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  change: number;
  changePercent: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const TIME_RANGES: { key: TimeRange; label: string }[] = [
  { key: '1m', label: '1M' },
  { key: '3m', label: '3M' },
  { key: '6m', label: '6M' },
  { key: '1y', label: '1Y' },
  { key: '2y', label: '2Y' },
];

const MA_KEYS: { key: MAKey; label: string; color: string }[] = [
  { key: 'ma5', label: 'MA5', color: '#FACC15' },
  { key: 'ma10', label: 'MA10', color: '#F97316' },
  { key: 'ma20', label: 'MA20', color: '#3B82F6' },
  { key: 'ma60', label: 'MA60', color: '#A855F7' },
  { key: 'ma120', label: 'MA120', color: '#EC4899' },
  { key: 'ma240', label: 'MA240', color: '#14B8A6' },
];

const SUBPLOT_KEYS: { key: SubplotKey; label: string }[] = [
  { key: 'rsi', label: 'RSI' },
  { key: 'macd', label: 'MACD' },
  { key: 'kd', label: 'KD' },
  { key: 'bollinger', label: 'Bollinger' },
];

const MA_COLORS: Record<MAKey, string> = {
  ma5: '#FACC15',
  ma10: '#F97316',
  ma20: '#3B82F6',
  ma60: '#A855F7',
  ma120: '#EC4899',
  ma240: '#14B8A6',
};

const CHART_BG = '#0F172A';
const CHART_TEXT = '#94A3B8';
const CHART_GRID = '#1E293B';
const CHART_BORDER = '#334155';

// ─── Helper: create chart options ────────────────────────────────────────────

function makeChartOptions(width: number, height: number, showTimeScale: boolean) {
  return {
    width,
    height,
    layout: {
      background: { color: CHART_BG },
      textColor: CHART_TEXT,
    },
    grid: {
      vertLines: { color: CHART_GRID },
      horzLines: { color: CHART_GRID },
    },
    rightPriceScale: {
      borderColor: CHART_BORDER,
    },
    timeScale: {
      borderColor: CHART_BORDER,
      visible: showTimeScale,
    },
    crosshair: {
      mode: 0, // Normal crosshair mode
    },
  };
}

// ─── Helper: format volume ───────────────────────────────────────────────────

function formatVolume(v: number): string {
  if (v >= 1e8) return (v / 1e8).toFixed(2) + '億';
  if (v >= 1e4) return (v / 1e4).toFixed(0) + '萬';
  return v.toLocaleString();
}

// ─── Component ───────────────────────────────────────────────────────────────

export function KLineChart({ stockId }: KLineChartProps) {
  // State
  const [range, setRange] = useState<TimeRange>('6m');
  const [enabledMAs, setEnabledMAs] = useState<Set<MAKey>>(new Set(['ma5', 'ma20']));
  const [enabledSubplots, setEnabledSubplots] = useState<Set<SubplotKey>>(new Set());
  const [loading, setLoading] = useState(false);
  const [crosshairData, setCrosshairData] = useState<CrosshairData | null>(null);

  // Refs for chart containers
  const mainContainerRef = useRef<HTMLDivElement>(null);
  const rsiContainerRef = useRef<HTMLDivElement>(null);
  const macdContainerRef = useRef<HTMLDivElement>(null);
  const kdContainerRef = useRef<HTMLDivElement>(null);

  // Refs for chart instances (use any to avoid complex generics with dynamic import)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mainChartRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rsiChartRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const macdChartRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const kdChartRef = useRef<any>(null);

  // Refs for series needed for crosshair sync
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mainCandleSeriesRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rsiLineSeriesRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const macdDifSeriesRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const kdKSeriesRef = useRef<any>(null);

  // Store prices for crosshair lookup
  const pricesRef = useRef<PriceData[]>([]);

  // Toggle handlers
  const toggleMA = useCallback((key: MAKey) => {
    setEnabledMAs((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const toggleSubplot = useCallback((key: SubplotKey) => {
    setEnabledSubplots((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  // Build indicators query string
  const indicatorsParam = useCallback(() => {
    const parts: string[] = [];
    enabledMAs.forEach((ma) => parts.push(ma));
    if (enabledSubplots.has('rsi')) parts.push('rsi');
    if (enabledSubplots.has('macd')) parts.push('macd');
    if (enabledSubplots.has('kd')) parts.push('kd');
    if (enabledSubplots.has('bollinger')) parts.push('bollinger');
    return parts.join(',');
  }, [enabledMAs, enabledSubplots]);

  // ─── Main chart rendering effect ────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function renderCharts() {
      if (!mainContainerRef.current) return;
      setLoading(true);

      try {
        // Build URL
        const indParam = indicatorsParam();
        let url = `/api/stocks/${stockId}/prices?range=${range}`;
        if (indParam) url += `&indicators=${indParam}`;

        const res = await fetch(url);
        if (!res.ok || cancelled) return;
        const json: APIResponse = await res.json();
        const { prices, indicators } = json.data;

        if (cancelled || prices.length === 0) {
          setLoading(false);
          return;
        }

        pricesRef.current = prices;

        // Dynamic import
        const { createChart, CandlestickSeries, LineSeries, HistogramSeries } =
          await import('lightweight-charts');

        if (cancelled) return;

        // ─── Cleanup previous charts ─────────────────────────────────────
        if (mainChartRef.current) {
          mainChartRef.current.remove();
          mainChartRef.current = null;
        }
        if (rsiChartRef.current) {
          rsiChartRef.current.remove();
          rsiChartRef.current = null;
        }
        if (macdChartRef.current) {
          macdChartRef.current.remove();
          macdChartRef.current = null;
        }
        if (kdChartRef.current) {
          kdChartRef.current.remove();
          kdChartRef.current = null;
        }

        mainCandleSeriesRef.current = null;
        rsiLineSeriesRef.current = null;
        macdDifSeriesRef.current = null;
        kdKSeriesRef.current = null;

        if (cancelled || !mainContainerRef.current) return;

        // ─── MAIN CHART ──────────────────────────────────────────────────
        const hasSubplots =
          enabledSubplots.has('rsi') ||
          enabledSubplots.has('macd') ||
          enabledSubplots.has('kd');

        const mainContainer = mainContainerRef.current;
        const mainChart = createChart(
          mainContainer,
          makeChartOptions(
            mainContainer.clientWidth,
            400,
            !hasSubplots
          )
        );
        mainChartRef.current = mainChart;

        // Candlestick series
        const candleSeries = mainChart.addSeries(CandlestickSeries, {
          upColor: '#EF4444',
          downColor: '#22C55E',
          borderUpColor: '#EF4444',
          borderDownColor: '#22C55E',
          wickUpColor: '#EF4444',
          wickDownColor: '#22C55E',
        });
        mainCandleSeriesRef.current = candleSeries;

        const candleData = prices.map((p) => ({
          time: p.date,
          open: p.open,
          high: p.high,
          low: p.low,
          close: p.close,
        }));
        candleSeries.setData(candleData as Parameters<typeof candleSeries.setData>[0]);

        // Volume histogram
        const volumeSeries = mainChart.addSeries(HistogramSeries, {
          priceFormat: { type: 'volume' as const },
          priceScaleId: 'volume',
        });
        mainChart.priceScale('volume').applyOptions({
          scaleMargins: { top: 0.8, bottom: 0 },
        });

        const volumeData = prices.map((p) => ({
          time: p.date,
          value: p.volume,
          color: p.spread >= 0 ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)',
        }));
        volumeSeries.setData(volumeData as Parameters<typeof volumeSeries.setData>[0]);

        // MA overlays
        for (const maKey of Array.from(enabledMAs)) {
          const maData = indicators[maKey] as MAData[] | undefined;
          if (maData && maData.length > 0) {
            const maSeries = mainChart.addSeries(LineSeries, {
              color: MA_COLORS[maKey],
              lineWidth: 1,
              priceScaleId: 'right',
            });
            const lineData = maData.map((d) => ({ time: d.date, value: d.value }));
            maSeries.setData(lineData as Parameters<typeof maSeries.setData>[0]);
          }
        }

        // Bollinger bands
        if (enabledSubplots.has('bollinger') && indicators.bollinger && indicators.bollinger.length > 0) {
          const bollData = indicators.bollinger;

          // Middle band
          const middleSeries = mainChart.addSeries(LineSeries, {
            color: '#3B82F6',
            lineWidth: 1,
            priceScaleId: 'right',
          });
          middleSeries.setData(
            bollData.map((d) => ({ time: d.date, value: d.middle })) as Parameters<typeof middleSeries.setData>[0]
          );

          // Upper band
          const upperSeries = mainChart.addSeries(LineSeries, {
            color: 'rgba(59, 130, 246, 0.5)',
            lineWidth: 1,
            lineStyle: 2, // dashed
            priceScaleId: 'right',
          });
          upperSeries.setData(
            bollData.map((d) => ({ time: d.date, value: d.upper })) as Parameters<typeof upperSeries.setData>[0]
          );

          // Lower band
          const lowerSeries = mainChart.addSeries(LineSeries, {
            color: 'rgba(59, 130, 246, 0.5)',
            lineWidth: 1,
            lineStyle: 2,
            priceScaleId: 'right',
          });
          lowerSeries.setData(
            bollData.map((d) => ({ time: d.date, value: d.lower })) as Parameters<typeof lowerSeries.setData>[0]
          );
        }

        // Crosshair move handler for legend
        mainChart.subscribeCrosshairMove((param) => {
          if (!param.time || !param.seriesData) {
            setCrosshairData(null);
            return;
          }

          const dateStr = param.time as string;
          const price = pricesRef.current.find((p) => p.date === dateStr);
          if (!price) {
            setCrosshairData(null);
            return;
          }

          const change = price.close - price.open;
          const changePercent = price.open !== 0 ? ((change / price.open) * 100).toFixed(2) : '0.00';

          setCrosshairData({
            date: price.date,
            open: price.open,
            high: price.high,
            low: price.low,
            close: price.close,
            volume: price.volume,
            change,
            changePercent,
          });
        });

        mainChart.timeScale().fitContent();

        // ─── RSI SUBPLOT ─────────────────────────────────────────────────
        if (enabledSubplots.has('rsi') && rsiContainerRef.current && indicators.rsi && indicators.rsi.length > 0) {
          const rsiContainer = rsiContainerRef.current;
          const hasMoreSubplots = enabledSubplots.has('macd') || enabledSubplots.has('kd');
          const rsiChart = createChart(
            rsiContainer,
            makeChartOptions(rsiContainer.clientWidth, 120, !hasMoreSubplots)
          );
          rsiChartRef.current = rsiChart;

          // RSI line
          const rsiSeries = rsiChart.addSeries(LineSeries, {
            color: '#FACC15',
            lineWidth: 1,
            priceScaleId: 'right',
          });
          rsiLineSeriesRef.current = rsiSeries;

          const rsiLineData = indicators.rsi.map((d) => ({ time: d.date, value: d.value }));
          rsiSeries.setData(rsiLineData as Parameters<typeof rsiSeries.setData>[0]);

          // Reference lines at 30 and 70
          const rsiRef30 = rsiChart.addSeries(LineSeries, {
            color: '#4B5563',
            lineWidth: 1,
            lineStyle: 2,
            priceScaleId: 'right',
            crosshairMarkerVisible: false,
            lastValueVisible: false,
            priceLineVisible: false,
          });
          rsiRef30.setData(
            indicators.rsi.map((d) => ({ time: d.date, value: 30 })) as Parameters<typeof rsiRef30.setData>[0]
          );

          const rsiRef70 = rsiChart.addSeries(LineSeries, {
            color: '#4B5563',
            lineWidth: 1,
            lineStyle: 2,
            priceScaleId: 'right',
            crosshairMarkerVisible: false,
            lastValueVisible: false,
            priceLineVisible: false,
          });
          rsiRef70.setData(
            indicators.rsi.map((d) => ({ time: d.date, value: 70 })) as Parameters<typeof rsiRef70.setData>[0]
          );

          rsiChart.priceScale('right').applyOptions({
            scaleMargins: { top: 0.05, bottom: 0.05 },
          });

          rsiChart.timeScale().fitContent();

          // Sync crosshair from main to RSI
          mainChart.subscribeCrosshairMove((param) => {
            if (param.time && rsiLineSeriesRef.current && rsiChartRef.current) {
              try {
                const data = rsiLineSeriesRef.current.dataByIndex(0);
                if (data) {
                  rsiChartRef.current.setCrosshairPosition(
                    NaN,
                    param.time,
                    rsiLineSeriesRef.current
                  );
                }
              } catch {
                // ignore sync errors
              }
            } else if (rsiChartRef.current) {
              rsiChartRef.current.clearCrosshairPosition();
            }
          });
        }

        // ─── MACD SUBPLOT ────────────────────────────────────────────────
        if (enabledSubplots.has('macd') && macdContainerRef.current && indicators.macd && indicators.macd.length > 0) {
          const macdContainer = macdContainerRef.current;
          const hasKD = enabledSubplots.has('kd');
          const macdChart = createChart(
            macdContainer,
            makeChartOptions(macdContainer.clientWidth, 120, !hasKD)
          );
          macdChartRef.current = macdChart;

          // DIF line
          const difSeries = macdChart.addSeries(LineSeries, {
            color: '#3B82F6',
            lineWidth: 1,
            priceScaleId: 'right',
          });
          macdDifSeriesRef.current = difSeries;

          difSeries.setData(
            indicators.macd.map((d) => ({ time: d.date, value: d.dif })) as Parameters<typeof difSeries.setData>[0]
          );

          // Signal line
          const signalSeries = macdChart.addSeries(LineSeries, {
            color: '#F97316',
            lineWidth: 1,
            priceScaleId: 'right',
          });
          signalSeries.setData(
            indicators.macd.map((d) => ({ time: d.date, value: d.signal })) as Parameters<typeof signalSeries.setData>[0]
          );

          // Histogram
          const histSeries = macdChart.addSeries(HistogramSeries, {
            priceScaleId: 'macdHist',
          });
          macdChart.priceScale('macdHist').applyOptions({
            scaleMargins: { top: 0.6, bottom: 0 },
          });

          histSeries.setData(
            indicators.macd.map((d) => ({
              time: d.date,
              value: d.histogram,
              color: d.histogram >= 0 ? '#EF4444' : '#22C55E',
            })) as Parameters<typeof histSeries.setData>[0]
          );

          macdChart.timeScale().fitContent();

          // Sync crosshair from main to MACD
          mainChart.subscribeCrosshairMove((param) => {
            if (param.time && macdDifSeriesRef.current && macdChartRef.current) {
              try {
                macdChartRef.current.setCrosshairPosition(
                  NaN,
                  param.time,
                  macdDifSeriesRef.current
                );
              } catch {
                // ignore sync errors
              }
            } else if (macdChartRef.current) {
              macdChartRef.current.clearCrosshairPosition();
            }
          });
        }

        // ─── KD SUBPLOT ─────────────────────────────────────────────────
        if (enabledSubplots.has('kd') && kdContainerRef.current && indicators.kd && indicators.kd.length > 0) {
          const kdContainer = kdContainerRef.current;
          const kdChart = createChart(
            kdContainer,
            makeChartOptions(kdContainer.clientWidth, 120, true)
          );
          kdChartRef.current = kdChart;

          // K line
          const kSeries = kdChart.addSeries(LineSeries, {
            color: '#3B82F6',
            lineWidth: 1,
            priceScaleId: 'right',
          });
          kdKSeriesRef.current = kSeries;

          kSeries.setData(
            indicators.kd.map((d) => ({ time: d.date, value: d.k })) as Parameters<typeof kSeries.setData>[0]
          );

          // D line
          const dSeries = kdChart.addSeries(LineSeries, {
            color: '#F97316',
            lineWidth: 1,
            priceScaleId: 'right',
          });
          dSeries.setData(
            indicators.kd.map((d) => ({ time: d.date, value: d.d })) as Parameters<typeof dSeries.setData>[0]
          );

          // Reference lines at 20 and 80
          const kdRef20 = kdChart.addSeries(LineSeries, {
            color: '#4B5563',
            lineWidth: 1,
            lineStyle: 2,
            priceScaleId: 'right',
            crosshairMarkerVisible: false,
            lastValueVisible: false,
            priceLineVisible: false,
          });
          kdRef20.setData(
            indicators.kd.map((d) => ({ time: d.date, value: 20 })) as Parameters<typeof kdRef20.setData>[0]
          );

          const kdRef80 = kdChart.addSeries(LineSeries, {
            color: '#4B5563',
            lineWidth: 1,
            lineStyle: 2,
            priceScaleId: 'right',
            crosshairMarkerVisible: false,
            lastValueVisible: false,
            priceLineVisible: false,
          });
          kdRef80.setData(
            indicators.kd.map((d) => ({ time: d.date, value: 80 })) as Parameters<typeof kdRef80.setData>[0]
          );

          kdChart.priceScale('right').applyOptions({
            scaleMargins: { top: 0.05, bottom: 0.05 },
          });

          kdChart.timeScale().fitContent();

          // Sync crosshair from main to KD
          mainChart.subscribeCrosshairMove((param) => {
            if (param.time && kdKSeriesRef.current && kdChartRef.current) {
              try {
                kdChartRef.current.setCrosshairPosition(
                  NaN,
                  param.time,
                  kdKSeriesRef.current
                );
              } catch {
                // ignore sync errors
              }
            } else if (kdChartRef.current) {
              kdChartRef.current.clearCrosshairPosition();
            }
          });
        }

        // ─── Sync time scales: scroll sync from main to subplots ─────────
        const syncingRef = { current: false };

        mainChart.timeScale().subscribeVisibleLogicalRangeChange((logicalRange) => {
          if (syncingRef.current || !logicalRange) return;
          syncingRef.current = true;
          try {
            if (rsiChartRef.current) {
              rsiChartRef.current.timeScale().setVisibleLogicalRange(logicalRange);
            }
            if (macdChartRef.current) {
              macdChartRef.current.timeScale().setVisibleLogicalRange(logicalRange);
            }
            if (kdChartRef.current) {
              kdChartRef.current.timeScale().setVisibleLogicalRange(logicalRange);
            }
          } catch {
            // ignore
          } finally {
            syncingRef.current = false;
          }
        });

        // Sync from subplots back to main (one-way guard)
        const syncFromSubplot = (logicalRange: { from: number; to: number } | null) => {
          if (syncingRef.current || !logicalRange) return;
          syncingRef.current = true;
          try {
            mainChart.timeScale().setVisibleLogicalRange(logicalRange);
            if (rsiChartRef.current) {
              rsiChartRef.current.timeScale().setVisibleLogicalRange(logicalRange);
            }
            if (macdChartRef.current) {
              macdChartRef.current.timeScale().setVisibleLogicalRange(logicalRange);
            }
            if (kdChartRef.current) {
              kdChartRef.current.timeScale().setVisibleLogicalRange(logicalRange);
            }
          } catch {
            // ignore
          } finally {
            syncingRef.current = false;
          }
        };

        if (rsiChartRef.current) {
          rsiChartRef.current.timeScale().subscribeVisibleLogicalRangeChange(syncFromSubplot);
        }
        if (macdChartRef.current) {
          macdChartRef.current.timeScale().subscribeVisibleLogicalRangeChange(syncFromSubplot);
        }
        if (kdChartRef.current) {
          kdChartRef.current.timeScale().subscribeVisibleLogicalRangeChange(syncFromSubplot);
        }
      } catch {
        // silently fail
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    renderCharts();

    return () => {
      cancelled = true;
      if (mainChartRef.current) {
        mainChartRef.current.remove();
        mainChartRef.current = null;
      }
      if (rsiChartRef.current) {
        rsiChartRef.current.remove();
        rsiChartRef.current = null;
      }
      if (macdChartRef.current) {
        macdChartRef.current.remove();
        macdChartRef.current = null;
      }
      if (kdChartRef.current) {
        kdChartRef.current.remove();
        kdChartRef.current = null;
      }
      mainCandleSeriesRef.current = null;
      rsiLineSeriesRef.current = null;
      macdDifSeriesRef.current = null;
      kdKSeriesRef.current = null;
    };
  }, [stockId, range, enabledMAs, enabledSubplots, indicatorsParam]);

  // ─── Resize observer ──────────────────────────────────────────────────────
  useEffect(() => {
    const containers = [
      { ref: mainContainerRef, chart: mainChartRef },
      { ref: rsiContainerRef, chart: rsiChartRef },
      { ref: macdContainerRef, chart: macdChartRef },
      { ref: kdContainerRef, chart: kdChartRef },
    ];

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width } = entry.contentRect;
        for (const { ref, chart } of containers) {
          if (ref.current === entry.target && chart.current) {
            chart.current.resize(width, chart.current.options().height);
          }
        }
      }
    });

    for (const { ref } of containers) {
      if (ref.current) {
        observer.observe(ref.current);
      }
    }

    return () => {
      observer.disconnect();
    };
  }, [enabledSubplots]);

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="rounded-lg border border-[#1E293B] bg-[#0F172A] p-4">
      {/* Controls */}
      <div className="mb-3 space-y-2">
        {/* Time range buttons */}
        <div className="flex items-center gap-1">
          <span className="mr-2 text-xs text-[#94A3B8]">區間</span>
          {TIME_RANGES.map((tr) => (
            <button
              key={tr.key}
              onClick={() => setRange(tr.key)}
              className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                range === tr.key
                  ? 'bg-blue-600 text-white'
                  : 'bg-[#1E293B] text-[#94A3B8] hover:bg-[#334155] hover:text-[#F8FAFC]'
              }`}
            >
              {tr.label}
            </button>
          ))}
        </div>

        {/* MA toggles */}
        <div className="flex items-center gap-1">
          <span className="mr-2 text-xs text-[#94A3B8]">均線</span>
          {MA_KEYS.map((ma) => (
            <button
              key={ma.key}
              onClick={() => toggleMA(ma.key)}
              className={`rounded px-2 py-0.5 text-xs font-medium transition-colors ${
                enabledMAs.has(ma.key)
                  ? 'text-white'
                  : 'bg-[#1E293B] text-[#94A3B8] hover:bg-[#334155]'
              }`}
              style={
                enabledMAs.has(ma.key)
                  ? { backgroundColor: ma.color, opacity: 0.9 }
                  : undefined
              }
            >
              {ma.label}
            </button>
          ))}
        </div>

        {/* Subplot toggles */}
        <div className="flex items-center gap-1">
          <span className="mr-2 text-xs text-[#94A3B8]">指標</span>
          {SUBPLOT_KEYS.map((sp) => (
            <button
              key={sp.key}
              onClick={() => toggleSubplot(sp.key)}
              className={`rounded px-2.5 py-0.5 text-xs font-medium transition-colors ${
                enabledSubplots.has(sp.key)
                  ? 'bg-blue-600 text-white'
                  : 'bg-[#1E293B] text-[#94A3B8] hover:bg-[#334155] hover:text-[#F8FAFC]'
              }`}
            >
              {sp.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart area */}
      <div className="relative">
        {/* Loading overlay */}
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#0F172A]/80">
            <span className="text-sm text-[#94A3B8]">載入中...</span>
          </div>
        )}

        {/* Crosshair legend */}
        {crosshairData && (
          <div className="absolute left-2 top-2 z-20 flex flex-wrap items-center gap-x-3 gap-y-0.5 rounded bg-[#0F172A]/90 px-2 py-1 text-xs">
            <span className="text-[#94A3B8]">{crosshairData.date}</span>
            <span className="text-[#F8FAFC]">
              開 <span className="font-medium">{crosshairData.open.toFixed(2)}</span>
            </span>
            <span className="text-[#F8FAFC]">
              高 <span className="font-medium">{crosshairData.high.toFixed(2)}</span>
            </span>
            <span className="text-[#F8FAFC]">
              低 <span className="font-medium">{crosshairData.low.toFixed(2)}</span>
            </span>
            <span className="text-[#F8FAFC]">
              收 <span className="font-medium">{crosshairData.close.toFixed(2)}</span>
            </span>
            <span className={crosshairData.change >= 0 ? 'text-[#EF4444]' : 'text-[#22C55E]'}>
              {crosshairData.change >= 0 ? '+' : ''}{crosshairData.change.toFixed(2)} ({crosshairData.changePercent}%)
            </span>
            <span className="text-[#94A3B8]">
              量 {formatVolume(crosshairData.volume)}
            </span>
          </div>
        )}

        {/* Main chart container */}
        <div ref={mainContainerRef} className="w-full" style={{ height: 400 }} />

        {/* RSI subplot container */}
        {enabledSubplots.has('rsi') && (
          <div ref={rsiContainerRef} className="w-full border-t border-[#1E293B]" style={{ height: 120 }}>
            <div className="absolute right-12 mt-1 text-[10px] text-[#94A3B8]">RSI</div>
          </div>
        )}

        {/* MACD subplot container */}
        {enabledSubplots.has('macd') && (
          <div ref={macdContainerRef} className="w-full border-t border-[#1E293B]" style={{ height: 120 }}>
            <div className="absolute right-12 mt-1 text-[10px] text-[#94A3B8]">MACD</div>
          </div>
        )}

        {/* KD subplot container */}
        {enabledSubplots.has('kd') && (
          <div ref={kdContainerRef} className="w-full border-t border-[#1E293B]" style={{ height: 120 }}>
            <div className="absolute right-12 mt-1 text-[10px] text-[#94A3B8]">KD</div>
          </div>
        )}
      </div>
    </div>
  );
}
