import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { fetchFinMind } from '@/lib/finmind';
import type { FinMindStockPrice } from '@/types';

function getTaiwanDateStr(daysAgo = 0): string {
  const now = new Date();
  const taiwanOffset = 8 * 60;
  const taiwanMs =
    now.getTime() + (taiwanOffset + now.getTimezoneOffset()) * 60000 - daysAgo * 86400000;
  const d = new Date(taiwanMs);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}

function parseCommaNumber(s: string): number {
  return Number(s.replace(/,/g, '')) || 0;
}

interface TwseTable {
  title: string;
  fields: string[];
  data: string[][];
}

async function fetchTwseMarketStats() {
  // Try today first, then go back up to 5 days to find a trading day
  for (let daysAgo = 0; daysAgo <= 5; daysAgo++) {
    const dateStr = getTaiwanDateStr(daysAgo);
    const url = `https://www.twse.com.tw/exchangeReport/MI_INDEX?response=json&date=${dateStr}&type=MS`;

    const res = await fetch(url);
    if (!res.ok) continue;

    const json = await res.json();
    if (json.stat !== 'OK') continue;

    const tables: TwseTable[] = json.tables ?? [];

    // Table with title containing "漲跌證券數合計" has up/down/unchanged
    const upDownTable = tables.find((t) => t.title?.includes('漲跌'));
    let up = 0;
    let down = 0;
    let unchanged = 0;

    if (upDownTable) {
      for (const row of upDownTable.data) {
        const label = row[0] ?? '';
        // Use the "股票" column (index 2), fallback to "整體市場" (index 1)
        const stockCol = row[2] ?? row[1] ?? '0';
        const value = parseCommaNumber(stockCol.replace(/\(.*\)/, ''));

        if (label.includes('上漲')) up = value;
        else if (label.includes('下跌')) down = value;
        else if (label.includes('持平') || label.includes('unchanged')) unchanged = value;
      }
    }

    // Table with title containing "大盤統計資訊" has volume
    const statsTable = tables.find((t) => t.title?.includes('大盤統計'));
    let totalVolume = 0;

    if (statsTable) {
      // First row "一般股票" has the main volume
      for (const row of statsTable.data) {
        if (row[0]?.includes('一般股票') || row[0]?.includes('合計')) {
          // Trading_money is column 1
          totalVolume += parseCommaNumber(row[1] ?? '0');
        }
      }
    }

    // Format date as YYYY-MM-DD
    const formattedDate = `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;

    return { date: formattedDate, up, down, unchanged, total_volume: totalVolume };
  }

  return null;
}

async function fetchTaiexFromFinMind(startDate: string, endDate: string) {
  try {
    const data = await fetchFinMind<FinMindStockPrice>('TaiwanStockPrice', {
      data_id: 'TAIEX',
      start_date: startDate,
      end_date: endDate,
    });
    if (data.length === 0) return null;
    // Get the latest entry
    const latest = data[data.length - 1];
    return { close: latest.close, spread: latest.spread };
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();

    const { data: user } = await supabase.auth.getUser();
    if (!user?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch from TWSE and FinMind in parallel
    const fiveDaysAgo = getTaiwanDateStr(5);
    const today = getTaiwanDateStr(0);
    const startDate = `${fiveDaysAgo.slice(0, 4)}-${fiveDaysAgo.slice(4, 6)}-${fiveDaysAgo.slice(6, 8)}`;
    const endDate = `${today.slice(0, 4)}-${today.slice(4, 6)}-${today.slice(6, 8)}`;

    const [twseStats, taiex] = await Promise.all([
      fetchTwseMarketStats(),
      fetchTaiexFromFinMind(startDate, endDate),
    ]);

    if (!twseStats) {
      return NextResponse.json({
        data: {
          date: null,
          up: 0,
          down: 0,
          unchanged: 0,
          total_volume: 0,
          taiex: null,
        },
      });
    }

    return NextResponse.json({
      data: {
        ...twseStats,
        taiex,
      },
    });
  } catch (err) {
    console.error('Market overview unexpected error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
