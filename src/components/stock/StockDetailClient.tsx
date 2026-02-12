'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StockHeader } from './StockHeader';
import { KLineChart } from './KLineChart';
import { FundamentalsTab } from './FundamentalsTab';
import { ChipsTab } from './ChipsTab';
import { NewsTab } from './NewsTab';

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
          <FundamentalsTab stockId={stockInfo.stock_id} />
        </TabsContent>
        <TabsContent value="chips">
          <ChipsTab stockId={stockInfo.stock_id} />
        </TabsContent>
        <TabsContent value="news">
          <NewsTab stockId={stockInfo.stock_id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
