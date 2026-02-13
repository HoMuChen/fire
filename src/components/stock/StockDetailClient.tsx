'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { useToggleSet } from '@/hooks/useToggleSet';
import { Button } from '@/components/ui/button';
import { StockHeader } from './StockHeader';
import { KLineChart } from './KLineChart';
import { NewsTab } from './NewsTab';
import { RevenueTable } from './RevenueTable';
import { FinancialTable } from './FinancialTable';
import { DividendTable } from './DividendTable';
import type {
  TimeRange,
  MAKey,
  TechnicalSubplotKey,
  ChipsOverlayKey,
  PriceData,
  IndicatorsResponse,
  OverlayData,
} from './types';
import {
  TIME_RANGES,
  MA_KEYS,
  TECHNICAL_SUBPLOT_KEYS,
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

type BottomTab = 'news' | 'revenue' | 'financial' | 'dividends';

const BOTTOM_TABS: { key: BottomTab; label: string }[] = [
  { key: 'news', label: '新聞' },
  { key: 'revenue', label: '月營收' },
  { key: 'financial', label: '財報' },
  { key: 'dividends', label: '股利' },
];

export function StockDetailClient({ stockInfo }: { stockInfo: StockInfo }) {
  // ─── State ──────────────────────────────────────────────────────────────────
  const [timeRange, setTimeRange] = useState<TimeRange>('6m');
  const [enabledMAs, toggleMA] = useToggleSet<MAKey>(['ma5', 'ma20']);
  const [enabledSubplots, toggleSubplot] = useToggleSet<TechnicalSubplotKey>();
  const [enabledOverlays, toggleOverlay] = useToggleSet<ChipsOverlayKey>();
  const [priceData, setPriceData] = useState<PriceData[]>([]);
  const [indicators, setIndicators] = useState<IndicatorsResponse>({});
  const [overlayData, setOverlayData] = useState<OverlayData>({});
  const [loading, setLoading] = useState(true);
  const [activeBottomTab, setActiveBottomTab] = useState<BottomTab>('news');

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

  // ─── Effect 2: chips overlay data ─────────────────────────────────────────
  useEffect(() => {
    if (enabledOverlays.size === 0) {
      setOverlayData({});
      return;
    }

    let cancelled = false;
    const { days } = RANGE_PARAMS[timeRange];
    const stockId = stockInfo.stock_id;

    async function fetchOverlays() {
      const fetches: Promise<void>[] = [];
      const result: OverlayData = {};

      if (enabledOverlays.has('foreign') || enabledOverlays.has('trust') || enabledOverlays.has('dealer')) {
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
      <div className="space-y-4">
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
      </div>

      {/* Bottom tabs: 新聞 / 月營收 / 財報 / 股利 */}
      <div>
        <div className="flex gap-1 border-b border-[#334155]">
          {BOTTOM_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveBottomTab(tab.key)}
              className={cn(
                'cursor-pointer px-3 py-2 text-sm font-medium transition-colors',
                activeBottomTab === tab.key
                  ? 'border-b-2 border-[#3B82F6] text-[#F8FAFC]'
                  : 'text-[#64748B] hover:text-[#94A3B8]'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="pt-3">
          {activeBottomTab === 'news' && <NewsTab stockId={stockInfo.stock_id} />}
          {activeBottomTab === 'revenue' && (
            <RevenueTable stockId={stockInfo.stock_id} timeRange={timeRange} />
          )}
          {activeBottomTab === 'financial' && (
            <FinancialTable stockId={stockInfo.stock_id} timeRange={timeRange} />
          )}
          {activeBottomTab === 'dividends' && (
            <DividendTable stockId={stockInfo.stock_id} />
          )}
        </div>
      </div>
    </div>
  );
}
