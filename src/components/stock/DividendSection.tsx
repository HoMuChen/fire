'use client';

import { useEffect, useState } from 'react';

interface DividendData {
  date: string;
  year: number;
  cash_dividend: number;
  stock_dividend: number;
  total_dividend: number;
}

interface DividendSectionProps {
  stockId: string;
}

export function DividendSection({ stockId }: DividendSectionProps) {
  const [data, setData] = useState<DividendData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchDividends() {
      setLoading(true);
      try {
        const res = await fetch(`/api/stocks/${stockId}/dividends`);
        if (!res.ok || cancelled) return;
        const json = await res.json();
        if (!cancelled) {
          const sorted = (json.data as DividendData[]).sort(
            (a, b) => b.year - a.year
          );
          setData(sorted);
        }
      } catch {
        // silently fail
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchDividends();
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
            <th className="px-3 py-2 text-left text-sm font-medium text-[#94A3B8]">年度</th>
            <th className="px-3 py-2 text-right text-sm font-medium text-[#94A3B8]">現金股利</th>
            <th className="px-3 py-2 text-right text-sm font-medium text-[#94A3B8]">股票股利</th>
            <th className="px-3 py-2 text-right text-sm font-medium text-[#94A3B8]">合計</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item) => (
            <tr key={item.date} className="border-t border-[#1E293B]">
              <td className="px-3 py-2 text-sm text-[#F8FAFC]">{item.year}</td>
              <td className="px-3 py-2 text-right text-sm tabular-nums text-[#F8FAFC]">
                {item.cash_dividend.toFixed(2)}
              </td>
              <td className="px-3 py-2 text-right text-sm tabular-nums text-[#F8FAFC]">
                {item.stock_dividend.toFixed(2)}
              </td>
              <td className="px-3 py-2 text-right text-sm tabular-nums text-[#F8FAFC]">
                {item.total_dividend.toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
