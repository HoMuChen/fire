'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export function NewsFeed() {
  return (
    <Card className="border-[#1E293B] bg-[#1E293B]">
      <CardHeader>
        <CardTitle className="text-[#F8FAFC]">新聞 Feed</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-[#94A3B8]">功能開發中...</p>
      </CardContent>
    </Card>
  );
}
