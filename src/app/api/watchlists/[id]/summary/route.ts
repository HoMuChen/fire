import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { calcChangePercent } from '@/lib/utils';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();

    const { data: user } = await supabase.auth.getUser();
    if (!user?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
    async function fetchPrices(adminClient: ReturnType<typeof createAdminClient>, ids: string[]) {
      const map: Record<string, { close: number | null; spread: number | null; volume: number | null }> = {};
      const { data: latestRow } = await adminClient
        .from('stock_prices')
        .select('date')
        .in('stock_id', ids)
        .order('date', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (latestRow?.date) {
        const { data: prices } = await adminClient
          .from('stock_prices')
          .select('stock_id, close, spread, volume')
          .in('stock_id', ids)
          .eq('date', latestRow.date);
        if (prices) {
          for (const p of prices) {
            map[p.stock_id] = { close: p.close, spread: p.spread, volume: p.volume };
          }
        }
      }
      return map;
    }

    async function fetchPer(adminClient: ReturnType<typeof createAdminClient>, ids: string[]) {
      const map: Record<string, { per: number | null; pbr: number | null; dividend_yield: number | null }> = {};
      const { data: latestRow } = await adminClient
        .from('stock_per')
        .select('date')
        .in('stock_id', ids)
        .order('date', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (latestRow?.date) {
        const { data: perData } = await adminClient
          .from('stock_per')
          .select('stock_id, per, pbr, dividend_yield')
          .in('stock_id', ids)
          .eq('date', latestRow.date);
        if (perData) {
          for (const p of perData) {
            map[p.stock_id] = { per: p.per, pbr: p.pbr, dividend_yield: p.dividend_yield };
          }
        }
      }
      return map;
    }

    async function fetchInstitutional(adminClient: ReturnType<typeof createAdminClient>, ids: string[]) {
      const map: Record<string, number> = {};
      const { data: latestRow } = await adminClient
        .from('institutional_investors')
        .select('date')
        .in('stock_id', ids)
        .order('date', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (latestRow?.date) {
        const { data: iiData } = await adminClient
          .from('institutional_investors')
          .select('stock_id, buy, sell')
          .in('stock_id', ids)
          .eq('date', latestRow.date);
        if (iiData) {
          for (const row of iiData) {
            const net = (row.buy ?? 0) - (row.sell ?? 0);
            map[row.stock_id] = (map[row.stock_id] ?? 0) + net;
          }
        }
      }
      return map;
    }

    const [pricesMap, perMap, iiNetMap] = await Promise.all([
      fetchPrices(admin, stockIds),
      fetchPer(admin, stockIds),
      fetchInstitutional(admin, stockIds),
    ]);

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
    console.error('Watchlist summary unexpected error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
