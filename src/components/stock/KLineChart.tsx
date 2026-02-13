'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type {
  MAKey,
  TechnicalSubplotKey,
  ChipsOverlayKey,
  PriceData,
  MAData,
  IndicatorsResponse,
  OverlayData,
  CrosshairData,
} from './types';
import { MA_COLORS } from './types';

// ─── Props ──────────────────────────────────────────────────────────────────

export interface KLineChartProps {
  stockId: string;
  priceData: PriceData[];
  indicators: IndicatorsResponse;
  loading: boolean;
  enabledMAs: Set<MAKey>;
  enabledSubplots: Set<TechnicalSubplotKey>;
  overlayData: OverlayData;
  enabledOverlays: Set<ChipsOverlayKey>;
}

// ─── Local Constants ────────────────────────────────────────────────────────

const CHART_BG = '#0F172A';
const CHART_TEXT = '#94A3B8';
const CHART_GRID = '#1E293B';
const CHART_BORDER = '#334155';

const SUBPLOT_ORDER = ['rsi', 'macd', 'kd', 'foreign', 'trust', 'dealer', 'margin'] as const;
type SubplotKey = (typeof SUBPLOT_ORDER)[number];

// Subplot display config
const SUBPLOT_CONFIG: Record<SubplotKey, { label: string; color: string; height: number }> = {
  rsi:     { label: 'RSI',    color: '#FACC15', height: 120 },
  macd:    { label: 'MACD',   color: '#3B82F6', height: 120 },
  kd:      { label: 'KD',     color: '#3B82F6', height: 120 },
  foreign: { label: '外資',   color: '#3B82F6', height: 150 },
  trust:   { label: '投信',   color: '#F97316', height: 150 },
  dealer:  { label: '自營商', color: '#A855F7', height: 150 },
  margin:  { label: '融資融券', color: '#EF4444', height: 150 },
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeChartOptions(width: number, height: number, showTimeScale: boolean, interactive = true) {
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
      mode: 0,
    },
    handleScroll: interactive,
    handleScale: interactive,
  };
}

