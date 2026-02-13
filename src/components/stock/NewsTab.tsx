'use client';

import { useMemo } from 'react';
import { useFetch } from '@/hooks/useFetch';

interface NewsItem {
  date: string;
  title: string;
  description: string | null;
  link: string;
  source: string;
}

function formatNewsDate(dateStr: string): string {
  const d = new Date(dateStr);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}/${month}/${day}`;
}

export function NewsTab({ stockId }: { stockId: string }) {
  const url = useMemo(() => `/api/stocks/${stockId}/news?days=30`, [stockId]);
  const { data, loading } = useFetch<NewsItem>(url);

  const sorted = useMemo(
    () => [...data].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [data]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-[#1E293B] bg-[#0F172A] p-8">
        <span className="text-sm text-[#94A3B8]">載入中...</span>
      </div>
    );
  }

  if (sorted.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-[#1E293B] bg-[#0F172A] p-8">
        <span className="text-sm text-[#94A3B8]">暫無資料</span>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-sm font-medium text-[#F8FAFC] mb-3">最新新聞</h3>
      <div className="space-y-3">
        {sorted.map((item, index) => (
          <a
            key={`${item.date}-${index}`}
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded-lg border border-[#1E293B] bg-[#1E293B] p-4 hover:bg-[#334155] transition-colors"
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-block rounded bg-[#3B82F6]/10 px-2 py-0.5 text-xs font-medium text-[#3B82F6]">
                {item.source}
              </span>
              <span className="text-xs text-[#94A3B8]">{formatNewsDate(item.date)}</span>
            </div>
            <h4 className="text-sm font-medium text-[#F8FAFC] mb-1">{item.title}</h4>
            {item.description && (
              <p className="text-sm text-[#94A3B8] line-clamp-2">{item.description}</p>
            )}
          </a>
        ))}
      </div>
    </div>
  );
}
