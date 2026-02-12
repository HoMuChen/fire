import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { verifyCronSecret } from '@/lib/sync-auth';
import {
  fetchStockPrices,
  fetchStockPER,
  fetchInstitutional,
  fetchMarginTrading,
  fetchShareholding,
  fetchNews,
} from '@/lib/finmind';
import { formatDate } from '@/lib/utils';

export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const authError = verifyCronSecret(request);
  if (authError) return authError;

  const supabase = createAdminClient();
  const today = formatDate(new Date());

  // Get all distinct stock IDs from watchlist items
  const { data: watchlistItems } = await supabase
    .from('watchlist_items')
    .select('stock_id');

  if (!watchlistItems || watchlistItems.length === 0) {
    return NextResponse.json({ message: 'No stocks in watchlists to sync' });
  }

  const stockIds = [...new Set(watchlistItems.map((item) => item.stock_id))];
  const results: { stock_id: string; status: string; errors?: string[] }[] = [];

  for (const stockId of stockIds) {
    const errors: string[] = [];
    try {
      // Fetch today's price
      const prices = await fetchStockPrices(stockId, today, today);
      if (prices.length > 0) {
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
        const { error } = await supabase.from('stock_prices').upsert(rows, { onConflict: 'stock_id,date' });
        if (error) errors.push(`stock_prices: ${error.message}`);
      }

      // Fetch today's PER
      const perData = await fetchStockPER(stockId, today);
      if (perData.length > 0) {
        const rows = perData.map((p) => ({
          stock_id: p.stock_id,
          date: p.date,
          per: p.PER,
          pbr: p.PBR,
          dividend_yield: p.dividend_yield,
        }));
        const { error } = await supabase.from('stock_per').upsert(rows, { onConflict: 'stock_id,date' });
        if (error) errors.push(`stock_per: ${error.message}`);
      }

      // Fetch today's institutional
      const institutional = await fetchInstitutional(stockId, today);
      if (institutional.length > 0) {
        const rows = institutional.map((i) => ({
          stock_id: i.stock_id,
          date: i.date,
          investor_name: i.name,
          buy: i.buy,
          sell: i.sell,
        }));
        const { error } = await supabase
          .from('institutional_investors')
          .upsert(rows, { onConflict: 'stock_id,date,investor_name' });
        if (error) errors.push(`institutional_investors: ${error.message}`);
      }

      // Fetch today's margin
      const margin = await fetchMarginTrading(stockId, today);
      if (margin.length > 0) {
        const rows = margin.map((m) => ({
          stock_id: m.stock_id,
          date: m.date,
          margin_purchase_buy: m.MarginPurchaseBuy,
          margin_purchase_sell: m.MarginPurchaseSell,
          margin_purchase_cash_repayment: m.MarginPurchaseCashRepayment,
          margin_purchase_yesterday_balance: m.MarginPurchaseYesterdayBalance,
          margin_purchase_today_balance: m.MarginPurchaseTodayBalance,
          short_sale_buy: m.ShortSaleBuy,
          short_sale_sell: m.ShortSaleSell,
          short_sale_cash_repayment: m.ShortSaleCashRepayment,
          short_sale_yesterday_balance: m.ShortSaleYesterdayBalance,
          short_sale_today_balance: m.ShortSaleTodayBalance,
        }));
        const { error } = await supabase.from('margin_trading').upsert(rows, { onConflict: 'stock_id,date' });
        if (error) errors.push(`margin_trading: ${error.message}`);
      }

      // Fetch today's foreign shareholding
      const shareholding = await fetchShareholding(stockId, today);
      if (shareholding.length > 0) {
        const rows = shareholding.map((s) => ({
          stock_id: s.stock_id,
          date: s.date,
          foreign_holding_shares: s.ForeignInvestmentSharesHolding,
          foreign_holding_percentage: s.ForeignInvestmentShareholdingRatio,
        }));
        const { error } = await supabase.from('foreign_shareholding').upsert(rows, { onConflict: 'stock_id,date' });
        if (error) errors.push(`foreign_shareholding: ${error.message}`);
      }

      // Fetch today's news
      const news = await fetchNews(stockId, today);
      if (news.length > 0) {
        const rows = news.map((n) => ({
          stock_id: n.stock_id,
          date: n.date,
          title: n.title,
          description: n.description,
          link: n.link,
          source: n.source,
        }));
        const { error } = await supabase
          .from('stock_news')
          .upsert(rows, { onConflict: 'stock_id,date,title' });
        if (error) errors.push(`stock_news: ${error.message}`);
      }

      results.push({
        stock_id: stockId,
        status: errors.length > 0 ? 'partial' : 'ok',
        errors: errors.length > 0 ? errors : undefined,
      });
    } catch (error) {
      console.error(`Daily sync failed for ${stockId}:`, error);
      results.push({ stock_id: stockId, status: 'failed' });
    }
  }

  return NextResponse.json({
    message: `Daily sync complete. ${results.filter((r) => r.status === 'ok').length}/${results.length} succeeded.`,
    results,
  });
}
