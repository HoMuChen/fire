'use client';

import { useEffect, useRef, useState } from 'react';
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

// ─── Helpers ────────────────────────────────────────────────────────────────

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
      mode: 0,
    },
  };
}

function formatVolume(v: number): string {
  if (v >= 1e8) return (v / 1e8).toFixed(2) + '\u5104';
  if (v >= 1e4) return (v / 1e4).toFixed(0) + '\u842C';
  return v.toLocaleString();
}

// ─── Subplot order for isLast logic ─────────────────────────────────────────

const SUBPLOT_ORDER = ['rsi', 'macd', 'kd', 'foreign', 'trust', 'dealer', 'margin'] as const;

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

  // ─── Refs: chart containers ───────────────────────────────────────────────
  const mainContainerRef = useRef<HTMLDivElement>(null);
  const rsiContainerRef = useRef<HTMLDivElement>(null);
  const macdContainerRef = useRef<HTMLDivElement>(null);
  const kdContainerRef = useRef<HTMLDivElement>(null);
  const foreignContainerRef = useRef<HTMLDivElement>(null);
  const trustContainerRef = useRef<HTMLDivElement>(null);
  const dealerContainerRef = useRef<HTMLDivElement>(null);
  const marginContainerRef = useRef<HTMLDivElement>(null);

  // ─── Refs: chart instances ────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mainChartRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rsiChartRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const macdChartRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const kdChartRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const foreignChartRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const trustChartRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dealerChartRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const marginChartRef = useRef<any>(null);

  // ─── Refs: lead series for crosshair sync ─────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mainCandleSeriesRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rsiLineSeriesRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const macdDifSeriesRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const kdKSeriesRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const foreignLeadRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const trustLeadRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dealerLeadRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const marginLeadRef = useRef<any>(null);

  // Store prices for crosshair lookup
  const pricesRef = useRef<PriceData[]>([]);

  // ─── Main chart rendering effect ──────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function renderCharts() {
      if (!mainContainerRef.current) return;
      if (priceData.length === 0) return;

      pricesRef.current = priceData;

      // Dynamic import
      const { createChart, CandlestickSeries, LineSeries, HistogramSeries } =
        await import('lightweight-charts');

      if (cancelled) return;

      // ─── Cleanup previous charts ─────────────────────────────────────
      const allChartRefs = [
        mainChartRef, rsiChartRef, macdChartRef, kdChartRef,
        foreignChartRef, trustChartRef, dealerChartRef,
        marginChartRef,
      ];
      for (const ref of allChartRefs) {
        if (ref.current) {
          ref.current.remove();
          ref.current = null;
        }
      }

      const allSeriesRefs = [
        mainCandleSeriesRef, rsiLineSeriesRef, macdDifSeriesRef, kdKSeriesRef,
        foreignLeadRef, trustLeadRef, dealerLeadRef,
        marginLeadRef,
      ];
      for (const ref of allSeriesRefs) {
        ref.current = null;
      }

      if (cancelled || !mainContainerRef.current) return;

      // ─── Determine last subplot for timeScale visibility ──────────────
      const activeSubplots = SUBPLOT_ORDER.filter((k) => {
        if (k === 'rsi' || k === 'macd' || k === 'kd') return enabledSubplots.has(k as TechnicalSubplotKey);
        return enabledOverlays.has(k as ChipsOverlayKey);
      });
      const lastSubplot = activeSubplots[activeSubplots.length - 1] ?? null;
      const hasAnySubplots = activeSubplots.length > 0;
      const isLast = (key: string) => key === lastSubplot;

      // ─── MAIN CHART ──────────────────────────────────────────────────
      const mainContainer = mainContainerRef.current;
      const mainChart = createChart(
        mainContainer,
        makeChartOptions(mainContainer.clientWidth, 400, !hasAnySubplots)
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

      const candleData = priceData.map((p) => ({
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

      const volumeData = priceData.map((p) => ({
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

        const middleSeries = mainChart.addSeries(LineSeries, {
          color: '#3B82F6',
          lineWidth: 1,
          priceScaleId: 'right',
        });
        middleSeries.setData(
          bollData.map((d) => ({ time: d.date, value: d.middle })) as Parameters<typeof middleSeries.setData>[0]
        );

        const upperSeries = mainChart.addSeries(LineSeries, {
          color: 'rgba(59, 130, 246, 0.5)',
          lineWidth: 1,
          lineStyle: 2,
          priceScaleId: 'right',
        });
        upperSeries.setData(
          bollData.map((d) => ({ time: d.date, value: d.upper })) as Parameters<typeof upperSeries.setData>[0]
        );

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

      // ─── RSI SUBPLOT ──────────────────────────────────────────────────
      if (enabledSubplots.has('rsi') && rsiContainerRef.current && indicators.rsi && indicators.rsi.length > 0) {
        const rsiContainer = rsiContainerRef.current;
        const rsiChart = createChart(
          rsiContainer,
          makeChartOptions(rsiContainer.clientWidth, 120, isLast('rsi'))
        );
        rsiChartRef.current = rsiChart;

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
      }

      // ─── MACD SUBPLOT ─────────────────────────────────────────────────
      if (enabledSubplots.has('macd') && macdContainerRef.current && indicators.macd && indicators.macd.length > 0) {
        const macdContainer = macdContainerRef.current;
        const macdChart = createChart(
          macdContainer,
          makeChartOptions(macdContainer.clientWidth, 120, isLast('macd'))
        );
        macdChartRef.current = macdChart;

        const difSeries = macdChart.addSeries(LineSeries, {
          color: '#3B82F6',
          lineWidth: 1,
          priceScaleId: 'right',
        });
        macdDifSeriesRef.current = difSeries;

        difSeries.setData(
          indicators.macd.map((d) => ({ time: d.date, value: d.dif })) as Parameters<typeof difSeries.setData>[0]
        );

        const signalSeries = macdChart.addSeries(LineSeries, {
          color: '#F97316',
          lineWidth: 1,
          priceScaleId: 'right',
        });
        signalSeries.setData(
          indicators.macd.map((d) => ({ time: d.date, value: d.signal })) as Parameters<typeof signalSeries.setData>[0]
        );

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
      }

      // ─── KD SUBPLOT ───────────────────────────────────────────────────
      if (enabledSubplots.has('kd') && kdContainerRef.current && indicators.kd && indicators.kd.length > 0) {
        const kdContainer = kdContainerRef.current;
        const kdChart = createChart(
          kdContainer,
          makeChartOptions(kdContainer.clientWidth, 120, isLast('kd'))
        );
        kdChartRef.current = kdChart;

        const kSeries = kdChart.addSeries(LineSeries, {
          color: '#3B82F6',
          lineWidth: 1,
          priceScaleId: 'right',
        });
        kdKSeriesRef.current = kSeries;

        kSeries.setData(
          indicators.kd.map((d) => ({ time: d.date, value: d.k })) as Parameters<typeof kSeries.setData>[0]
        );

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
      }

      // ─── FOREIGN SUBPLOT (外資) ─────────────────────────────────────
      if (
        enabledOverlays.has('foreign') &&
        foreignContainerRef.current &&
        overlayData.institutional &&
        overlayData.institutional.length > 0
      ) {
        const container = foreignContainerRef.current;
        const chart = createChart(
          container,
          makeChartOptions(container.clientWidth, 150, isLast('foreign'))
        );
        foreignChartRef.current = chart;

        const sorted = [...overlayData.institutional].sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        );

        const foreignSeries = chart.addSeries(HistogramSeries, {
          priceScaleId: 'right',
        });
        foreignLeadRef.current = foreignSeries;

        foreignSeries.setData(
          sorted.map((d) => ({
            time: d.date,
            value: d.foreign.net / 1000,
            color: d.foreign.net >= 0 ? '#3B82F6' : 'rgba(59, 130, 246, 0.4)',
          })) as Parameters<typeof foreignSeries.setData>[0]
        );

        chart.timeScale().fitContent();
      }

      // ─── TRUST SUBPLOT (投信) ──────────────────────────────────────
      if (
        enabledOverlays.has('trust') &&
        trustContainerRef.current &&
        overlayData.institutional &&
        overlayData.institutional.length > 0
      ) {
        const container = trustContainerRef.current;
        const chart = createChart(
          container,
          makeChartOptions(container.clientWidth, 150, isLast('trust'))
        );
        trustChartRef.current = chart;

        const sorted = [...overlayData.institutional].sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        );

        const trustSeries = chart.addSeries(HistogramSeries, {
          priceScaleId: 'right',
        });
        trustLeadRef.current = trustSeries;

        trustSeries.setData(
          sorted.map((d) => ({
            time: d.date,
            value: d.trust.net / 1000,
            color: d.trust.net >= 0 ? '#F97316' : 'rgba(249, 115, 22, 0.4)',
          })) as Parameters<typeof trustSeries.setData>[0]
        );

        chart.timeScale().fitContent();
      }

      // ─── DEALER SUBPLOT (自營商) ───────────────────────────────────
      if (
        enabledOverlays.has('dealer') &&
        dealerContainerRef.current &&
        overlayData.institutional &&
        overlayData.institutional.length > 0
      ) {
        const container = dealerContainerRef.current;
        const chart = createChart(
          container,
          makeChartOptions(container.clientWidth, 150, isLast('dealer'))
        );
        dealerChartRef.current = chart;

        const sorted = [...overlayData.institutional].sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        );

        const dealerSeries = chart.addSeries(HistogramSeries, {
          priceScaleId: 'right',
        });
        dealerLeadRef.current = dealerSeries;

        dealerSeries.setData(
          sorted.map((d) => ({
            time: d.date,
            value: d.dealer.net / 1000,
            color: d.dealer.net >= 0 ? '#A855F7' : 'rgba(168, 85, 247, 0.4)',
          })) as Parameters<typeof dealerSeries.setData>[0]
        );

        chart.timeScale().fitContent();
      }

      // ─── MARGIN SUBPLOT ───────────────────────────────────────────────
      if (
        enabledOverlays.has('margin') &&
        marginContainerRef.current &&
        overlayData.margin &&
        overlayData.margin.length > 0
      ) {
        const container = marginContainerRef.current;
        const chart = createChart(
          container,
          makeChartOptions(container.clientWidth, 150, isLast('margin'))
        );
        marginChartRef.current = chart;

        const sorted = [...overlayData.margin].sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        );

        // Margin balance (line, red)
        const marginSeries = chart.addSeries(LineSeries, {
          color: '#EF4444',
          lineWidth: 2,
          priceScaleId: 'right',
        });
        marginLeadRef.current = marginSeries;

        marginSeries.setData(
          sorted.map((d) => ({ time: d.date, value: d.margin_balance })) as Parameters<typeof marginSeries.setData>[0]
        );

        // Short balance (line, green, separate scale)
        const shortSeries = chart.addSeries(LineSeries, {
          color: '#22C55E',
          lineWidth: 2,
          priceScaleId: 'short',
        });
        shortSeries.setData(
          sorted.map((d) => ({ time: d.date, value: d.short_balance })) as Parameters<typeof shortSeries.setData>[0]
        );

        chart.timeScale().fitContent();
      }

      // ─── Sync system ──────────────────────────────────────────────────
      const syncingRef = { current: false };

      // Collect all active sub-charts
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const allSubCharts: { chart: any; lead: any }[] = [];
      if (rsiChartRef.current) allSubCharts.push({ chart: rsiChartRef.current, lead: rsiLineSeriesRef.current });
      if (macdChartRef.current) allSubCharts.push({ chart: macdChartRef.current, lead: macdDifSeriesRef.current });
      if (kdChartRef.current) allSubCharts.push({ chart: kdChartRef.current, lead: kdKSeriesRef.current });
      if (foreignChartRef.current) allSubCharts.push({ chart: foreignChartRef.current, lead: foreignLeadRef.current });
      if (trustChartRef.current) allSubCharts.push({ chart: trustChartRef.current, lead: trustLeadRef.current });
      if (dealerChartRef.current) allSubCharts.push({ chart: dealerChartRef.current, lead: dealerLeadRef.current });
      if (marginChartRef.current) allSubCharts.push({ chart: marginChartRef.current, lead: marginLeadRef.current });

      // Time-based range sync (works correctly across charts with different data densities)
      const syncTimeRange = (sourceChart: any, targetCharts: any[]) => {
        if (syncingRef.current) return;
        const range = sourceChart.timeScale().getVisibleRange();
        if (!range) return;
        syncingRef.current = true;
        try {
          for (const target of targetCharts) {
            target.timeScale().setVisibleRange(range);
          }
        } catch {
          // ignore
        } finally {
          syncingRef.current = false;
        }
      };

      // Main -> all subs
      mainChart.timeScale().subscribeVisibleLogicalRangeChange(() => {
        syncTimeRange(mainChart, allSubCharts.map(s => s.chart));
      });

      // Any sub -> main + all others
      for (const sub of allSubCharts) {
        sub.chart.timeScale().subscribeVisibleLogicalRangeChange(() => {
          const targets = [mainChart, ...allSubCharts.filter(o => o.chart !== sub.chart).map(o => o.chart)];
          syncTimeRange(sub.chart, targets);
        });
      }

      // Crosshair sync from main
      mainChart.subscribeCrosshairMove((param: { time?: unknown }) => {
        if (param.time) {
          for (const { chart, lead } of allSubCharts) {
            try {
              chart.setCrosshairPosition(NaN, param.time, lead);
            } catch {
              // ignore sync errors
            }
          }
        } else {
          for (const { chart } of allSubCharts) {
            chart.clearCrosshairPosition();
          }
        }
      });
    }

    renderCharts();

    return () => {
      cancelled = true;
      const allChartRefs = [
        mainChartRef, rsiChartRef, macdChartRef, kdChartRef,
        foreignChartRef, trustChartRef, dealerChartRef,
        marginChartRef,
      ];
      for (const ref of allChartRefs) {
        if (ref.current) {
          ref.current.remove();
          ref.current = null;
        }
      }
      const allSeriesRefs = [
        mainCandleSeriesRef, rsiLineSeriesRef, macdDifSeriesRef, kdKSeriesRef,
        foreignLeadRef, trustLeadRef, dealerLeadRef,
        marginLeadRef,
      ];
      for (const ref of allSeriesRefs) {
        ref.current = null;
      }
    };
  }, [priceData, indicators, enabledMAs, enabledSubplots, overlayData, enabledOverlays]);

  // ─── Resize observer ────────────────────────────────────────────────────
  useEffect(() => {
    const containers = [
      { ref: mainContainerRef, chart: mainChartRef },
      { ref: rsiContainerRef, chart: rsiChartRef },
      { ref: macdContainerRef, chart: macdChartRef },
      { ref: kdContainerRef, chart: kdChartRef },
      { ref: foreignContainerRef, chart: foreignChartRef },
      { ref: trustContainerRef, chart: trustChartRef },
      { ref: dealerContainerRef, chart: dealerChartRef },
      { ref: marginContainerRef, chart: marginChartRef },
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
  }, [enabledSubplots, enabledOverlays]);

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="rounded-lg border border-[#1E293B] bg-[#0F172A] p-4">
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
          <div ref={rsiContainerRef} className="relative w-full border-t border-[#1E293B]" style={{ height: 120 }}>
            <div className="pointer-events-none absolute left-2 top-1 z-10 rounded bg-[#FACC15]/15 px-1.5 py-0.5 text-xs font-medium text-[#FACC15]">RSI</div>
          </div>
        )}

        {/* MACD subplot container */}
        {enabledSubplots.has('macd') && (
          <div ref={macdContainerRef} className="relative w-full border-t border-[#1E293B]" style={{ height: 120 }}>
            <div className="pointer-events-none absolute left-2 top-1 z-10 rounded bg-[#3B82F6]/15 px-1.5 py-0.5 text-xs font-medium text-[#3B82F6]">MACD</div>
          </div>
        )}

        {/* KD subplot container */}
        {enabledSubplots.has('kd') && (
          <div ref={kdContainerRef} className="relative w-full border-t border-[#1E293B]" style={{ height: 120 }}>
            <div className="pointer-events-none absolute left-2 top-1 z-10 rounded bg-[#3B82F6]/15 px-1.5 py-0.5 text-xs font-medium text-[#3B82F6]">KD</div>
          </div>
        )}

        {/* Foreign subplot container */}
        {enabledOverlays.has('foreign') && (
          <div ref={foreignContainerRef} className="relative w-full border-t border-[#1E293B]" style={{ height: 150 }}>
            <div className="pointer-events-none absolute left-2 top-1 z-10 rounded bg-[#3B82F6]/15 px-1.5 py-0.5 text-xs font-medium text-[#3B82F6]">外資</div>
          </div>
        )}

        {/* Trust subplot container */}
        {enabledOverlays.has('trust') && (
          <div ref={trustContainerRef} className="relative w-full border-t border-[#1E293B]" style={{ height: 150 }}>
            <div className="pointer-events-none absolute left-2 top-1 z-10 rounded bg-[#F97316]/15 px-1.5 py-0.5 text-xs font-medium text-[#F97316]">投信</div>
          </div>
        )}

        {/* Dealer subplot container */}
        {enabledOverlays.has('dealer') && (
          <div ref={dealerContainerRef} className="relative w-full border-t border-[#1E293B]" style={{ height: 150 }}>
            <div className="pointer-events-none absolute left-2 top-1 z-10 rounded bg-[#A855F7]/15 px-1.5 py-0.5 text-xs font-medium text-[#A855F7]">自營商</div>
          </div>
        )}

        {/* Margin subplot container */}
        {enabledOverlays.has('margin') && (
          <div ref={marginContainerRef} className="relative w-full border-t border-[#1E293B]" style={{ height: 150 }}>
            <div className="pointer-events-none absolute left-2 top-1 z-10 rounded bg-[#EF4444]/15 px-1.5 py-0.5 text-xs font-medium text-[#EF4444]">融資融券</div>
          </div>
        )}

      </div>
    </div>
  );
}
