import { sleep } from './utils';
import type {
  FinMindResponse,
  FinMindStockInfo,
  FinMindStockPrice,
  FinMindStockPER,
  FinMindInstitutionalInvestors,
  FinMindMarginData,
  FinMindShareholding,
  FinMindMonthRevenue,
  FinMindFinancialStatement,
  FinMindDividend,
  FinMindStockNews,
} from '@/types';

const FINMIND_BASE_URL = 'https://api.finmindtrade.com/api/v4/data';
const PER_STOCK_DELAY_MS = 6000; // 6s between per-stock requests (free tier: 10 req/min)
const MARKET_DELAY_MS = 1000;    // 1s between full-market requests (paid tier: few calls total)

let lastRequestTime = 0;

async function rateLimitWait(delayMs: number): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < delayMs && lastRequestTime > 0) {
    await sleep(delayMs - elapsed);
  }
  lastRequestTime = Date.now();
}

export class FinMindError extends Error {
  constructor(
    message: string,
    public status: number,
    public apiMessage: string
  ) {
    super(message);
    this.name = 'FinMindError';
  }
}

export async function fetchFinMind<T>(
  dataset: string,
  params: {
    data_id?: string;
    start_date?: string;
    end_date?: string;
  } = {},
  options: { fullMarket?: boolean } = {}
): Promise<T[]> {
  await rateLimitWait(options.fullMarket ? MARKET_DELAY_MS : PER_STOCK_DELAY_MS);

  const url = new URL(FINMIND_BASE_URL);
  url.searchParams.set('dataset', dataset);

  if (params.data_id) url.searchParams.set('data_id', params.data_id);
  if (params.start_date) url.searchParams.set('start_date', params.start_date);
  if (params.end_date) url.searchParams.set('end_date', params.end_date);

  const token = process.env.FINMIND_API_TOKEN;
  if (token) url.searchParams.set('token', token);

  const response = await fetch(url.toString());

  if (!response.ok) {
    throw new FinMindError(
      `FinMind API HTTP error: ${response.status}`,
      response.status,
      response.statusText
    );
  }

  const json: FinMindResponse<T> = await response.json();

  if (json.status !== 200 || json.msg !== 'success') {
    throw new FinMindError(
      `FinMind API error: ${json.msg}`,
      json.status,
      json.msg
    );
  }

  return json.data;
}

// ===== Per-stock helpers (used by stock-init) =====

export function fetchStockList() {
  return fetchFinMind<FinMindStockInfo>('TaiwanStockInfo');
}

export function fetchStockPrices(stockId: string, startDate: string, endDate?: string) {
  return fetchFinMind<FinMindStockPrice>('TaiwanStockPrice', {
    data_id: stockId,
    start_date: startDate,
    end_date: endDate,
  });
}

export function fetchStockPER(stockId: string, startDate: string) {
  return fetchFinMind<FinMindStockPER>('TaiwanStockPER', {
    data_id: stockId,
    start_date: startDate,
  });
}

export function fetchInstitutional(stockId: string, startDate: string) {
  return fetchFinMind<FinMindInstitutionalInvestors>(
    'TaiwanStockInstitutionalInvestorsBuySell',
    { data_id: stockId, start_date: startDate }
  );
}

export function fetchMarginTrading(stockId: string, startDate: string) {
  return fetchFinMind<FinMindMarginData>(
    'TaiwanStockMarginPurchaseShortSale',
    { data_id: stockId, start_date: startDate }
  );
}

export function fetchShareholding(stockId: string, startDate: string) {
  return fetchFinMind<FinMindShareholding>('TaiwanStockShareholding', {
    data_id: stockId,
    start_date: startDate,
  });
}

export function fetchMonthRevenue(stockId: string, startDate: string) {
  return fetchFinMind<FinMindMonthRevenue>('TaiwanStockMonthRevenue', {
    data_id: stockId,
    start_date: startDate,
  });
}

export function fetchFinancialStatements(stockId: string, startDate: string) {
  return fetchFinMind<FinMindFinancialStatement>(
    'TaiwanStockFinancialStatements',
    { data_id: stockId, start_date: startDate }
  );
}

export function fetchBalanceSheet(stockId: string, startDate: string) {
  return fetchFinMind<FinMindFinancialStatement>(
    'TaiwanStockBalanceSheet',
    { data_id: stockId, start_date: startDate }
  );
}

export function fetchCashFlow(stockId: string, startDate: string) {
  return fetchFinMind<FinMindFinancialStatement>(
    'TaiwanStockCashFlowsStatement',
    { data_id: stockId, start_date: startDate }
  );
}

export function fetchDividends(stockId: string, startDate: string) {
  return fetchFinMind<FinMindDividend>('TaiwanStockDividend', {
    data_id: stockId,
    start_date: startDate,
  });
}

export function fetchNews(stockId: string, startDate: string) {
  return fetchFinMind<FinMindStockNews>('TaiwanStockNews', {
    data_id: stockId,
    start_date: startDate,
  });
}

// ===== Full-market helpers (used by sync/daily, paid tier) =====

const FM = { fullMarket: true };

export function fetchMarketPrices(startDate: string, endDate?: string) {
  return fetchFinMind<FinMindStockPrice>('TaiwanStockPrice', { start_date: startDate, end_date: endDate }, FM);
}

export function fetchMarketPER(startDate: string) {
  return fetchFinMind<FinMindStockPER>('TaiwanStockPER', { start_date: startDate }, FM);
}

export function fetchMarketInstitutional(startDate: string) {
  return fetchFinMind<FinMindInstitutionalInvestors>('TaiwanStockInstitutionalInvestorsBuySell', { start_date: startDate }, FM);
}

export function fetchMarketMarginTrading(startDate: string) {
  return fetchFinMind<FinMindMarginData>('TaiwanStockMarginPurchaseShortSale', { start_date: startDate }, FM);
}

export function fetchMarketShareholding(startDate: string) {
  return fetchFinMind<FinMindShareholding>('TaiwanStockShareholding', { start_date: startDate }, FM);
}

export function fetchMarketMonthRevenue(startDate: string) {
  return fetchFinMind<FinMindMonthRevenue>('TaiwanStockMonthRevenue', { start_date: startDate }, FM);
}

export function fetchMarketFinancialStatements(startDate: string) {
  return fetchFinMind<FinMindFinancialStatement>('TaiwanStockFinancialStatements', { start_date: startDate }, FM);
}

export function fetchMarketBalanceSheet(startDate: string) {
  return fetchFinMind<FinMindFinancialStatement>('TaiwanStockBalanceSheet', { start_date: startDate }, FM);
}

export function fetchMarketCashFlow(startDate: string) {
  return fetchFinMind<FinMindFinancialStatement>('TaiwanStockCashFlowsStatement', { start_date: startDate }, FM);
}

export function fetchMarketDividends(startDate: string) {
  return fetchFinMind<FinMindDividend>('TaiwanStockDividend', { start_date: startDate }, FM);
}

export function fetchMarketNews(startDate: string) {
  return fetchFinMind<FinMindStockNews>('TaiwanStockNews', { start_date: startDate }, FM);
}
