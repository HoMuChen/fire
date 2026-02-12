'use client';

import { useEffect, useState } from 'react';

interface FinancialQuarter {
  date: string;
  income: Record<string, number>;
  balance_sheet: Record<string, number>;
  cash_flow: Record<string, number>;
}

interface FinancialSectionProps {
  stockId: string;
}

const FINANCIAL_ITEMS: {
  key: string;
  label: string;
  source: 'income' | 'balance_sheet' | 'cash_flow';
}[] = [
  { key: 'Revenue', label: '營收', source: 'income' },
  { key: 'GrossProfit', label: '毛利', source: 'income' },
  { key: 'OperatingIncome', label: '營業利益', source: 'income' },
  { key: 'NetIncome', label: '稅後淨利', source: 'income' },
  { key: 'TotalAssets', label: '總資產', source: 'balance_sheet' },
  { key: 'TotalLiabilities', label: '總負債', source: 'balance_sheet' },
  { key: 'Equity', label: '股東權益', source: 'balance_sheet' },
  { key: 'OperatingCashFlow', label: '營業活動現金', source: 'cash_flow' },
  { key: 'InvestingCashFlow', label: '投資活動現金', source: 'cash_flow' },
  { key: 'FinancingCashFlow', label: '融資活動現金', source: 'cash_flow' },
];

function formatQuarterLabel(dateStr: string): string {
  const d = new Date(dateStr);
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  let quarter: number;
  if (month <= 3) quarter = 1;
  else if (month <= 6) quarter = 2;
  else if (month <= 9) quarter = 3;
  else quarter = 4;
  return `${year}Q${quarter}`;
}

function formatValue(value: number | undefined): string {
  if (value === undefined || value === null) return '-';
  if (Math.abs(value) > 1e7) {
    return `${(value / 1e8).toFixed(2)}億`;
  }
  return value.toLocaleString();
}

function getValue(
  quarter: FinancialQuarter,
  source: 'income' | 'balance_sheet' | 'cash_flow',
  key: string
): number | undefined {
  const obj = quarter[source];
  if (!obj) return undefined;
  return obj[key];
}

export function FinancialSection({ stockId }: FinancialSectionProps) {
  const [data, setData] = useState<FinancialQuarter[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchFinancial() {
      setLoading(true);
      try {
        const res = await fetch(`/api/stocks/${stockId}/financial?quarters=8`);
        if (!res.ok || cancelled) return;
        const json = await res.json();
        if (!cancelled) {
          const sorted = (json.data as FinancialQuarter[]).sort(
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

    fetchFinancial();
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

  // Filter items to only show those that have at least one value across quarters
  const availableItems = FINANCIAL_ITEMS.filter((item) =>
    data.some((q) => getValue(q, item.source, item.key) !== undefined)
  );

  return (
    <div className="rounded-lg border border-[#1E293B] bg-[#0F172A] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-[#1E293B]">
              <th className="sticky left-0 z-10 bg-[#1E293B] px-3 py-2 text-left text-sm font-medium text-[#94A3B8] whitespace-nowrap">
                項目
              </th>
              {data.map((q) => (
                <th
                  key={q.date}
                  className="px-3 py-2 text-right text-sm font-medium text-[#94A3B8] whitespace-nowrap"
                >
                  {formatQuarterLabel(q.date)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {availableItems.map((item) => (
              <tr key={item.key} className="border-t border-[#1E293B]">
                <td className="sticky left-0 z-10 bg-[#0F172A] px-3 py-2 text-sm text-[#94A3B8] whitespace-nowrap">
                  {item.label}
                </td>
                {data.map((q) => (
                  <td
                    key={q.date}
                    className="px-3 py-2 text-right text-sm tabular-nums text-[#F8FAFC] whitespace-nowrap"
                  >
                    {formatValue(getValue(q, item.source, item.key))}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
