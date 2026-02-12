'use client';

import { useEffect, useState } from 'react';

interface InvestorNet {
  buy: number;
  sell: number;
  net: number;
}

interface InstitutionalData {
  date: string;
  foreign: InvestorNet;
  trust: InvestorNet;
  dealer: InvestorNet;
  total_net: number;
}

interface InstitutionalSectionProps {
  stockId: string;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}/${month}/${day}`;
}

function formatNet(shares: number): { text: string; color: string } {
  const zhang = Math.round(shares / 1000);
  if (zhang > 0) {
    return { text: `+${zhang.toLocaleString('zh-TW')}`, color: 'text-[#EF4444]' };
  }
  if (zhang < 0) {
    return { text: zhang.toLocaleString('zh-TW'), color: 'text-[#22C55E]' };
  }
  return { text: '0', color: 'text-[#9CA3AF]' };
}

export function InstitutionalSection({ stockId }: InstitutionalSectionProps) {
  const [data, setData] = useState<InstitutionalData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchInstitutional() {
      setLoading(true);
      try {
        const res = await fetch(`/api/stocks/${stockId}/institutional?days=20`);
        if (!res.ok || cancelled) return;
        const json = await res.json();
        if (!cancelled) {
          const sorted = (json.data as InstitutionalData[]).sort(
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

    fetchInstitutional();
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
        <h3 className="text-sm font-medium text-[#F8FAFC]">三大法人買賣超</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-[#1E293B]">
              <th className="px-3 py-2 text-left text-sm font-medium text-[#94A3B8]">日期</th>
              <th className="px-3 py-2 text-right text-sm font-medium text-[#94A3B8]">外資(張)</th>
              <th className="px-3 py-2 text-right text-sm font-medium text-[#94A3B8]">投信(張)</th>
              <th className="px-3 py-2 text-right text-sm font-medium text-[#94A3B8]">自營商(張)</th>
              <th className="px-3 py-2 text-right text-sm font-medium text-[#94A3B8]">合計(張)</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item) => {
              const foreign = formatNet(item.foreign.net);
              const trust = formatNet(item.trust.net);
              const dealer = formatNet(item.dealer.net);
              const total = formatNet(item.total_net);

              return (
                <tr key={item.date} className="border-t border-[#1E293B]">
                  <td className="px-3 py-2 text-sm text-[#F8FAFC] whitespace-nowrap">
                    {formatDate(item.date)}
                  </td>
                  <td className={`px-3 py-2 text-right text-sm tabular-nums ${foreign.color}`}>
                    {foreign.text}
                  </td>
                  <td className={`px-3 py-2 text-right text-sm tabular-nums ${trust.color}`}>
                    {trust.text}
                  </td>
                  <td className={`px-3 py-2 text-right text-sm tabular-nums ${dealer.color}`}>
                    {dealer.text}
                  </td>
                  <td className={`px-3 py-2 text-right text-sm tabular-nums ${total.color}`}>
                    {total.text}
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
