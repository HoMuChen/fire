// ─── Time Range ─────────────────────────────────────────────────────────────

export type TimeRange = '1m' | '3m' | '6m' | '1y' | '2y';

export const TIME_RANGES: { key: TimeRange; label: string }[] = [
  { key: '1m', label: '1M' },
  { key: '3m', label: '3M' },
  { key: '6m', label: '6M' },
  { key: '1y', label: '1Y' },
  { key: '2y', label: '2Y' },
];

export const RANGE_PARAMS: Record<TimeRange, { days: number; months: number; quarters: number }> = {
  '1m': { days: 30, months: 1, quarters: 1 },
  '3m': { days: 90, months: 3, quarters: 2 },
  '6m': { days: 180, months: 6, quarters: 2 },
  '1y': { days: 365, months: 12, quarters: 4 },
  '2y': { days: 730, months: 24, quarters: 8 },
};

// ─── Moving Averages ────────────────────────────────────────────────────────

export type MAKey = 'ma5' | 'ma10' | 'ma20' | 'ma60' | 'ma120' | 'ma240';

export const MA_KEYS: { key: MAKey; label: string; color: string }[] = [
  { key: 'ma5', label: 'MA5', color: '#FACC15' },
  { key: 'ma10', label: 'MA10', color: '#F97316' },
  { key: 'ma20', label: 'MA20', color: '#3B82F6' },
  { key: 'ma60', label: 'MA60', color: '#A855F7' },
  { key: 'ma120', label: 'MA120', color: '#EC4899' },
  { key: 'ma240', label: 'MA240', color: '#14B8A6' },
];

export const MA_COLORS: Record<MAKey, string> = {
  ma5: '#FACC15',
  ma10: '#F97316',
  ma20: '#3B82F6',
  ma60: '#A855F7',
  ma120: '#EC4899',
  ma240: '#14B8A6',
};

// ─── Technical Subplot Keys ─────────────────────────────────────────────────

export type TechnicalSubplotKey = 'rsi' | 'macd' | 'kd' | 'bollinger';

export const TECHNICAL_SUBPLOT_KEYS: { key: TechnicalSubplotKey; label: string }[] = [
  { key: 'rsi', label: 'RSI' },
  { key: 'macd', label: 'MACD' },
  { key: 'kd', label: 'KD' },
  { key: 'bollinger', label: 'Bollinger' },
];

// ─── Fundamental & Chips Overlay Keys ───────────────────────────────────────

export type ChipsOverlayKey = 'foreign' | 'trust' | 'dealer' | 'margin';

export const CHIPS_OVERLAY_KEYS: { key: ChipsOverlayKey; label: string }[] = [
  { key: 'foreign', label: '外資' },
  { key: 'trust', label: '投信' },
  { key: 'dealer', label: '自營商' },
  { key: 'margin', label: '融資融券' },
];

// ─── Price & Indicator Data Types ───────────────────────────────────────────

export interface PriceData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  spread: number;
}

export interface MAData {
  date: string;
  value: number;
}

export interface RSIData {
  date: string;
  value: number;
}

export interface MACDData {
  date: string;
  dif: number;
  signal: number;
  histogram: number;
}

export interface KDData {
  date: string;
  k: number;
  d: number;
}

export interface BollingerData {
  date: string;
  upper: number;
  middle: number;
  lower: number;
}

export interface IndicatorsResponse {
  ma5?: MAData[];
  ma10?: MAData[];
  ma20?: MAData[];
  ma60?: MAData[];
  ma120?: MAData[];
  ma240?: MAData[];
  rsi?: RSIData[];
  macd?: MACDData[];
  kd?: KDData[];
  bollinger?: BollingerData[];
}

export interface CrosshairData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  change: number;
  changePercent: string;
}

// ─── Overlay Data Types ─────────────────────────────────────────────────────

export interface InstitutionalDataPoint {
  date: string;
  foreign: { buy: number; sell: number; net: number };
  trust: { buy: number; sell: number; net: number };
  dealer: { buy: number; sell: number; net: number };
  total_net: number;
}

export interface MarginDataPoint {
  date: string;
  margin_balance: number;
  margin_change: number;
  short_balance: number;
  short_change: number;
}

export interface RevenueDataPoint {
  date: string;
  revenue_year: number;
  revenue_month: number;
  revenue: number;
  mom_percent: number | null;
  yoy_percent: number | null;
}

export interface FinancialDataPoint {
  date: string;
  income: Record<string, number>;
  balance_sheet: Record<string, number>;
  cash_flow: Record<string, number>;
}

export interface DividendDataPoint {
  date: string;
  year: number;
  total_dividend: number;
  cash_dividend: number;
  stock_dividend: number;
}

export interface OverlayData {
  institutional?: InstitutionalDataPoint[];
  margin?: MarginDataPoint[];
  revenue?: RevenueDataPoint[];
  financial?: FinancialDataPoint[];
  dividends?: DividendDataPoint[];
}
