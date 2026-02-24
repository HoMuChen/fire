// Cron: */5 1-5 * * 1-5 (every 5 min, UTC 1:00–5:55, weekdays = TW market 9:00–13:55)
// POST /api/sync/intraday  Authorization: Bearer $CRON_SECRET
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { verifyCronSecret } from '@/lib/sync-auth';
import { fetchAllRealtimeQuotes } from '@/lib/twse';

export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const authError = verifyCronSecret(request);
  if (authError) return authError;

  console.log('[intraday-sync] Starting intraday sync...');

  const supabase = createAdminClient();

  // Get all synced stocks with their type (twse/tpex) for TWSE API prefix
  const syncedStocks: { stock_id: string; type: string | null }[] = [];
  const PAGE_SIZE = 1000;
  let from = 0;
  while (true) {
    const { data } = await supabase
      .from('stocks')
      .select('stock_id, type')
      .eq('sync_status', 'synced')
      .range(from, from + PAGE_SIZE - 1);
    if (!data || data.length === 0) break;
    syncedStocks.push(...data);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  if (!syncedStocks || syncedStocks.length === 0) {
    console.log('[intraday-sync] No synced stocks found, skipping.');
    return NextResponse.json({ message: 'No synced stocks to update' });
  }

  console.log(`[intraday-sync] Found ${syncedStocks.length} synced stocks: ${syncedStocks.map((s) => s.stock_id).join(', ')}`);

  try {
    const quotes = await fetchAllRealtimeQuotes(
      syncedStocks.map((s) => ({ stock_id: s.stock_id, type: s.type ?? 'twse' })),
    );

    console.log(`[intraday-sync] TWSE API returned ${quotes.length} quotes`);

    if (quotes.length === 0) {
      return NextResponse.json({ message: 'No quotes returned from TWSE API' });
    }

    // Log sample quote for debugging
    console.log('[intraday-sync] Sample quote:', JSON.stringify(quotes[0]));

    // Map to stock_prices rows
    const rows = quotes.map((q) => ({
      stock_id: q.stock_id,
      date: q.date,
      open: q.open,
      high: q.high,
      low: q.low,
      close: q.close,
      volume: q.volume,
      spread: q.spread,
      trading_money: null,
      trading_turnover: null,
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

    console.log(`[intraday-sync] Done. ${quotes.length} quotes upserted, ${errors.length} errors.`);

    return NextResponse.json({
      message: `Intraday sync complete. ${quotes.length} quotes upserted.`,
      quotes_count: quotes.length,
      total_stocks: syncedStocks.length,
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
