'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StockHeader } from './StockHeader';
import { KLineChart } from './KLineChart';

export interface StockInfo {
  stock_id: string;
  stock_name: string;
  industry_category: string | null;
  type: string | null;
  sync_status: string | null;
  price: {
    date: string;
    close: number;
    spread: number;
    change_percent: number | null;
    open: number;
    high: number;
    low: number;
    volume: number;
  } | null;
  valuation: {
    per: number | null;
    pbr: number | null;
    dividend_yield: number | null;
  } | null;
}

export function StockDetailClient({ stockInfo }: { stockInfo: StockInfo }) {
  return (
    <div className="p-4 space-y-4">
      <StockHeader stockInfo={stockInfo} />

      {/* K-Line chart */}
      <KLineChart stockId={stockInfo.stock_id} />

      <Tabs defaultValue="fundamentals" className="w-full">
        <TabsList className="bg-[#1E293B] border-[#1E293B]">
          <TabsTrigger value="fundamentals">基本面</TabsTrigger>
          <TabsTrigger value="chips">籌碼面</TabsTrigger>
          <TabsTrigger value="news">新聞</TabsTrigger>
        </TabsList>
        <TabsContent value="fundamentals">
          <div className="rounded-lg border border-[#1E293B] bg-[#0F172A] p-4 text-[#94A3B8]">
            基本面分析 (Coming Soon)
          </div>
        </TabsContent>
        <TabsContent value="chips">
          <div className="rounded-lg border border-[#1E293B] bg-[#0F172A] p-4 text-[#94A3B8]">
            籌碼面分析 (Coming Soon)
          </div>
        </TabsContent>
        <TabsContent value="news">
          <div className="rounded-lg border border-[#1E293B] bg-[#0F172A] p-4 text-[#94A3B8]">
            新聞 (Coming Soon)
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
