'use client';

import Link from 'next/link';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { NumberDisplay } from '@/components/shared/NumberDisplay';
import { formatCurrency, formatVolume } from '@/lib/utils';
import type { StockInfo } from './StockDetailClient';

export function StockHeader({ stockInfo }: { stockInfo: StockInfo }) {
  const { stock_id, stock_name, industry_category, sync_status, price, valuation } = stockInfo;

  const isSynced = sync_status === 'synced';

  return (
    <div className="space-y-3">
      {/* Top row: back button, stock identity, sync status */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3 flex-wrap">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/">
              <ArrowLeft className="size-4" />
              返回
            </Link>
          </Button>

          <div className="flex items-center gap-2">
            <span className="font-mono text-lg font-semibold text-[#F8FAFC]">
              {stock_id}
            </span>
            <span className="text-lg font-semibold text-[#F8FAFC]">
              {stock_name}
            </span>
          </div>

          {industry_category && (
            <Badge variant="secondary" className="text-xs">
              {industry_category}
            </Badge>
          )}
        </div>

        {!isSynced && sync_status && (
          <Badge variant="outline" className="text-yellow-500 border-yellow-500/50 gap-1">
            <AlertTriangle className="size-3" />
            {sync_status}
          </Badge>
        )}
      </div>

      {/* Price row */}
      {price && (
        <div className="flex items-baseline gap-4 flex-wrap">
          <span className="text-3xl font-bold tabular-nums text-[#F8FAFC]">
            NT$ {formatCurrency(price.close)}
          </span>
          <div className="flex items-baseline gap-2">
            <NumberDisplay value={price.spread} />
            {price.change_percent != null && (
              <NumberDisplay value={price.change_percent} prefix="(" suffix="%)" />
            )}
          </div>
          <span className="text-sm text-[#94A3B8]">
            成交量 {formatVolume(price.volume)} 張
          </span>
        </div>
      )}

      {/* Valuation row */}
      {valuation && (
        <div className="flex items-center gap-4 text-sm text-[#94A3B8] flex-wrap">
          {valuation.per != null && (
            <span>
              PER{' '}
              <span className="text-[#F8FAFC] font-medium tabular-nums">
                {valuation.per.toFixed(2)}
              </span>
            </span>
          )}
          {valuation.pbr != null && (
            <>
              <span className="text-[#1E293B]">|</span>
              <span>
                PBR{' '}
                <span className="text-[#F8FAFC] font-medium tabular-nums">
                  {valuation.pbr.toFixed(2)}
                </span>
              </span>
            </>
          )}
          {valuation.dividend_yield != null && (
            <>
              <span className="text-[#1E293B]">|</span>
              <span>
                殖利率{' '}
                <span className="text-[#F8FAFC] font-medium tabular-nums">
                  {valuation.dividend_yield.toFixed(2)}%
                </span>
              </span>
            </>
          )}
          {price?.date && (
            <>
              <span className="text-[#1E293B]">|</span>
              <span className="text-xs">
                資料日期 {price.date}
              </span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
