// Cron: */5 1-5 * * 1-5 (every 5 min, UTC 1:00–5:55, weekdays = TW market 9:00–13:55)
// POST /api/sync/intraday  Authorization: Bearer $CRON_SECRET
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { verifyCronSecret } from '@/lib/sync-auth';
import { fetchMarketPrices } from '@/lib/finmind';
import { formatDate } from '@/lib/utils';

export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const authError = verifyCronSecret(request);
  if (authError) return authError;

  console.log('[intraday-sync] Starting intraday sync...');

  const supabase = createAdminClient();
  const today = formatDate(new Date());

  // Get all synced stock IDs for filtering
  const syncedStocks: { stock_id: string }[] = [];
  const PAGE_SIZE = 1000;
  let from = 0;
  while (true) {
    const { data } = await supabase
      .from('stocks')
      .select('stock_id')
      .eq('sync_status', 'synced')
      .range(from, from + PAGE_SIZE - 1);
    if (!data || data.length === 0) break;
    syncedStocks.push(...data);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  if (syncedStocks.length === 0) {
    console.log('[intraday-sync] No synced stocks found, skipping.');
    return NextResponse.json({ message: 'No synced stocks to update' });
  }

  const syncedIds = new Set(syncedStocks.map((s) => s.stock_id));
  console.log(`[intraday-sync] Found ${syncedIds.size} synced stocks`);

  try {
    const allPrices = await fetchMarketPrices(today, today);
    const prices = allPrices.filter((p) => syncedIds.has(p.stock_id));

    console.log(`[intraday-sync] FinMind returned ${allPrices.length} total, ${prices.length} matched`);

    if (prices.length === 0) {
      return NextResponse.json({ message: 'No prices returned for synced stocks' });
    }

    // Map to stock_prices rows
    const rows = prices.map((p) => ({
      stock_id: p.stock_id,
      date: p.date,
      open: p.open,
      high: p.max,
      low: p.min,
      close: p.close,
      volume: p.Trading_Volume,
      trading_money: p.Trading_money,
      trading_turnover: p.Trading_turnover,
      spread: p.spread,
    }));

    // Batch upsert (1000 rows at a time)
    const errors: string[] = [];
    const BATCH_SIZE = 1000;
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const chunk = rows.slice(i, i + BATCH_SIZE);
      const { error } = await supabase
        .from('stock_prices')
        .upsert(chunk, { onConflict: 'stock_id,date' });
      if (error) {
        console.error(`[intraday-sync] Upsert error (batch ${i / BATCH_SIZE}):`, error.message);
        errors.push(error.message);
      }
    }

    console.log(`[intraday-sync] Done. ${prices.length} prices upserted, ${errors.length} errors.`);

    return NextResponse.json({
      message: `Intraday sync complete. ${prices.length} prices upserted.`,
      prices_count: prices.length,
      total_stocks: syncedIds.size,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('[intraday-sync] Sync failed:', error);
    return NextResponse.json(
      {
        message: 'Intraday sync failed',
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
