'use client';

import { useEffect, useState } from 'react';

interface MarginData {
  date: string;
  margin_balance: number;
  margin_change: number;
  short_balance: number;
  short_change: number;
}

interface MarginSectionProps {
  stockId: string;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}/${month}/${day}`;
}

function formatBalance(value: number): string {
  return value.toLocaleString('zh-TW');
}

function formatChange(value: number): { text: string; color: string } {
  if (value > 0) {
    return { text: `+${value.toLocaleString('zh-TW')}`, color: 'text-[#EF4444]' };
  }
  if (value < 0) {
    return { text: value.toLocaleString('zh-TW'), color: 'text-[#22C55E]' };
  }
  return { text: '0', color: 'text-[#9CA3AF]' };
}

export function MarginSection({ stockId }: MarginSectionProps) {
  const [data, setData] = useState<MarginData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchMargin() {
      setLoading(true);
      try {
        const res = await fetch(`/api/stocks/${stockId}/margin?days=20`);
        if (!res.ok || cancelled) return;
        const json = await res.json();
        if (!cancelled) {
          const sorted = (json.data as MarginData[]).sort(
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

    fetchMargin();
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
      <div className="px-3 py-2 bg-[#1E293B]">
        <h3 className="text-sm font-medium text-[#F8FAFC]">融資融券</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-[#1E293B]">
              <th className="px-3 py-2 text-left text-sm font-medium text-[#94A3B8]">日期</th>
              <th className="px-3 py-2 text-right text-sm font-medium text-[#94A3B8]">融資餘額(張)</th>
              <th className="px-3 py-2 text-right text-sm font-medium text-[#94A3B8]">融資增減(張)</th>
              <th className="px-3 py-2 text-right text-sm font-medium text-[#94A3B8]">融券餘額(張)</th>
              <th className="px-3 py-2 text-right text-sm font-medium text-[#94A3B8]">融券增減(張)</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item) => {
              const marginChange = formatChange(item.margin_change);
              const shortChange = formatChange(item.short_change);

              return (
                <tr key={item.date} className="border-t border-[#1E293B]">
                  <td className="px-3 py-2 text-sm text-[#F8FAFC] whitespace-nowrap">
                    {formatDate(item.date)}
                  </td>
                  <td className="px-3 py-2 text-right text-sm tabular-nums text-[#F8FAFC]">
                    {formatBalance(item.margin_balance)}
                  </td>
                  <td className={`px-3 py-2 text-right text-sm tabular-nums ${marginChange.color}`}>
                    {marginChange.text}
                  </td>
                  <td className="px-3 py-2 text-right text-sm tabular-nums text-[#F8FAFC]">
                    {formatBalance(item.short_balance)}
                  </td>
                  <td className={`px-3 py-2 text-right text-sm tabular-nums ${shortChange.color}`}>
                    {shortChange.text}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
