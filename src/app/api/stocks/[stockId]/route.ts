import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { calcChangePercent } from '@/lib/utils';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ stockId: string }> }
) {
  // 1. Auth check
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Get stockId from params
  const { stockId } = await params;

  // 3. Use admin client to fetch in parallel
  const admin = createAdminClient();

  const [stockResult, priceResult, perResult] = await Promise.all([
    // a. Stock info
    admin
      .from('stocks')
      .select('stock_id, stock_name, industry_category, type, sync_status')
      .eq('stock_id', stockId)
      .single(),

    // b. Latest stock price
    admin
      .from('stock_prices')
      .select('close, spread, open, high, low, volume, date')
      .eq('stock_id', stockId)
      .order('date', { ascending: false })
      .limit(1)
      .maybeSingle(),

    // c. Latest PER/PBR/dividend yield
    admin
      .from('stock_per')
      .select('per, pbr, dividend_yield')
      .eq('stock_id', stockId)
      .order('date', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  // 4. If stock not found, return 404
  if (stockResult.error || !stockResult.data) {
    return NextResponse.json({ error: 'Stock not found' }, { status: 404 });
  }

  const stock = stockResult.data;
  const priceData = priceResult.data;
  const perData = perResult.data;

  // 5. Compute change_percent from spread and close
  const changePercent =
    priceData?.spread != null && priceData?.close != null
      ? calcChangePercent(priceData.spread, priceData.close)
      : null;

  // 6. Return combined JSON
  return NextResponse.json({
    data: {
      stock_id: stock.stock_id,
      stock_name: stock.stock_name,
      industry_category: stock.industry_category,
      type: stock.type,
      sync_status: stock.sync_status,
      price: priceData
        ? {
            date: priceData.date,
            close: priceData.close,
            spread: priceData.spread,
            change_percent: changePercent,
            open: priceData.open,
            high: priceData.high,
            low: priceData.low,
            volume: priceData.volume,
          }
        : null,
      valuation: perData
        ? {
            per: perData.per,
            pbr: perData.pbr,
            dividend_yield: perData.dividend_yield,
          }
        : null,
    },
  });
}
