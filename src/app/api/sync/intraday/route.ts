// Cron: */5 1-5 * * 1-5 (every 5 min, UTC 1:00–5:55, weekdays = TW market 9:00–13:55)
// POST /api/sync/intraday  Authorization: Bearer $CRON_SECRET
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { verifyCronSecret } from '@/lib/sync-auth';
import { fetchAllRealtimeQuotes } from '@/lib/twse';

export const maxDuration = 300;

/** Check if current time is within Taiwan market hours (weekday 9:00–13:30 UTC+8). */
function isMarketHours(): boolean {
  const now = new Date();
  // Convert to Taiwan time (UTC+8)
  const taiwanMs = now.getTime() + (8 * 60 + now.getTimezoneOffset()) * 60000;
  const taiwan = new Date(taiwanMs);

  const day = taiwan.getDay();
  if (day === 0 || day === 6) return false; // weekend

  const hour = taiwan.getHours();
  const minute = taiwan.getMinutes();
  const timeInMinutes = hour * 60 + minute;

  // 9:00 (540) to 13:30 (810)
  return timeInMinutes >= 540 && timeInMinutes <= 810;
}

export async function POST(request: NextRequest) {
  const authError = verifyCronSecret(request);
  if (authError) return authError;

  if (!isMarketHours()) {
    return NextResponse.json({ message: 'Outside Taiwan market hours (9:00–13:30 UTC+8), skipping.' });
  }

  const supabase = createAdminClient();

  // Get all synced stocks with their type (twse/tpex) for TWSE API prefix
  const { data: syncedStocks } = await supabase
    .from('stocks')
    .select('stock_id, type')
    .eq('sync_status', 'synced');

  if (!syncedStocks || syncedStocks.length === 0) {
    return NextResponse.json({ message: 'No synced stocks to update' });
  }

  try {
    const quotes = await fetchAllRealtimeQuotes(
      syncedStocks.map((s) => ({ stock_id: s.stock_id, type: s.type ?? 'twse' })),
    );

    if (quotes.length === 0) {
      return NextResponse.json({ message: 'No quotes returned from TWSE API' });
    }

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
      if (error) errors.push(error.message);
    }

    return NextResponse.json({
      message: `Intraday sync complete. ${quotes.length} quotes upserted.`,
      quotes_count: quotes.length,
      total_stocks: syncedStocks.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Intraday sync failed:', error);
    return NextResponse.json(
      {
        message: 'Intraday sync failed',
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
