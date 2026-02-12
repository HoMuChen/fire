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
const REQUEST_DELAY_MS = 8000; // 8 seconds between requests (~7.5 req/min, safe for 600/hr)

let lastRequestTime = 0;

async function rateLimitWait(): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < REQUEST_DELAY_MS && lastRequestTime > 0) {
    await sleep(REQUEST_DELAY_MS - elapsed);
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
  } = {}
): Promise<T[]> {
  await rateLimitWait();

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

// ===== Dataset-specific helpers =====

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
