import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Convert shares to 張 (1 張 = 1000 股) */
export function formatVolume(shares: number): string {
  const lots = Math.round(shares / 1000);
  return lots.toLocaleString('zh-TW');
}

/** Format currency with commas */
export function formatCurrency(value: number): string {
  return value.toLocaleString('zh-TW', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Calculate change percentage: spread / (close - spread) * 100 */
export function calcChangePercent(spread: number, close: number): number {
  const previousClose = close - spread;
  if (previousClose === 0) return 0;
  return (spread / previousClose) * 100;
}

/** Format date to YYYY-MM-DD */
export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

/** Get date N years ago from today */
export function getDateYearsAgo(years: number): string {
  const date = new Date();
  date.setFullYear(date.getFullYear() - years);
  return formatDate(date);
}

/** Sleep for ms milliseconds */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
