import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { verifyCronSecret } from '@/lib/sync-auth';
import {
  fetchStockPrices,
  fetchStockPER,
  fetchInstitutional,
  fetchMarginTrading,
  fetchShareholding,
  fetchMonthRevenue,
  fetchFinancialStatements,
  fetchBalanceSheet,
  fetchCashFlow,
  fetchDividends,
  fetchNews,
} from '@/lib/finmind';
import { formatDate } from '@/lib/utils';

export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const authError = verifyCronSecret(request);
  if (authError) return authError;

  const supabase = createAdminClient();
  const today = formatDate(new Date());

  // Get all synced stocks (not just watchlist ones)
  const { data: syncedStocks } = await supabase
    .from('stocks')
    .select('stock_id')
    .eq('sync_status', 'synced');

  if (!syncedStocks || syncedStocks.length === 0) {
    return NextResponse.json({ message: 'No synced stocks to update' });
  }

  const stockIds = syncedStocks.map((s) => s.stock_id);
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

      // Fetch monthly revenue
      const revenue = await fetchMonthRevenue(stockId, today);
      if (revenue.length > 0) {
        const rows = revenue.map((r) => ({
          stock_id: r.stock_id,
          date: r.date,
          revenue_year: r.revenue_year,
          revenue_month: r.revenue_month,
          revenue: r.revenue,
        }));
        const { error } = await supabase
          .from('monthly_revenue')
          .upsert(rows, { onConflict: 'stock_id,revenue_year,revenue_month' });
        if (error) errors.push(`monthly_revenue: ${error.message}`);
      }

      // Fetch financial statements (income, balance sheet, cash flow)
      const [income, balance, cashflow] = await Promise.all([
        fetchFinancialStatements(stockId, today),
        fetchBalanceSheet(stockId, today),
        fetchCashFlow(stockId, today),
      ]);
      const finRows = [
        ...income.map((f) => ({ stock_id: f.stock_id, date: f.date, statement_type: 'income' as const, item_name: f.type, value: f.value })),
        ...balance.map((f) => ({ stock_id: f.stock_id, date: f.date, statement_type: 'balance_sheet' as const, item_name: f.type, value: f.value })),
        ...cashflow.map((f) => ({ stock_id: f.stock_id, date: f.date, statement_type: 'cash_flow' as const, item_name: f.type, value: f.value })),
      ];
      if (finRows.length > 0) {
        const { error } = await supabase
          .from('financial_statements')
          .upsert(finRows, { onConflict: 'stock_id,date,statement_type,item_name' });
        if (error) errors.push(`financial_statements: ${error.message}`);
      }

      // Fetch dividends
      const dividends = await fetchDividends(stockId, today);
      if (dividends.length > 0) {
        const rows = dividends.map((d) => ({
          stock_id: d.stock_id,
          date: d.date,
          year: new Date(d.date).getFullYear(),
          cash_dividend: d.CashEarningsDistribution + d.CashStatutorySurplus,
          stock_dividend: d.StockEarningsDistribution + d.StockStatutorySurplus,
        }));
        const { error } = await supabase.from('dividends').upsert(rows, { onConflict: 'stock_id,date' });
        if (error) errors.push(`dividends: ${error.message}`);
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
