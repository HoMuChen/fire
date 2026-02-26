// Cron: */15 * * * * (every 15 min, picks one pending stock to backfill)
// POST /api/sync/stock-init  Authorization: Bearer $CRON_SECRET
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

async function upsertWithCheck(
  supabase: ReturnType<typeof createAdminClient>,
  table: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rows: Record<string, any>[],
  onConflict: string,
  errors: string[]
) {
  const { error } = await supabase.from(table).upsert(rows, { onConflict });
  if (error) {
    errors.push(`${table}: ${error.message}`);
  }
}

export async function POST(request: NextRequest) {
  const authError = verifyCronSecret(request);
  if (authError) return authError;

  const supabase = createAdminClient();
  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get('start_date') ?? getDateYearsAgo(2);
  const endDate = searchParams.get('end_date') ?? formatDate(new Date());

  // Allow specifying a stock_id via query param or request body
  let targetStockId = searchParams.get('stock_id');

  if (!targetStockId) {
    try {
      const body = await request.json();
      targetStockId = body.stock_id ?? null;
    } catch {
      // no body, that's fine
    }
  }

  let stock: { stock_id: string; stock_name: string } | null = null;

  if (targetStockId) {
    // Sync a specific stock (reset to pending first if needed)
    const { data } = await supabase
      .from('stocks')
      .select('stock_id, stock_name')
      .eq('stock_id', targetStockId)
      .maybeSingle();
    if (!data) {
      return NextResponse.json({ error: `Stock ${targetStockId} not found` }, { status: 404 });
    }
    stock = data;
    // Force reset to pending so it can be synced
    await supabase
      .from('stocks')
      .update({ sync_status: 'pending' })
      .eq('stock_id', targetStockId);
  } else {
    // Auto-pick: prioritize stocks in watchlists
    const { data: watchlistStockIds } = await supabase
      .from('watchlist_items')
      .select('stock_id');

    const wlIds = (watchlistStockIds ?? []).map((r) => r.stock_id);

    // Priority 1: watchlist stocks that are pending
    if (wlIds.length > 0) {
      const { data } = await supabase
        .from('stocks')
        .select('stock_id, stock_name')
        .eq('sync_status', 'pending')
        .in('stock_id', wlIds)
        .limit(1)
        .maybeSingle();
      stock = data;
    }

    // Priority 2: any pending stock
    if (!stock) {
      const { data } = await supabase
        .from('stocks')
        .select('stock_id, stock_name')
        .eq('sync_status', 'pending')
        .limit(1)
        .maybeSingle();
      stock = data;
    }

    if (!stock) {
      return NextResponse.json({ message: 'No pending stocks to sync' });
    }
  }

  // Mark as syncing
  await supabase
    .from('stocks')
    .update({ sync_status: 'syncing' })
    .eq('stock_id', stock.stock_id);

  const upsertErrors: string[] = [];

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
      await upsertWithCheck(supabase, 'stock_prices', rows, 'stock_id,date', upsertErrors);
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
      await upsertWithCheck(supabase, 'stock_per', rows, 'stock_id,date', upsertErrors);
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
      await upsertWithCheck(supabase, 'institutional_investors', rows, 'stock_id,date,investor_name', upsertErrors);
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
      await upsertWithCheck(supabase, 'margin_trading', rows, 'stock_id,date', upsertErrors);
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
      await upsertWithCheck(supabase, 'foreign_shareholding', rows, 'stock_id,date', upsertErrors);
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
      await upsertWithCheck(supabase, 'monthly_revenue', rows, 'stock_id,revenue_year,revenue_month', upsertErrors);
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
      await upsertWithCheck(supabase, 'financial_statements', rows, 'stock_id,date,statement_type,item_name', upsertErrors);
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
      await upsertWithCheck(supabase, 'financial_statements', rows, 'stock_id,date,statement_type,item_name', upsertErrors);
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
      await upsertWithCheck(supabase, 'financial_statements', rows, 'stock_id,date,statement_type,item_name', upsertErrors);
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
      await upsertWithCheck(supabase, 'dividends', rows, 'stock_id,date', upsertErrors);
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
      await upsertWithCheck(supabase, 'stock_news', rows, 'stock_id,date,title', upsertErrors);
    }

    if (upsertErrors.length > 0) {
      console.error(`Upsert errors for ${stock.stock_id}:`, upsertErrors);
      await supabase
        .from('stocks')
        .update({ sync_status: 'failed' })
        .eq('stock_id', stock.stock_id);

      return NextResponse.json({
        error: `Synced ${stock.stock_id} with ${upsertErrors.length} upsert errors`,
        upsertErrors,
      }, { status: 500 });
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
