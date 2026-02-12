// ===== FinMind API Response Types =====

export interface FinMindResponse<T> {
  msg: string;
  status: number;
  data: T[];
}

export interface FinMindStockPrice {
  date: string;
  stock_id: string;
  Trading_Volume: number;
  Trading_money: number;
  open: number;
  max: number;
  min: number;
  close: number;
  spread: number;
  Trading_turnover: number;
}

export interface FinMindStockPER {
  date: string;
  stock_id: string;
  dividend_yield: number;
  PER: number;
  PBR: number;
}

export interface FinMindStockInfo {
  industry_category: string;
  stock_id: string;
  stock_name: string;
  type: string;
  date: string;
}

export interface FinMindInstitutionalInvestors {
  date: string;
  stock_id: string;
  name: string;
  buy: number;
  sell: number;
}

export interface FinMindMarginData {
  date: string;
  stock_id: string;
  MarginPurchaseBuy: number;
  MarginPurchaseSell: number;
  MarginPurchaseCashRepayment: number;
  MarginPurchaseYesterdayBalance: number;
  MarginPurchaseTodayBalance: number;
  ShortSaleBuy: number;
  ShortSaleSell: number;
  ShortSaleCashRepayment: number;
  ShortSaleYesterdayBalance: number;
  ShortSaleTodayBalance: number;
}

export interface FinMindShareholding {
  date: string;
  stock_id: string;
  ForeignInvestmentSharesHolding: number;
  ForeignInvestmentRemainingShares: number;
  ForeignInvestmentShareholdingRatio: number;
}

export interface FinMindMonthRevenue {
  date: string;
  stock_id: string;
  country: string;
  revenue: number;
  revenue_month: number;
  revenue_year: number;
}

export interface FinMindFinancialStatement {
  date: string;
  stock_id: string;
  type: string;
  value: number;
  origin_name: string;
}

export interface FinMindDividend {
  date: string;
  stock_id: string;
  StockEarningsDistribution: number;
  StockStatutorySurplus: number;
  StockExDividendTradingDate: string;
  TotalEmployeeStockDividend: number;
  TotalEmployeeStockDividendAmount: number;
  RatioOfEmployeeStockDividendOfTotal: number;
  RatioOfEmployeeStockDividend: number;
  CashEarningsDistribution: number;
  CashStatutorySurplus: number;
  CashExDividendTradingDate: string;
  CashDividendPaymentDate: string;
  TotalEmployeeCashDividend: number;
  TotalNumberOfCashCapitalIncrease: number;
  CashIncreaseSubscriptionRate: number;
  CashIncreaseSubscriptionpable: number;
}

export interface FinMindStockNews {
  date: string;
  stock_id: string;
  description: string;
  link: string;
  source: string;
  title: string;
}

// ===== Database Row Types =====

export type SyncStatus = 'pending' | 'syncing' | 'synced' | 'failed';

export interface DBStock {
  stock_id: string;
  stock_name: string;
  industry_category: string | null;
  type: string;
  sync_status: SyncStatus;
  updated_at: string;
}

export interface DBStockPrice {
  id: number;
  stock_id: string;
  date: string;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
  volume: number | null;
  trading_money: number | null;
  trading_turnover: number | null;
  spread: number | null;
}

export interface DBStockPER {
  id: number;
  stock_id: string;
  date: string;
  per: number | null;
  pbr: number | null;
  dividend_yield: number | null;
}

export interface DBInstitutionalInvestor {
  id: number;
  stock_id: string;
  date: string;
  investor_name: string;
  buy: number | null;
  sell: number | null;
}

export interface DBMarginTrading {
  id: number;
  stock_id: string;
  date: string;
  margin_purchase_buy: number | null;
  margin_purchase_sell: number | null;
  margin_purchase_cash_repayment: number | null;
  margin_purchase_yesterday_balance: number | null;
  margin_purchase_today_balance: number | null;
  short_sale_buy: number | null;
  short_sale_sell: number | null;
  short_sale_cash_repayment: number | null;
  short_sale_yesterday_balance: number | null;
  short_sale_today_balance: number | null;
}

export interface DBForeignShareholding {
  id: number;
  stock_id: string;
  date: string;
  foreign_holding_shares: number | null;
  foreign_holding_percentage: number | null;
}

export interface DBMonthlyRevenue {
  id: number;
  stock_id: string;
  date: string;
  revenue_year: number;
  revenue_month: number;
  revenue: number | null;
}

export interface DBFinancialStatement {
  id: number;
  stock_id: string;
  date: string;
  statement_type: string;
  item_name: string;
  value: number | null;
}

export interface DBDividend {
  id: number;
  stock_id: string;
  date: string;
  year: number | null;
  cash_dividend: number | null;
  stock_dividend: number | null;
}

export interface DBStockNews {
  id: number;
  stock_id: string;
  date: string;
  title: string;
  description: string | null;
  link: string | null;
  source: string | null;
}

export interface DBWatchlist {
  id: string;
  user_id: string;
  name: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface DBWatchlistItem {
  id: string;
  watchlist_id: string;
  stock_id: string;
  sort_order: number;
  added_at: string;
}

export type AlertType =
  | 'price_above'
  | 'price_below'
  | 'rsi_above'
  | 'rsi_below'
  | 'ma_cross_above'
  | 'ma_cross_below';

export interface DBAlert {
  id: string;
  user_id: string;
  stock_id: string;
  alert_type: AlertType;
  condition_value: number | null;
  condition_params: Record<string, unknown> | null;
  is_active: boolean;
  is_triggered: boolean;
  triggered_at: string | null;
  created_at: string;
}

export interface DBAlertHistory {
  id: string;
  alert_id: string;
  stock_id: string;
  triggered_at: string;
  trigger_price: number | null;
  message: string | null;
}
