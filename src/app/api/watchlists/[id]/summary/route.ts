import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { calcChangePercent } from '@/lib/utils';
import { requireAuth, handleApiError } from '@/lib/api';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { supabase } = await requireAuth();

    // Verify watchlist ownership explicitly
    const { data: watchlist, error: watchlistError } = await supabase
      .from('watchlists')
      .select('id')
      .eq('id', id)
      .maybeSingle();

    if (watchlistError || !watchlist) {
      return NextResponse.json({ error: 'Watchlist not found' }, { status: 404 });
    }

    // Get watchlist items with stock info
    const { data: items, error: itemsError } = await supabase
      .from('watchlist_items')
      .select('stock_id, stocks(stock_name, sync_status)')
      .eq('watchlist_id', id)
      .order('sort_order', { ascending: true });

    if (itemsError) {
      console.error('Watchlist summary items error:', itemsError);
      return NextResponse.json({ error: itemsError.message }, { status: 500 });
    }

    if (!items || items.length === 0) {
      return NextResponse.json({ data: [] });
    }

    const stockIds = items.map((item) => item.stock_id);
    const admin = createAdminClient();

    // Fetch prices, PER, and institutional data in parallel
    async function fetchLatestByDate<T extends Record<string, unknown>>(
      table: string,
      ids: string[],
      selectCols: string,
    ): Promise<T[] | null> {
      const { data: latestRow } = await admin
        .from(table)
        .select('date')
        .in('stock_id', ids)
        .order('date', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!latestRow?.date) return null;
      const { data } = await admin
        .from(table)
        .select(selectCols)
        .in('stock_id', ids)
        .eq('date', latestRow.date);
      return data as T[] | null;
    }

    const [priceRows, perRows, iiRows] = await Promise.all([
      fetchLatestByDate<{ stock_id: string; close: number | null; spread: number | null; volume: number | null }>('stock_prices', stockIds, 'stock_id, close, spread, volume'),
      fetchLatestByDate<{ stock_id: string; per: number | null; pbr: number | null; dividend_yield: number | null }>('stock_per', stockIds, 'stock_id, per, pbr, dividend_yield'),
      fetchLatestByDate<{ stock_id: string; buy: number | null; sell: number | null }>('institutional_investors', stockIds, 'stock_id, buy, sell'),
    ]);

    // Build maps
    const pricesMap: Record<string, { close: number | null; spread: number | null; volume: number | null }> = {};
    if (priceRows) {
      for (const p of priceRows) {
        pricesMap[p.stock_id] = { close: p.close, spread: p.spread, volume: p.volume };
      }
    }

    const perMap: Record<string, { per: number | null; pbr: number | null; dividend_yield: number | null }> = {};
    if (perRows) {
      for (const p of perRows) {
        perMap[p.stock_id] = { per: p.per, pbr: p.pbr, dividend_yield: p.dividend_yield };
      }
    }

    const iiNetMap: Record<string, number> = {};
    if (iiRows) {
      for (const row of iiRows) {
        const net = (row.buy ?? 0) - (row.sell ?? 0);
        iiNetMap[row.stock_id] = (iiNetMap[row.stock_id] ?? 0) + net;
      }
    }

    // Build summary response
    const data = items.map((item) => {
      const stock = item.stocks as unknown as { stock_name: string; sync_status: string } | null;
      const price = pricesMap[item.stock_id];
      const per = perMap[item.stock_id];
      const close = price?.close ?? null;
      const spread = price?.spread ?? null;
      const volume = price?.volume ?? null;

      return {
        stock_id: item.stock_id,
        stock_name: stock?.stock_name ?? null,
        close,
        spread,
        change_percent:
          close !== null && spread !== null
            ? Math.round(calcChangePercent(spread, close) * 100) / 100
            : null,
        volume: volume !== null ? Math.round(volume / 1000) : null, // Convert to 張
        per: per?.per ?? null,
        pbr: per?.pbr ?? null,
        dividend_yield: per?.dividend_yield ?? null,
        institutional_net: iiNetMap[item.stock_id] ?? null,
        sync_status: stock?.sync_status ?? null,
      };
    });

    return NextResponse.json({ data });
  } catch (err) {
    return handleApiError('Watchlist summary', err);
  }
}
