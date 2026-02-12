'use client';

import { useRouter } from 'next/navigation';
import { MarketOverview } from './MarketOverview';
import { WatchlistTable } from './WatchlistTable';

interface Watchlist {
  id: string;
  name: string;
  sort_order: number;
}

export function DashboardClient({ watchlists }: { watchlists: Watchlist[] }) {
  const router = useRouter();

  return (
    <div className="p-4 space-y-4">
      <MarketOverview />

      <WatchlistTable
        watchlists={watchlists}
        onWatchlistsChange={() => router.refresh()}
      />
    </div>
  );
}
