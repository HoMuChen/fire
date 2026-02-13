'use client';

import { useEffect, useState } from 'react';
import type { RevenueDataPoint, TimeRange } from './types';
import { RANGE_PARAMS } from './types';

export function RevenueTable({ stockId, timeRange }: { stockId: string; timeRange: TimeRange }) {
  const [data, setData] = useState<RevenueDataPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const { months } = RANGE_PARAMS[timeRange];

    async function fetchData() {
      setLoading(true);
      try {
        const res = await fetch(`/api/stocks/${stockId}/revenue?months=${months}`);
        if (!res.ok || cancelled) return;
        const json = await res.json();
        if (!cancelled) setData(json.data ?? []);
      } catch {
        // silently fail
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchData();
    return () => { cancelled = true; };
  }, [stockId, timeRange]);

  if (loading) return <div className="py-8 text-center text-sm text-[#94A3B8]">載入中...</div>;
  if (data.length === 0) return <div className="py-8 text-center text-sm text-[#64748B]">暫無資料</div>;

  const sorted = [...data].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[#334155] text-left text-xs text-[#94A3B8]">
            <th className="py-2 pr-4 font-medium">年/月</th>
            <th className="py-2 pr-4 text-right font-medium">營收(億)</th>
            <th className="py-2 pr-4 text-right font-medium">月增率(%)</th>
            <th className="py-2 text-right font-medium">年增率(%)</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((d) => (
            <tr key={d.date} className="border-b border-[#1E293B]">
              <td className="py-2 pr-4 text-[#F8FAFC]">
                {d.revenue_year}/{String(d.revenue_month).padStart(2, '0')}
              </td>
              <td className="py-2 pr-4 text-right text-[#F8FAFC]">
                {(d.revenue / 1e8).toFixed(2)}
              </td>
              <td
                className={`py-2 pr-4 text-right ${
                  d.mom_percent !== null
                    ? d.mom_percent >= 0
                      ? 'text-[#EF4444]'
                      : 'text-[#22C55E]'
                    : 'text-[#64748B]'
                }`}
              >
                {d.mom_percent !== null
                  ? `${d.mom_percent >= 0 ? '+' : ''}${d.mom_percent.toFixed(2)}`
                  : '-'}
              </td>
              <td
                className={`py-2 text-right ${
                  d.yoy_percent !== null
                    ? d.yoy_percent >= 0
                      ? 'text-[#EF4444]'
                      : 'text-[#22C55E]'
                    : 'text-[#64748B]'
                }`}
              >
                {d.yoy_percent !== null
                  ? `${d.yoy_percent >= 0 ? '+' : ''}${d.yoy_percent.toFixed(2)}`
                  : '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
