'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RevenueSection } from './RevenueSection';
import { FinancialSection } from './FinancialSection';
import { DividendSection } from './DividendSection';

interface FundamentalsTabProps {
  stockId: string;
}

export function FundamentalsTab({ stockId }: FundamentalsTabProps) {
  return (
    <Tabs defaultValue="revenue" className="w-full">
      <TabsList className="bg-[#1E293B]">
        <TabsTrigger value="revenue">營收</TabsTrigger>
        <TabsTrigger value="financial">財報</TabsTrigger>
        <TabsTrigger value="dividends">股利</TabsTrigger>
      </TabsList>
      <TabsContent value="revenue">
        <RevenueSection stockId={stockId} />
      </TabsContent>
      <TabsContent value="financial">
        <FinancialSection stockId={stockId} />
      </TabsContent>
      <TabsContent value="dividends">
        <DividendSection stockId={stockId} />
      </TabsContent>
    </Tabs>
  );
}
