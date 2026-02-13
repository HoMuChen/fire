'use client';

import { useEffect, useState } from 'react';
import type { FinancialDataPoint, TimeRange } from './types';
import { RANGE_PARAMS } from './types';

export function FinancialTable({ stockId, timeRange }: { stockId: string; timeRange: TimeRange }) {
  const [data, setData] = useState<FinancialDataPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const { quarters } = RANGE_PARAMS[timeRange];

    async function fetchData() {
      setLoading(true);
      try {
        const res = await fetch(`/api/stocks/${stockId}/financial?quarters=${quarters}`);
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
            <th className="py-2 pr-4 font-medium">季度</th>
            <th className="py-2 pr-4 text-right font-medium">營收(億)</th>
            <th className="py-2 pr-4 text-right font-medium">毛利(億)</th>
            <th className="py-2 pr-4 text-right font-medium">營業利益(億)</th>
            <th className="py-2 text-right font-medium">淨利(億)</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((d) => {
            const revenue = d.income?.Revenue;
            const grossProfit = d.income?.GrossProfit;
            const operatingIncome = d.income?.OperatingIncome;
            const netIncome = d.income?.NetIncome;

            return (
              <tr key={d.date} className="border-b border-[#1E293B]">
                <td className="py-2 pr-4 text-[#F8FAFC]">{d.date}</td>
                <td className="py-2 pr-4 text-right text-[#F8FAFC]">
                  {revenue !== undefined ? (revenue / 1e8).toFixed(2) : '-'}
                </td>
                <td className="py-2 pr-4 text-right text-[#F8FAFC]">
                  {grossProfit !== undefined ? (grossProfit / 1e8).toFixed(2) : '-'}
                </td>
                <td className="py-2 pr-4 text-right text-[#F8FAFC]">
                  {operatingIncome !== undefined ? (operatingIncome / 1e8).toFixed(2) : '-'}
                </td>
                <td
                  className={`py-2 text-right ${
                    netIncome !== undefined
                      ? netIncome >= 0
                        ? 'text-[#EF4444]'
                        : 'text-[#22C55E]'
                      : 'text-[#64748B]'
                  }`}
                >
                  {netIncome !== undefined ? (netIncome / 1e8).toFixed(2) : '-'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
