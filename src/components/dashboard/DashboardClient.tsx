'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MarketOverview } from './MarketOverview';
import { AlertCenter } from './AlertCenter';
import { WatchlistTable } from './WatchlistTable';
import { MiniChart } from './MiniChart';
import { NewsFeed } from './NewsFeed';

interface Watchlist {
  id: string;
  name: string;
  sort_order: number;
}

export function DashboardClient({ watchlists }: { watchlists: Watchlist[] }) {
  const router = useRouter();
  const [activeStockId, setActiveStockId] = useState<string | null>(null);

  return (
    <div className="p-4 space-y-4">
      {/* Market Overview - top bar */}
      <MarketOverview />

      {/* Alert Center */}
      <AlertCenter />

      {/* Main content: Watchlist + Chart + News */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Left: Watchlist table (2/3 width on xl) */}
        <div className="xl:col-span-2">
          <WatchlistTable
            watchlists={watchlists}
            onStockHover={setActiveStockId}
            onWatchlistsChange={() => router.refresh()}
          />
        </div>

        {/* Right: Mini chart + News feed (1/3 width on xl) */}
        <div className="space-y-4">
          <MiniChart stockId={activeStockId} />
          <NewsFeed />
        </div>
      </div>
    </div>
  );
}
