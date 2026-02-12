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
import { getDateYearsAgo, formatDate } from '@/lib/utils';

export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const authError = verifyCronSecret(request);
  if (authError) return authError;

  const supabase = createAdminClient();
  const startDate = getDateYearsAgo(2);
  const endDate = formatDate(new Date());

  // Pick one pending stock
  const { data: stock, error: pickError } = await supabase
    .from('stocks')
    .select('stock_id, stock_name')
    .eq('sync_status', 'pending')
    .limit(1)
    .single();

  if (pickError || !stock) {
    return NextResponse.json({ message: 'No pending stocks to sync' });
  }

  // Mark as syncing
  await supabase
    .from('stocks')
    .update({ sync_status: 'syncing' })
    .eq('stock_id', stock.stock_id);

  try {
    console.log(`Syncing ${stock.stock_id} ${stock.stock_name}...`);

    // 1. Stock prices
    const prices = await fetchStockPrices(stock.stock_id, startDate, endDate);
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
      await supabase.from('stock_prices').upsert(rows, { onConflict: 'stock_id,date' });
    }

    // 2. PER/PBR
    const perData = await fetchStockPER(stock.stock_id, startDate);
    if (perData.length > 0) {
      const rows = perData.map((p) => ({
        stock_id: p.stock_id,
        date: p.date,
        per: p.PER,
        pbr: p.PBR,
        dividend_yield: p.dividend_yield,
      }));
      await supabase.from('stock_per').upsert(rows, { onConflict: 'stock_id,date' });
    }

    // 3. Institutional investors
    const institutional = await fetchInstitutional(stock.stock_id, startDate);
    if (institutional.length > 0) {
      const rows = institutional.map((i) => ({
        stock_id: i.stock_id,
        date: i.date,
        investor_name: i.name,
        buy: i.buy,
        sell: i.sell,
      }));
      await supabase
        .from('institutional_investors')
        .upsert(rows, { onConflict: 'stock_id,date,investor_name' });
    }

    // 4. Margin trading
    const margin = await fetchMarginTrading(stock.stock_id, startDate);
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
      await supabase.from('margin_trading').upsert(rows, { onConflict: 'stock_id,date' });
    }

    // 5. Foreign shareholding
    const shareholding = await fetchShareholding(stock.stock_id, startDate);
    if (shareholding.length > 0) {
      const rows = shareholding.map((s) => ({
        stock_id: s.stock_id,
        date: s.date,
        foreign_holding_shares: s.ForeignInvestmentSharesHolding,
        foreign_holding_percentage: s.ForeignInvestmentShareholdingRatio,
      }));
      await supabase.from('foreign_shareholding').upsert(rows, { onConflict: 'stock_id,date' });
    }

    // 6. Monthly revenue
    const revenue = await fetchMonthRevenue(stock.stock_id, startDate);
    if (revenue.length > 0) {
      const rows = revenue.map((r) => ({
        stock_id: r.stock_id,
        date: r.date,
        revenue_year: r.revenue_year,
        revenue_month: r.revenue_month,
        revenue: r.revenue,
      }));
      await supabase
        .from('monthly_revenue')
        .upsert(rows, { onConflict: 'stock_id,revenue_year,revenue_month' });
    }

    // 7. Financial statements (income)
    const income = await fetchFinancialStatements(stock.stock_id, startDate);
    if (income.length > 0) {
      const rows = income.map((f) => ({
        stock_id: f.stock_id,
        date: f.date,
        statement_type: 'income',
        item_name: f.type,
        value: f.value,
      }));
      await supabase
        .from('financial_statements')
        .upsert(rows, { onConflict: 'stock_id,date,statement_type,item_name' });
    }

    // 8. Balance sheet
    const balance = await fetchBalanceSheet(stock.stock_id, startDate);
    if (balance.length > 0) {
      const rows = balance.map((f) => ({
        stock_id: f.stock_id,
        date: f.date,
        statement_type: 'balance_sheet',
        item_name: f.type,
        value: f.value,
      }));
      await supabase
        .from('financial_statements')
        .upsert(rows, { onConflict: 'stock_id,date,statement_type,item_name' });
    }

    // 9. Cash flow
    const cashflow = await fetchCashFlow(stock.stock_id, startDate);
    if (cashflow.length > 0) {
      const rows = cashflow.map((f) => ({
        stock_id: f.stock_id,
        date: f.date,
        statement_type: 'cash_flow',
        item_name: f.type,
        value: f.value,
      }));
      await supabase
        .from('financial_statements')
        .upsert(rows, { onConflict: 'stock_id,date,statement_type,item_name' });
    }

    // 10. Dividends (5 years of history)
    const dividends = await fetchDividends(stock.stock_id, getDateYearsAgo(5));
    if (dividends.length > 0) {
      const rows = dividends.map((d) => ({
        stock_id: d.stock_id,
        date: d.date,
        year: new Date(d.date).getFullYear(),
        cash_dividend: d.CashEarningsDistribution + d.CashStatutorySurplus,
        stock_dividend: d.StockEarningsDistribution + d.StockStatutorySurplus,
      }));
      await supabase.from('dividends').upsert(rows, { onConflict: 'stock_id,date' });
    }

    // 11. News (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const news = await fetchNews(stock.stock_id, formatDate(thirtyDaysAgo));
    if (news.length > 0) {
      const rows = news.map((n) => ({
        stock_id: n.stock_id,
        date: n.date,
        title: n.title,
        description: n.description,
        link: n.link,
        source: n.source,
      }));
      await supabase
        .from('stock_news')
        .upsert(rows, { onConflict: 'stock_id,date,title' });
    }

    // Mark as synced
    await supabase
      .from('stocks')
      .update({ sync_status: 'synced', updated_at: new Date().toISOString() })
      .eq('stock_id', stock.stock_id);

    return NextResponse.json({
      message: `Successfully synced ${stock.stock_id} ${stock.stock_name}`,
    });
  } catch (error) {
    console.error(`Failed to sync ${stock.stock_id}:`, error);

    await supabase
      .from('stocks')
      .update({ sync_status: 'failed' })
      .eq('stock_id', stock.stock_id);

    return NextResponse.json(
      { error: `Failed to sync ${stock.stock_id}`, details: String(error) },
      { status: 500 }
    );
  }
}