function formatVolume(v: number): string {
  if (v >= 1e8) return (v / 1e8).toFixed(2) + '\u5104';
  if (v >= 1e4) return (v / 1e4).toFixed(0) + '\u842C';
  return v.toLocaleString();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function addReferenceLines(chart: any, LineSeries: any, dates: string[], values: number[]) {
  for (const val of values) {
    const series = chart.addSeries(LineSeries, {
      color: '#4B5563',
      lineWidth: 1,
      lineStyle: 2,
      priceScaleId: 'right',
      crosshairMarkerVisible: false,
      lastValueVisible: false,
      priceLineVisible: false,
    });
    series.setData(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      dates.map((d) => ({ time: d, value: val })) as any
    );
  }
}

// ─── Component ──────────────────────────────────────────────────────────────

export function KLineChart({
  priceData,
  indicators,
  loading,
  enabledMAs,
  enabledSubplots,
  overlayData,
  enabledOverlays,
}: KLineChartProps) {
  const [crosshairData, setCrosshairData] = useState<CrosshairData | null>(null);

  // Unified refs: one map for containers, one for chart instances
  const mainContainerRef = useRef<HTMLDivElement>(null);
  const subContainerRefs = useRef<Map<SubplotKey, HTMLDivElement>>(new Map());
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chartsRef = useRef<Map<string, any>>(new Map()); // 'main' | SubplotKey → chart
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const leadsRef = useRef<Map<string, any>>(new Map());  // chart key → lead series

  const pricesRef = useRef<PriceData[]>([]);

  // Ref callback for subplot containers
  const setSubContainerRef = useCallback((key: SubplotKey) => (el: HTMLDivElement | null) => {
    if (el) {
      subContainerRefs.current.set(key, el);
    } else {
      subContainerRefs.current.delete(key);
    }
  }, []);

  // Check if a subplot is enabled
  const isSubplotEnabled = useCallback((key: SubplotKey) => {
    if (key === 'rsi' || key === 'macd' || key === 'kd') return enabledSubplots.has(key as TechnicalSubplotKey);
    return enabledOverlays.has(key as ChipsOverlayKey);
  }, [enabledSubplots, enabledOverlays]);

  // ─── Main chart rendering effect ──────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function renderCharts() {
      if (!mainContainerRef.current) return;
      if (priceData.length === 0) return;

      pricesRef.current = priceData;

      const { createChart, CandlestickSeries, LineSeries, HistogramSeries } =
        await import('lightweight-charts');

      if (cancelled) return;

      // ─── Cleanup previous charts ─────────────────────────────────────
      for (const chart of chartsRef.current.values()) {
        if (chart) chart.remove();
      }
      chartsRef.current.clear();
      leadsRef.current.clear();

      if (cancelled || !mainContainerRef.current) return;

      // ─── Determine last subplot for timeScale visibility ──────────────
      const activeSubplots = SUBPLOT_ORDER.filter((k) => isSubplotEnabled(k));
      const lastSubplot = activeSubplots[activeSubplots.length - 1] ?? null;
      const hasAnySubplots = activeSubplots.length > 0;
      const isLast = (key: string) => key === lastSubplot;

      // ─── Chart time info registry for sync ─────────────────────────
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const chartTimeInfo = new Map<any, { firstTs: number; secPerBar: number }>();
      const dateToTs = (d: string) => new Date(d).getTime() / 1000;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      function registerChart(chart: any, dates: string[]) {
        if (dates.length === 0) return;
        const first = dateToTs(dates[0]);
        const spb = dates.length > 1 ? (dateToTs(dates[dates.length - 1]) - first) / (dates.length - 1) : 86400;
        chartTimeInfo.set(chart, { firstTs: first, secPerBar: spb });
      }

      // ─── MAIN CHART ──────────────────────────────────────────────────
      const mainContainer = mainContainerRef.current;
      const mainChart = createChart(
        mainContainer,
        makeChartOptions(mainContainer.clientWidth, 400, !hasAnySubplots)
      );
      chartsRef.current.set('main', mainChart);

      // Candlestick series
      const candleSeries = mainChart.addSeries(CandlestickSeries, {
        upColor: '#EF4444',
        downColor: '#22C55E',
        borderUpColor: '#EF4444',
        borderDownColor: '#22C55E',
        wickUpColor: '#EF4444',
        wickDownColor: '#22C55E',
      });
      leadsRef.current.set('main', candleSeries);

      const candleData = priceData.map((p) => ({
        time: p.date,
        open: p.open,
        high: p.high,
        low: p.low,
        close: p.close,
      }));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      candleSeries.setData(candleData as any);
      registerChart(mainChart, priceData.map((p) => p.date));

      // Volume histogram
      const volumeSeries = mainChart.addSeries(HistogramSeries, {
        priceFormat: { type: 'volume' as const },
        priceScaleId: 'volume',
      });
      mainChart.priceScale('volume').applyOptions({
        scaleMargins: { top: 0.8, bottom: 0 },
      });

      const volumeData = priceData.map((p) => ({
        time: p.date,
        value: p.volume,
        color: p.spread >= 0 ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)',
      }));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      volumeSeries.setData(volumeData as any);

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
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          maSeries.setData(lineData as any);
        }
      }

      // Bollinger bands
      if (enabledSubplots.has('bollinger') && indicators.bollinger && indicators.bollinger.length > 0) {
        const bollData = indicators.bollinger;

        const middleSeries = mainChart.addSeries(LineSeries, {
          color: '#3B82F6',
          lineWidth: 1,
          priceScaleId: 'right',
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        middleSeries.setData(bollData.map((d) => ({ time: d.date, value: d.middle })) as any);

        const upperSeries = mainChart.addSeries(LineSeries, {
          color: 'rgba(59, 130, 246, 0.5)',
          lineWidth: 1,
          lineStyle: 2,
          priceScaleId: 'right',
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        upperSeries.setData(bollData.map((d) => ({ time: d.date, value: d.upper })) as any);

        const lowerSeries = mainChart.addSeries(LineSeries, {
          color: 'rgba(59, 130, 246, 0.5)',
          lineWidth: 1,
          lineStyle: 2,
          priceScaleId: 'right',
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        lowerSeries.setData(bollData.map((d) => ({ time: d.date, value: d.lower })) as any);
      }

      // Crosshair move handler for legend
      mainChart.subscribeCrosshairMove((param: { time?: unknown; seriesData?: unknown }) => {
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

      // ─── RSI SUBPLOT ──────────────────────────────────────────────────
      if (enabledSubplots.has('rsi') && subContainerRefs.current.get('rsi') && indicators.rsi && indicators.rsi.length > 0) {
        const container = subContainerRefs.current.get('rsi')!;
        const chart = createChart(container, makeChartOptions(container.clientWidth, 120, isLast('rsi'), false));
        chartsRef.current.set('rsi', chart);

        const rsiSeries = chart.addSeries(LineSeries, { color: '#FACC15', lineWidth: 1, priceScaleId: 'right' });
        leadsRef.current.set('rsi', rsiSeries);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        rsiSeries.setData(indicators.rsi.map((d) => ({ time: d.date, value: d.value })) as any);
        registerChart(chart, indicators.rsi.map((d) => d.date));

        addReferenceLines(chart, LineSeries, indicators.rsi.map((d) => d.date), [30, 70]);
        chart.priceScale('right').applyOptions({ scaleMargins: { top: 0.05, bottom: 0.05 } });
        chart.timeScale().fitContent();
      }

      // ─── MACD SUBPLOT ─────────────────────────────────────────────────
      if (enabledSubplots.has('macd') && subContainerRefs.current.get('macd') && indicators.macd && indicators.macd.length > 0) {
        const container = subContainerRefs.current.get('macd')!;
        const chart = createChart(container, makeChartOptions(container.clientWidth, 120, isLast('macd'), false));
        chartsRef.current.set('macd', chart);

        const difSeries = chart.addSeries(LineSeries, { color: '#3B82F6', lineWidth: 1, priceScaleId: 'right' });
        leadsRef.current.set('macd', difSeries);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        difSeries.setData(indicators.macd.map((d) => ({ time: d.date, value: d.dif })) as any);

        const signalSeries = chart.addSeries(LineSeries, { color: '#F97316', lineWidth: 1, priceScaleId: 'right' });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        signalSeries.setData(indicators.macd.map((d) => ({ time: d.date, value: d.signal })) as any);

        const histSeries = chart.addSeries(HistogramSeries, { priceScaleId: 'macdHist' });
        chart.priceScale('macdHist').applyOptions({ scaleMargins: { top: 0.6, bottom: 0 } });
        histSeries.setData(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          indicators.macd.map((d) => ({ time: d.date, value: d.histogram, color: d.histogram >= 0 ? '#EF4444' : '#22C55E' })) as any
        );

        registerChart(chart, indicators.macd.map((d) => d.date));
        chart.timeScale().fitContent();
      }

      // ─── KD SUBPLOT ───────────────────────────────────────────────────
      if (enabledSubplots.has('kd') && subContainerRefs.current.get('kd') && indicators.kd && indicators.kd.length > 0) {
        const container = subContainerRefs.current.get('kd')!;
        const chart = createChart(container, makeChartOptions(container.clientWidth, 120, isLast('kd'), false));
        chartsRef.current.set('kd', chart);

        const kSeries = chart.addSeries(LineSeries, { color: '#3B82F6', lineWidth: 1, priceScaleId: 'right' });
        leadsRef.current.set('kd', kSeries);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        kSeries.setData(indicators.kd.map((d) => ({ time: d.date, value: d.k })) as any);

        const dSeries = chart.addSeries(LineSeries, { color: '#F97316', lineWidth: 1, priceScaleId: 'right' });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        dSeries.setData(indicators.kd.map((d) => ({ time: d.date, value: d.d })) as any);

        addReferenceLines(chart, LineSeries, indicators.kd.map((d) => d.date), [20, 80]);
        chart.priceScale('right').applyOptions({ scaleMargins: { top: 0.05, bottom: 0.05 } });
        registerChart(chart, indicators.kd.map((d) => d.date));
        chart.timeScale().fitContent();
      }

      // ─── INSTITUTIONAL SUBPLOTS (Foreign / Trust / Dealer) ────────────
      // These 3 are identical except for field name and color
      const institutionalConfigs: { key: ChipsOverlayKey; field: 'foreign' | 'trust' | 'dealer'; color: string; dimColor: string }[] = [
        { key: 'foreign', field: 'foreign', color: '#3B82F6', dimColor: 'rgba(59, 130, 246, 0.4)' },
        { key: 'trust',   field: 'trust',   color: '#F97316', dimColor: 'rgba(249, 115, 22, 0.4)' },
        { key: 'dealer',  field: 'dealer',  color: '#A855F7', dimColor: 'rgba(168, 85, 247, 0.4)' },
      ];

      for (const { key, field, color, dimColor } of institutionalConfigs) {
        if (
          enabledOverlays.has(key) &&
          subContainerRefs.current.get(key) &&
          overlayData.institutional &&
          overlayData.institutional.length > 0
        ) {
          const container = subContainerRefs.current.get(key)!;
          const chart = createChart(container, makeChartOptions(container.clientWidth, 150, isLast(key), false));
          chartsRef.current.set(key, chart);

          const sorted = [...overlayData.institutional].sort(
            (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
          );

          const series = chart.addSeries(HistogramSeries, { priceScaleId: 'right' });
          leadsRef.current.set(key, series);

          series.setData(
            sorted.map((d) => ({
              time: d.date,
              value: d[field].net / 1000,
              color: d[field].net >= 0 ? color : dimColor,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
            })) as any
          );
          registerChart(chart, sorted.map((d) => d.date));
          chart.timeScale().fitContent();
        }
      }

      // ─── MARGIN SUBPLOT ───────────────────────────────────────────────
      if (
        enabledOverlays.has('margin') &&
        subContainerRefs.current.get('margin') &&
        overlayData.margin &&
        overlayData.margin.length > 0
      ) {
        const container = subContainerRefs.current.get('margin')!;
        const chart = createChart(container, makeChartOptions(container.clientWidth, 150, isLast('margin'), false));
        chartsRef.current.set('margin', chart);

        const sorted = [...overlayData.margin].sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        );

        const marginSeries = chart.addSeries(LineSeries, { color: '#EF4444', lineWidth: 2, priceScaleId: 'right' });
        leadsRef.current.set('margin', marginSeries);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        marginSeries.setData(sorted.map((d) => ({ time: d.date, value: d.margin_balance })) as any);

        const shortSeries = chart.addSeries(LineSeries, { color: '#22C55E', lineWidth: 2, priceScaleId: 'short' });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        shortSeries.setData(sorted.map((d) => ({ time: d.date, value: d.short_balance })) as any);
        registerChart(chart, sorted.map((d) => d.date));
        chart.timeScale().fitContent();
      }

      // ─── Sync system ──────────────────────────────────────────────────
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const allSubCharts: { chart: any; lead: any }[] = [];
      for (const key of SUBPLOT_ORDER) {
        const chart = chartsRef.current.get(key);
        const lead = leadsRef.current.get(key);
        if (chart && lead) allSubCharts.push({ chart, lead });
      }

      const mainInfo = chartTimeInfo.get(mainChart);
      if (mainInfo) {
        mainChart.timeScale().subscribeVisibleLogicalRangeChange(() => {
          const logicalRange = mainChart.timeScale().getVisibleLogicalRange();
          if (!logicalRange) return;
          const timeFrom = mainInfo.firstTs + logicalRange.from * mainInfo.secPerBar;
          const timeTo = mainInfo.firstTs + logicalRange.to * mainInfo.secPerBar;
          for (const { chart } of allSubCharts) {
            const subInfo = chartTimeInfo.get(chart);
            if (!subInfo) continue;
            try {
              const subFrom = (timeFrom - subInfo.firstTs) / subInfo.secPerBar;
              const subTo = (timeTo - subInfo.firstTs) / subInfo.secPerBar;
              chart.timeScale().setVisibleLogicalRange({ from: subFrom, to: subTo });
            } catch {
              // ignore
            }
          }
        });
      }

      // Crosshair sync — bidirectional with recursion guard
      let isSyncing = false;

      // Main → all subcharts
      mainChart.subscribeCrosshairMove((param: { time?: unknown }) => {
        if (isSyncing) return;
        isSyncing = true;
        if (param.time) {
          for (const { chart, lead } of allSubCharts) {
            try { chart.setCrosshairPosition(NaN, param.time, lead); } catch { /* ignore */ }
          }
        } else {
          for (const { chart } of allSubCharts) {
            chart.clearCrosshairPosition();
          }
        }
        isSyncing = false;
      });

      // Each subchart → main + other subcharts
      const mainLead = leadsRef.current.get('main');
      for (const { chart: subChart } of allSubCharts) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        subChart.subscribeCrosshairMove((param: any) => {
          if (isSyncing) return;
          isSyncing = true;
          if (param.time) {
            if (mainLead) {
              try { mainChart.setCrosshairPosition(NaN, param.time, mainLead); } catch { /* ignore */ }
            }
            for (const { chart, lead } of allSubCharts) {
              if (chart === subChart) continue;
              try { chart.setCrosshairPosition(NaN, param.time, lead); } catch { /* ignore */ }
            }
          } else {
            mainChart.clearCrosshairPosition();
            for (const { chart } of allSubCharts) {
              if (chart === subChart) continue;
              chart.clearCrosshairPosition();
            }
          }
          isSyncing = false;
        });
      }
    }

    renderCharts();

    return () => {
      cancelled = true;
      for (const chart of chartsRef.current.values()) {
        if (chart) chart.remove();
      }
      chartsRef.current.clear();
      leadsRef.current.clear();
    };
  }, [priceData, indicators, enabledMAs, enabledSubplots, overlayData, enabledOverlays, isSubplotEnabled]);

  // ─── Resize observer ────────────────────────────────────────────────────
  useEffect(() => {
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width } = entry.contentRect;
        // Check main
        if (mainContainerRef.current === entry.target) {
          const chart = chartsRef.current.get('main');
          if (chart) chart.resize(width, chart.options().height);
          continue;
        }
        // Check subplots
        for (const [key, container] of subContainerRefs.current.entries()) {
          if (container === entry.target) {
            const chart = chartsRef.current.get(key);
            if (chart) chart.resize(width, chart.options().height);
            break;
          }
        }
      }
    });

    if (mainContainerRef.current) observer.observe(mainContainerRef.current);
    for (const container of subContainerRefs.current.values()) {
      observer.observe(container);
    }

    return () => { observer.disconnect(); };
  }, [enabledSubplots, enabledOverlays]);

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="rounded-lg border border-[#1E293B] bg-[#0F172A]">
      {/* Main K-line chart — sticky */}
      <div className="sticky top-0 z-30 relative rounded-t-lg bg-[#0F172A] p-4 pb-0">
        {/* Loading overlay */}
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-t-lg bg-[#0F172A]/80">
            <span className="text-sm text-[#94A3B8]">載入中...</span>
          </div>
        )}

        {/* Crosshair legend */}
        {crosshairData && (
          <div className="absolute left-6 top-6 z-20 flex flex-wrap items-center gap-x-3 gap-y-0.5 rounded bg-[#0F172A]/90 px-2 py-1 text-xs">
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

        <div ref={mainContainerRef} className="w-full" style={{ height: 400 }} />
      </div>

      {/* Subplot containers — scrollable below sticky main chart */}
      <div className="px-4 pb-4">
        {SUBPLOT_ORDER.map((key) => {
          const enabled = isSubplotEnabled(key);
          if (!enabled) return null;
          const config = SUBPLOT_CONFIG[key];
          return (
            <div
              key={key}
              ref={setSubContainerRef(key)}
              className="relative w-full border-t border-[#1E293B]"
              style={{ height: config.height }}
            >
              <div
                className="pointer-events-none absolute left-2 top-1 z-10 rounded px-1.5 py-0.5 text-xs font-medium"
                style={{ backgroundColor: `${config.color}15`, color: config.color }}
              >
                {config.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
