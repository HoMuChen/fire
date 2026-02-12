import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { fetchFinMind } from '@/lib/finmind';
import type { FinMindStockPrice } from '@/types';

const EMPTY_OVERVIEW = {
  date: null,
  up: 0,
  down: 0,
  unchanged: 0,
  total_volume: 0,
  taiex: null,
};

function buildOverviewFromFinMind(prices: FinMindStockPrice[]) {
  if (prices.length === 0) return EMPTY_OVERVIEW;

  // Find the latest trading date in the results
  const latestDate = prices.reduce(
    (max, p) => (p.date > max ? p.date : max),
    prices[0].date
  );
  const latestPrices = prices.filter((p) => p.date === latestDate);

  let up = 0;
  let down = 0;
  let unchanged = 0;
  let totalVolume = 0;

  for (const p of latestPrices) {
    if (p.spread > 0) up++;
    else if (p.spread < 0) down++;
    else unchanged++;
    totalVolume += p.Trading_Volume;
  }

  return {
    date: latestDate,
    up,
    down,
    unchanged,
    total_volume: totalVolume,
    taiex: null as { close: number; spread: number } | null,
  };
}

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();

    const { data: user } = await supabase.auth.getUser();
    if (!user?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Try local DB first
    const { data: latestRow } = await supabase
      .from('stock_prices')
      .select('date')
      .order('date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestRow) {
      const latestDate = latestRow.date;

      const [pricesResult, taiexResult] = await Promise.all([
        supabase
          .from('stock_prices')
          .select('spread, volume')
          .eq('date', latestDate),
        supabase
          .from('stock_prices')
          .select('close, spread')
          .eq('date', latestDate)
          .in('stock_id', ['TAIEX', 'IX0001'])
          .limit(1)
          .maybeSingle(),
      ]);

      if (!pricesResult.error) {
        let up = 0;
        let down = 0;
        let unchanged = 0;
        let totalVolume = 0;

        for (const row of pricesResult.data ?? []) {
          const spread = row.spread ?? 0;
          if (spread > 0) up++;
          else if (spread < 0) down++;
          else unchanged++;
          totalVolume += row.volume ?? 0;
        }

        return NextResponse.json({
          data: {
            date: latestDate,
            up,
            down,
            unchanged,
            total_volume: totalVolume,
            taiex: taiexResult.data
              ? { close: taiexResult.data.close, spread: taiexResult.data.spread }
              : null,
          },
        });
      }
    }

    // 2. No local data — fetch from FinMind directly
    const now = new Date();
    const taiwanOffset = 8 * 60;
    const taiwanMs = now.getTime() + (taiwanOffset + now.getTimezoneOffset()) * 60000;
    const taiwanNow = new Date(taiwanMs);
    const endDate = taiwanNow.toISOString().split('T')[0];
    // Look back 5 days to find the latest trading day
    const startMs = taiwanNow.getTime() - 5 * 86400000;
    const startDate = new Date(startMs).toISOString().split('T')[0];

    const prices = await fetchFinMind<FinMindStockPrice>('TaiwanStockPrice', {
      start_date: startDate,
      end_date: endDate,
    });

    const overview = buildOverviewFromFinMind(prices);
    return NextResponse.json({ data: overview });
  } catch (err) {
    console.error('Market overview unexpected error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
