'use client';

import { useEffect, useState } from 'react';

interface RevenueData {
  date: string;
  revenue_year: number;
  revenue_month: number;
  revenue: number;
  mom_percent: number | null;
  yoy_percent: number | null;
}

interface RevenueSectionProps {
  stockId: string;
}

function formatPercent(value: number | null): { text: string; color: string } {
  if (value === null || value === undefined) {
    return { text: '-', color: 'text-[#9CA3AF]' };
  }
  if (value > 0) {
    return { text: `+${value.toFixed(2)}%`, color: 'text-[#EF4444]' };
  }
  if (value < 0) {
    return { text: `${value.toFixed(2)}%`, color: 'text-[#22C55E]' };
  }
  return { text: '0.00%', color: 'text-[#9CA3AF]' };
}

export function RevenueSection({ stockId }: RevenueSectionProps) {
  const [data, setData] = useState<RevenueData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchRevenue() {
      setLoading(true);
      try {
        const res = await fetch(`/api/stocks/${stockId}/revenue?months=12`);
        if (!res.ok || cancelled) return;
        const json = await res.json();
        if (!cancelled) {
          const sorted = (json.data as RevenueData[]).sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
          );
          setData(sorted);
        }
      } catch {
        // silently fail
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchRevenue();
    return () => {
      cancelled = true;
    };
  }, [stockId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-[#1E293B] bg-[#0F172A] p-8">
        <span className="text-sm text-[#94A3B8]">載入中...</span>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-[#1E293B] bg-[#0F172A] p-8">
        <span className="text-sm text-[#94A3B8]">暫無資料</span>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-[#1E293B] bg-[#0F172A] overflow-hidden">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-[#1E293B]">
            <th className="px-3 py-2 text-left text-sm font-medium text-[#94A3B8]">年月</th>
            <th className="px-3 py-2 text-right text-sm font-medium text-[#94A3B8]">營收(億)</th>
            <th className="px-3 py-2 text-right text-sm font-medium text-[#94A3B8]">MoM%</th>
            <th className="px-3 py-2 text-right text-sm font-medium text-[#94A3B8]">YoY%</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item) => {
            const mom = formatPercent(item.mom_percent);
            const yoy = formatPercent(item.yoy_percent);
            const monthStr = String(item.revenue_month).padStart(2, '0');

            return (
              <tr key={item.date} className="border-t border-[#1E293B]">
                <td className="px-3 py-2 text-sm text-[#F8FAFC]">
                  {item.revenue_year}/{monthStr}
                </td>
                <td className="px-3 py-2 text-right text-sm tabular-nums text-[#F8FAFC]">
                  {(item.revenue / 1e8).toFixed(2)}
                </td>
                <td className={`px-3 py-2 text-right text-sm tabular-nums ${mom.color}`}>
                  {mom.text}
                </td>
                <td className={`px-3 py-2 text-right text-sm tabular-nums ${yoy.color}`}>
                  {yoy.text}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
