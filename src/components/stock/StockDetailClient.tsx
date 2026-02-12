'use client';

import { useEffect, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { StockHeader } from './StockHeader';
import { KLineChart } from './KLineChart';
import { NewsTab } from './NewsTab';
import type {
  TimeRange,
  MAKey,
  TechnicalSubplotKey,
  FundamentalOverlayKey,
  ChipsOverlayKey,
  PriceData,
  IndicatorsResponse,
  OverlayData,
} from './types';
import {
  TIME_RANGES,
  MA_KEYS,
  TECHNICAL_SUBPLOT_KEYS,
  FUNDAMENTAL_OVERLAY_KEYS,
  CHIPS_OVERLAY_KEYS,
  RANGE_PARAMS,
} from './types';

export interface StockInfo {
  stock_id: string;
  stock_name: string;
  industry_category: string | null;
  type: string | null;
  sync_status: string | null;
  price: {
    date: string;
    close: number;
    spread: number;
    change_percent: number | null;
    open: number;
    high: number;
    low: number;
    volume: number;
  } | null;
  valuation: {
    per: number | null;
    pbr: number | null;
    dividend_yield: number | null;
  } | null;
}

export function StockDetailClient({ stockInfo }: { stockInfo: StockInfo }) {
  // ─── State ──────────────────────────────────────────────────────────────────
  const [timeRange, setTimeRange] = useState<TimeRange>('6m');
  const [enabledMAs, setEnabledMAs] = useState<Set<MAKey>>(new Set(['ma5', 'ma20']));
  const [enabledSubplots, setEnabledSubplots] = useState<Set<TechnicalSubplotKey>>(new Set());
  const [enabledOverlays, setEnabledOverlays] = useState<Set<FundamentalOverlayKey | ChipsOverlayKey>>(new Set());
  const [priceData, setPriceData] = useState<PriceData[]>([]);
  const [indicators, setIndicators] = useState<IndicatorsResponse>({});
  const [overlayData, setOverlayData] = useState<OverlayData>({});
  const [loading, setLoading] = useState(true);

  // ─── Toggle handlers ────────────────────────────────────────────────────────
  const toggleMA = useCallback((key: MAKey) => {
    setEnabledMAs((prev) => {
      const n = new Set(prev);
      n.has(key) ? n.delete(key) : n.add(key);
      return n;
    });
  }, []);

  const toggleSubplot = useCallback((key: TechnicalSubplotKey) => {
    setEnabledSubplots((prev) => {
      const n = new Set(prev);
      n.has(key) ? n.delete(key) : n.add(key);
      return n;
    });
  }, []);

  const toggleOverlay = useCallback((key: FundamentalOverlayKey | ChipsOverlayKey) => {
    setEnabledOverlays((prev) => {
      const n = new Set(prev);
      n.has(key) ? n.delete(key) : n.add(key);
      return n;
    });
  }, []);

  // ─── Effect 1: price + indicators ──────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function fetchPriceAndIndicators() {
      setLoading(true);
      try {
        const parts: string[] = [];
        enabledMAs.forEach((ma) => parts.push(ma));
        enabledSubplots.forEach((sub) => parts.push(sub));
        const indParam = parts.join(',');

        let url = `/api/stocks/${stockInfo.stock_id}/prices?range=${timeRange}`;
        if (indParam) url += `&indicators=${indParam}`;

        const res = await fetch(url);
        if (!res.ok || cancelled) return;
        const json = await res.json();
        if (!cancelled) {
          setPriceData(json.data.prices ?? []);
          setIndicators(json.data.indicators ?? {});
        }
      } catch {
        // silently fail
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchPriceAndIndicators();
    return () => {
      cancelled = true;
    };
  }, [stockInfo.stock_id, timeRange, enabledMAs, enabledSubplots]);

  // ─── Effect 2: overlay data ────────────────────────────────────────────────
  useEffect(() => {
    if (enabledOverlays.size === 0) {
      setOverlayData({});
      return;
    }

    let cancelled = false;
    const { days, months, quarters } = RANGE_PARAMS[timeRange];
    const stockId = stockInfo.stock_id;

    async function fetchOverlays() {
      const fetches: Promise<void>[] = [];
      const result: OverlayData = {};

      if (enabledOverlays.has('institutional')) {
        fetches.push(
          fetch(`/api/stocks/${stockId}/institutional?days=${days}`)
            .then((r) => (r.ok ? r.json() : null))
            .then((json) => {
              if (json && !cancelled) result.institutional = json.data;
            })
            .catch(() => {})
        );
      }

      if (enabledOverlays.has('margin')) {
        fetches.push(
          fetch(`/api/stocks/${stockId}/margin?days=${days}`)
            .then((r) => (r.ok ? r.json() : null))
            .then((json) => {
              if (json && !cancelled) result.margin = json.data;
            })
            .catch(() => {})
        );
      }

      if (enabledOverlays.has('revenue')) {
        fetches.push(
          fetch(`/api/stocks/${stockId}/revenue?months=${months}`)
            .then((r) => (r.ok ? r.json() : null))
            .then((json) => {
              if (json && !cancelled) result.revenue = json.data;
            })
            .catch(() => {})
        );
      }

      if (enabledOverlays.has('financial')) {
        fetches.push(
          fetch(`/api/stocks/${stockId}/financial?quarters=${quarters}`)
            .then((r) => (r.ok ? r.json() : null))
            .then((json) => {
              if (json && !cancelled) result.financial = json.data;
            })
            .catch(() => {})
        );
      }

      if (enabledOverlays.has('dividends')) {
        fetches.push(
          fetch(`/api/stocks/${stockId}/dividends`)
            .then((r) => (r.ok ? r.json() : null))
            .then((json) => {
              if (json && !cancelled) result.dividends = json.data;
            })
            .catch(() => {})
        );
      }

      await Promise.all(fetches);
      if (!cancelled) setOverlayData(result);
    }

    fetchOverlays();
    return () => {
      cancelled = true;
    };
  }, [stockInfo.stock_id, timeRange, enabledOverlays]);

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="p-4 space-y-4">
      {/* Header row with time range */}
      <div className="flex items-start justify-between gap-4">
        <StockHeader stockInfo={stockInfo} />
        <div className="flex shrink-0 gap-1">
          {TIME_RANGES.map((r) => (
            <Button
              key={r.key}
              variant={timeRange === r.key ? 'default' : 'outline'}
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => setTimeRange(r.key)}
            >
              {r.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Toggle groups */}
      <div className="space-y-1.5">
        {/* 技術指標 */}
        <div className="flex items-center gap-1 flex-wrap">
          <span className="mr-1 text-[10px] font-medium uppercase tracking-wider text-[#64748B]">技術指標</span>
          {MA_KEYS.map((ma) => (
            <button
              key={ma.key}
              onClick={() => toggleMA(ma.key)}
              className={cn(
                'h-6 rounded px-2 text-[10px] font-medium cursor-pointer transition-colors',
                enabledMAs.has(ma.key)
                  ? 'text-white'
                  : 'bg-[#1E293B] text-[#64748B] hover:text-[#94A3B8]'
              )}
              style={
                enabledMAs.has(ma.key)
                  ? { backgroundColor: ma.color + '33', color: ma.color }
                  : undefined
              }
            >
              {ma.label}
            </button>
          ))}
          <span className="mx-1 h-3 w-px bg-[#334155]" />
          {TECHNICAL_SUBPLOT_KEYS.map((sub) => (
            <button
              key={sub.key}
              onClick={() => toggleSubplot(sub.key)}
              className={cn(
                'h-6 rounded px-2 text-[10px] font-medium cursor-pointer transition-colors',
                enabledSubplots.has(sub.key)
                  ? 'bg-[#3B82F6]/20 text-[#3B82F6]'
                  : 'bg-[#1E293B] text-[#64748B] hover:text-[#94A3B8]'
              )}
            >
              {sub.label}
            </button>
          ))}
        </div>

        {/* 基本面 */}
        <div className="flex items-center gap-1 flex-wrap">
          <span className="mr-1 text-[10px] font-medium uppercase tracking-wider text-[#64748B]">基本面</span>
          {FUNDAMENTAL_OVERLAY_KEYS.map((f) => (
            <button
              key={f.key}
              onClick={() => toggleOverlay(f.key)}
              className={cn(
                'h-6 rounded px-2 text-[10px] font-medium cursor-pointer transition-colors',
                enabledOverlays.has(f.key)
                  ? 'bg-[#F59E0B]/20 text-[#F59E0B]'
                  : 'bg-[#1E293B] text-[#64748B] hover:text-[#94A3B8]'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* 籌碼面 */}
        <div className="flex items-center gap-1 flex-wrap">
          <span className="mr-1 text-[10px] font-medium uppercase tracking-wider text-[#64748B]">籌碼面</span>
          {CHIPS_OVERLAY_KEYS.map((c) => (
            <button
              key={c.key}
              onClick={() => toggleOverlay(c.key)}
              className={cn(
                'h-6 rounded px-2 text-[10px] font-medium cursor-pointer transition-colors',
                enabledOverlays.has(c.key)
                  ? 'bg-[#22C55E]/20 text-[#22C55E]'
                  : 'bg-[#1E293B] text-[#64748B] hover:text-[#94A3B8]'
              )}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <KLineChart
        stockId={stockInfo.stock_id}
        priceData={priceData}
        indicators={indicators}
        loading={loading}
        enabledMAs={enabledMAs}
        enabledSubplots={enabledSubplots}
        overlayData={overlayData}
        enabledOverlays={enabledOverlays}
      />

      {/* News */}
      <NewsTab stockId={stockInfo.stock_id} />
    </div>
  );
}
