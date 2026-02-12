'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from '@/components/ui/command';

interface StockSearchResult {
  stock_id: string;
  stock_name: string;
  industry_category: string | null;
  type: string;
}

interface StockSearchProps {
  onSelect: (stockId: string, stockName: string) => void;
}

export function StockSearch({ onSelect }: StockSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<StockSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/stocks/search?q=${encodeURIComponent(q.trim())}`);
      if (res.ok) {
        const json = await res.json();
        setResults(json.data ?? []);
      } else {
        setResults([]);
      }
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (!query.trim()) {
      setResults([]);
      return;
    }

    debounceRef.current = setTimeout(() => {
      search(query);
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, search]);

  return (
    <Command
      shouldFilter={false}
      className="rounded-lg border border-[#1E293B] bg-[#0F172A]"
    >
      <CommandInput
        placeholder="搜尋股票代號或名稱..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        {query.trim() && !loading && results.length === 0 && (
          <CommandEmpty>找不到相關股票</CommandEmpty>
        )}
        {loading && (
          <div className="py-4 text-center text-sm text-[#94A3B8]">
            搜尋中...
          </div>
        )}
        {results.length > 0 && (
          <CommandGroup heading="搜尋結果">
            {results.map((stock) => (
              <CommandItem
                key={stock.stock_id}
                value={stock.stock_id}
                onSelect={() => {
                  onSelect(stock.stock_id, stock.stock_name);
                  setQuery('');
                  setResults([]);
                }}
              >
                <span className="font-mono text-[#F8FAFC]">{stock.stock_id}</span>
                <span className="text-[#F8FAFC]">{stock.stock_name}</span>
                {stock.industry_category && (
                  <span className="ml-auto text-xs text-[#94A3B8]">
                    ({stock.industry_category})
                  </span>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </Command>
  );
}
