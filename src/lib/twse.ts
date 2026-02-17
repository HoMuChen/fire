import { sleep } from './utils';

const TWSE_REALTIME_URL = 'https://mis.twse.com.tw/stock/api/getStockInfo.jsp';
const BATCH_SIZE = 50;
const BATCH_DELAY_MS = 3000;

export interface TWSEQuote {
  stock_id: string;
  date: string;       // YYYY-MM-DD
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;     // in 股 (shares)
  spread: number;     // close - previous close
}

interface TWSERawItem {
  c: string;   // stock code
  z: string;   // current price (or '-' if no trades)
  o: string;   // open
  h: string;   // high
  l: string;   // low
  v: string;   // volume in 張
  y: string;   // previous close
  d: string;   // date YYYYMMDD
  t: string;   // time HH:MM:SS
}

function parseNum(s: string): number | null {
  if (!s || s === '-') return null;
  const n = Number(s.replace(/,/g, ''));
  return isNaN(n) ? null : n;
}

function formatTWSEDate(d: string): string {
  // YYYYMMDD → YYYY-MM-DD
  return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
}

function buildExCh(stocks: { stock_id: string; type: string }[]): string {
  return stocks
    .map((s) => {
      const prefix = s.type === 'tpex' ? 'otc' : 'tse';
      return `${prefix}_${s.stock_id}.tw`;
    })
    .join('|');
}

/**
 * Fetch real-time quotes for a batch of stocks (max ~50).
 */
export async function fetchRealtimeQuotes(
  stocks: { stock_id: string; type: string }[],
): Promise<TWSEQuote[]> {
  if (stocks.length === 0) return [];

  const exCh = buildExCh(stocks);
  const url = `${TWSE_REALTIME_URL}?ex_ch=${exCh}&json=1&delay=0`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`TWSE API HTTP error: ${response.status}`);
  }

  const json = await response.json();
  const items: TWSERawItem[] = json.msgArray ?? [];
  const quotes: TWSEQuote[] = [];

  for (const item of items) {
    const close = parseNum(item.z);
    if (close === null) continue; // no trades yet

    const open = parseNum(item.o);
    const high = parseNum(item.h);
    const low = parseNum(item.l);
    const prevClose = parseNum(item.y);
    const vol = parseNum(item.v);

    if (open === null || high === null || low === null) continue;

    quotes.push({
      stock_id: item.c,
      date: formatTWSEDate(item.d),
      open,
      high,
      low,
      close,
      volume: vol !== null ? vol * 1000 : 0, // 張 → 股
      spread: prevClose !== null ? Math.round((close - prevClose) * 100) / 100 : 0,
    });
  }

  return quotes;
}

/**
 * Fetch real-time quotes for all stocks, batched in groups of 50.
 */
export async function fetchAllRealtimeQuotes(
  stocks: { stock_id: string; type: string }[],
): Promise<TWSEQuote[]> {
  const allQuotes: TWSEQuote[] = [];

  for (let i = 0; i < stocks.length; i += BATCH_SIZE) {
    if (i > 0) await sleep(BATCH_DELAY_MS);
    const batch = stocks.slice(i, i + BATCH_SIZE);
    const quotes = await fetchRealtimeQuotes(batch);
    allQuotes.push(...quotes);
  }

  return allQuotes;
}
