'use client';

import { useMemo } from 'react';
import { useFetch } from '@/hooks/useFetch';
import type { DividendDataPoint } from './types';

export function DividendTable({ stockId }: { stockId: string }) {
  const url = useMemo(() => `/api/stocks/${stockId}/dividends`, [stockId]);
  const { data, loading } = useFetch<DividendDataPoint>(url);

  if (loading) return <div className="py-8 text-center text-sm text-[#94A3B8]">載入中...</div>;
  if (data.length === 0) return <div className="py-8 text-center text-sm text-[#64748B]">暫無資料</div>;

  const sorted = [...data].sort((a, b) => b.year - a.year);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[#334155] text-left text-xs text-[#94A3B8]">
            <th className="py-2 pr-4 font-medium">年度</th>
            <th className="py-2 pr-4 text-right font-medium">現金股利</th>
            <th className="py-2 pr-4 text-right font-medium">股票股利</th>
            <th className="py-2 text-right font-medium">合計</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((d) => (
            <tr key={d.year} className="border-b border-[#1E293B]">
              <td className="py-2 pr-4 text-[#F8FAFC]">{d.year}</td>
              <td className="py-2 pr-4 text-right text-[#F8FAFC]">{d.cash_dividend.toFixed(2)}</td>
              <td className="py-2 pr-4 text-right text-[#F8FAFC]">{d.stock_dividend.toFixed(2)}</td>
              <td className="py-2 text-right font-medium text-[#FACC15]">{d.total_dividend.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
