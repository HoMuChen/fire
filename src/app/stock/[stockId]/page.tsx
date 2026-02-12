import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { calcChangePercent } from '@/lib/utils';
import { StockDetailClient } from '@/components/stock/StockDetailClient';

export async function generateMetadata({ params }: { params: Promise<{ stockId: string }> }) {
  const { stockId } = await params;
  const admin = createAdminClient();
  const { data } = await admin
    .from('stocks')
    .select('stock_id, stock_name')
    .eq('stock_id', stockId)
    .single();

  if (!data) {
    return { title: 'Stock Not Found' };
  }

  return {
    title: `${data.stock_id} ${data.stock_name} - 台股助手`,
    description: `${data.stock_id} ${data.stock_name} 的股票詳情、技術線圖、基本面分析`,
  };
}

export default async function StockDetailPage({ params }: { params: Promise<{ stockId: string }> }) {
  // Auth check
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { stockId } = await params;
  const admin = createAdminClient();

  // Parallel fetch: stock info, latest price, latest PER
  const [stockResult, priceResult, perResult] = await Promise.all([
    admin
      .from('stocks')
      .select('stock_id, stock_name, industry_category, type, sync_status')
      .eq('stock_id', stockId)
      .single(),
    admin
      .from('stock_prices')
      .select('close, spread, open, high, low, volume, date')
      .eq('stock_id', stockId)
      .order('date', { ascending: false })
      .limit(1)
      .maybeSingle(),
    admin
      .from('stock_per')
      .select('per, pbr, dividend_yield')
      .eq('stock_id', stockId)
      .order('date', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (stockResult.error || !stockResult.data) redirect('/');

  const stock = stockResult.data;
  const price = priceResult.data;
  const per = perResult.data;

  const changePercent =
    price?.spread != null && price?.close != null
      ? calcChangePercent(price.spread, price.close)
      : null;

  const stockInfo = {
    stock_id: stock.stock_id,
    stock_name: stock.stock_name,
    industry_category: stock.industry_category,
    type: stock.type,
    sync_status: stock.sync_status,
    price: price
      ? {
          date: price.date,
          close: price.close,
          spread: price.spread,
          change_percent: changePercent,
          open: price.open,
          high: price.high,
          low: price.low,
          volume: price.volume,
        }
      : null,
    valuation: per
      ? {
          per: per.per,
          pbr: per.pbr,
          dividend_yield: per.dividend_yield,
        }
      : null,
  };

  return <StockDetailClient stockInfo={stockInfo} />;
}
