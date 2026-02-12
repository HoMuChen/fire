'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { NumberDisplay } from '@/components/shared/NumberDisplay';
import { calcChangePercent } from '@/lib/utils';

interface MarketData {
  date: string | null;
  up: number;
  down: number;
  unchanged: number;
  total_volume: number;
  taiex: { close: number; spread: number } | null;
}

export function MarketOverview() {
  const [data, setData] = useState<MarketData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/market/overview');
        if (res.ok) {
          const json = await res.json();
          setData(json.data);
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="border-[#1E293B] bg-[#1E293B]">
            <CardContent className="py-4">
              <div className="h-4 w-20 animate-pulse rounded bg-[#0F172A]" />
              <div className="mt-2 h-6 w-32 animate-pulse rounded bg-[#0F172A]" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-sm text-[#94A3B8]">無法載入市場資訊</div>
    );
  }

  const taiexSpread = data.taiex?.spread ?? 0;
  const taiexClose = data.taiex?.close ?? 0;
  const taiexChangePercent =
    data.taiex && data.taiex.close !== null && data.taiex.spread !== null
      ? calcChangePercent(data.taiex.spread, data.taiex.close)
      : 0;

  // Volume in 億
  const volumeYi = data.total_volume / 100000000;

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {/* Card 1: TAIEX */}
      <Card className="border-[#1E293B] bg-[#1E293B]">
        <CardContent className="py-4">
          <div className="text-xs text-[#94A3B8]">加權指數</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-bold text-[#F8FAFC]">
              {taiexClose ? taiexClose.toLocaleString('zh-TW', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}
            </span>
            <NumberDisplay value={taiexSpread} className="text-sm" />
            <NumberDisplay
              value={taiexChangePercent}
              prefix="("
              suffix="%)"
              className="text-sm"
            />
          </div>
          {data.date && (
            <div className="mt-1 text-xs text-[#94A3B8]">{data.date}</div>
          )}
        </CardContent>
      </Card>

      {/* Card 2: Volume */}
      <Card className="border-[#1E293B] bg-[#1E293B]">
        <CardContent className="py-4">
          <div className="text-xs text-[#94A3B8]">成交量</div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-xl font-bold text-[#F8FAFC]">
              {volumeYi.toLocaleString('zh-TW', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </span>
            <span className="text-sm text-[#94A3B8]">億</span>
          </div>
        </CardContent>
      </Card>

      {/* Card 3: Up / Down / Unchanged */}
      <Card className="border-[#1E293B] bg-[#1E293B]">
        <CardContent className="py-4">
          <div className="text-xs text-[#94A3B8]">漲跌家數</div>
          <div className="mt-1 flex items-baseline gap-3">
            <span className="font-medium">
              <span className="text-[#94A3B8]">漲 </span>
              <span className="text-[#EF4444]">{data.up}</span>
            </span>
            <span className="font-medium">
              <span className="text-[#94A3B8]">跌 </span>
              <span className="text-[#22C55E]">{data.down}</span>
            </span>
            <span className="font-medium">
              <span className="text-[#94A3B8]">平 </span>
              <span className="text-[#9CA3AF]">{data.unchanged}</span>
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
