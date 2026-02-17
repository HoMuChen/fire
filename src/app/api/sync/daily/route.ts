// Cron: 0 18 * * 1-5 (weekdays 18:00 UTC = 02:00+8, after market close)
// POST /api/sync/daily  Authorization: Bearer $CRON_SECRET
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { verifyCronSecret } from '@/lib/sync-auth';
import {
  fetchMarketPrices,
  fetchMarketPER,
  fetchMarketInstitutional,
  fetchMarketMarginTrading,
  fetchMarketShareholding,
  fetchMarketMonthRevenue,
  fetchMarketFinancialStatements,
  fetchMarketBalanceSheet,
  fetchMarketCashFlow,
  fetchMarketDividends,
  fetchMarketNews,
} from '@/lib/finmind';
import { formatDate } from '@/lib/utils';

export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const authError = verifyCronSecret(request);
  if (authError) return authError;

  const supabase = createAdminClient();
  const today = formatDate(new Date());

  // Get all synced stock IDs for filtering full-market results
  const { data: syncedStocks } = await supabase
    .from('stocks')
    .select('stock_id')
    .eq('sync_status', 'synced');

  if (!syncedStocks || syncedStocks.length === 0) {
    return NextResponse.json({ message: 'No synced stocks to update' });
  }

  const syncedIds = new Set(syncedStocks.map((s) => s.stock_id));
  const errors: string[] = [];
  const counts: Record<string, number> = {};

  // Helper: filter full-market results to synced stocks only
  function filterSynced<T extends { stock_id: string }>(rows: T[]): T[] {
    return rows.filter((r) => syncedIds.has(r.stock_id));
  }

  // Helper: batch upsert (Supabase has row limits, chunk at 1000)
  async function batchUpsert(
    table: string,
    rows: Record<string, unknown>[],
    onConflict: string,
  ) {
    const BATCH_SIZE = 1000;
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const chunk = rows.slice(i, i + BATCH_SIZE);
      const { error } = await supabase.from(table).upsert(chunk, { onConflict });
      if (error) {
        errors.push(`${table}: ${error.message}`);
        return;
      }
    }
    counts[table] = (counts[table] ?? 0) + rows.length;
  }

  try {
    // 1. Stock prices
    const prices = filterSynced(await fetchMarketPrices(today, today));
    if (prices.length > 0) {
      await batchUpsert(
        'stock_prices',
        prices.map((p) => ({
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
        })),
        'stock_id,date',
      );
    }

    // 2. PER / PBR / Dividend yield
    const perData = filterSynced(await fetchMarketPER(today));
    if (perData.length > 0) {
      await batchUpsert(
        'stock_per',
        perData.map((p) => ({
          stock_id: p.stock_id,
          date: p.date,
          per: p.PER,
          pbr: p.PBR,
          dividend_yield: p.dividend_yield,
        })),
        'stock_id,date',
      );
    }

    // 3. Institutional investors
    const institutional = filterSynced(await fetchMarketInstitutional(today));
    if (institutional.length > 0) {
      await batchUpsert(
        'institutional_investors',
        institutional.map((i) => ({
          stock_id: i.stock_id,
          date: i.date,
          investor_name: i.name,
          buy: i.buy,
          sell: i.sell,
        })),
        'stock_id,date,investor_name',
      );
    }

    // 4. Margin trading
    const margin = filterSynced(await fetchMarketMarginTrading(today));
    if (margin.length > 0) {
      await batchUpsert(
        'margin_trading',
        margin.map((m) => ({
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
        })),
        'stock_id,date',
      );
    }

    // 5. Foreign shareholding
    const shareholding = filterSynced(await fetchMarketShareholding(today));
    if (shareholding.length > 0) {
      await batchUpsert(
        'foreign_shareholding',
        shareholding.map((s) => ({
          stock_id: s.stock_id,
          date: s.date,
          foreign_holding_shares: s.ForeignInvestmentSharesHolding,
          foreign_holding_percentage: s.ForeignInvestmentShareholdingRatio,
        })),
        'stock_id,date',
      );
    }

    // 6. Monthly revenue
    const revenue = filterSynced(await fetchMarketMonthRevenue(today));
    if (revenue.length > 0) {
      await batchUpsert(
        'monthly_revenue',
        revenue.map((r) => ({
          stock_id: r.stock_id,
          date: r.date,
          revenue_year: r.revenue_year,
          revenue_month: r.revenue_month,
          revenue: r.revenue,
        })),
        'stock_id,revenue_year,revenue_month',
      );
    }

    // 7. Financial statements (income, balance sheet, cash flow — parallel)
    const [income, balance, cashflow] = await Promise.all([
      fetchMarketFinancialStatements(today),
      fetchMarketBalanceSheet(today),
      fetchMarketCashFlow(today),
    ]);
    const finRows = [
      ...filterSynced(income).map((f) => ({
        stock_id: f.stock_id, date: f.date, statement_type: 'income' as const, item_name: f.type, value: f.value,
      })),
      ...filterSynced(balance).map((f) => ({
        stock_id: f.stock_id, date: f.date, statement_type: 'balance_sheet' as const, item_name: f.type, value: f.value,
      })),
      ...filterSynced(cashflow).map((f) => ({
        stock_id: f.stock_id, date: f.date, statement_type: 'cash_flow' as const, item_name: f.type, value: f.value,
      })),
    ];
    if (finRows.length > 0) {
      await batchUpsert('financial_statements', finRows, 'stock_id,date,statement_type,item_name');
    }

    // 8. Dividends
    const dividends = filterSynced(await fetchMarketDividends(today));
    if (dividends.length > 0) {
      await batchUpsert(
        'dividends',
        dividends.map((d) => ({
          stock_id: d.stock_id,
          date: d.date,
          year: new Date(d.date).getFullYear(),
          cash_dividend: d.CashEarningsDistribution + d.CashStatutorySurplus,
          stock_dividend: d.StockEarningsDistribution + d.StockStatutorySurplus,
        })),
        'stock_id,date',
      );
    }

    // 9. News
    const news = filterSynced(await fetchMarketNews(today));
    if (news.length > 0) {
      await batchUpsert(
        'stock_news',
        news.map((n) => ({
          stock_id: n.stock_id,
          date: n.date,
          title: n.title,
          description: n.description,
          link: n.link,
          source: n.source,
        })),
        'stock_id,date,title',
      );
    }
  } catch (error) {
    console.error('Daily sync failed:', error);
    return NextResponse.json(
      {
        message: 'Daily sync failed',
        error: error instanceof Error ? error.message : String(error),
        partial_counts: counts,
        errors,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    message: `Daily sync complete. ${syncedIds.size} synced stocks. ${Object.keys(counts).length} datasets updated.`,
    synced_stocks: syncedIds.size,
    counts,
    errors: errors.length > 0 ? errors : undefined,
  });
}
