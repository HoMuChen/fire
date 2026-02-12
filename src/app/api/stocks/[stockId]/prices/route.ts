import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  calcSMA,
  calcRSI,
  calcMACD,
  calcKD,
  calcBollinger,
} from '@/lib/indicators';

const RANGE_TO_DAYS: Record<string, number> = {
  '1m': 30,
  '3m': 90,
  '6m': 180,
  '1y': 365,
  '2y': 730,
};

const MA_PERIODS: Record<string, number> = {
  ma5: 5,
  ma10: 10,
  ma20: 20,
  ma60: 60,
  ma120: 120,
  ma240: 240,
};

const INDICATOR_BUFFER = 240;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ stockId: string }> }
) {
  try {
    // Auth check
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { stockId } = await params;
    const { searchParams } = new URL(request.url);

    // Determine days from range (priority) or days param
    const rangeParam = searchParams.get('range');
    const daysParam = searchParams.get('days');
    let days: number;

    if (rangeParam && RANGE_TO_DAYS[rangeParam]) {
      days = RANGE_TO_DAYS[rangeParam];
    } else if (daysParam) {
      days = parseInt(daysParam, 10);
      if (isNaN(days) || days < 1 || days > 730) {
        return NextResponse.json(
          { error: 'Invalid "days" parameter. Must be between 1 and 730.' },
          { status: 400 }
        );
      }
    } else {
      days = 180; // default 6m
    }

    // Parse requested indicators
    const indicatorsParam = searchParams.get('indicators');
    const requestedIndicators = indicatorsParam
      ? indicatorsParam.split(',').map((s) => s.trim().toLowerCase())
      : [];

    // Fetch extra buffer rows for indicator warm-up
    const fetchLimit = days + INDICATOR_BUFFER;

    const admin = createAdminClient();
    const { data, error } = await admin
      .from('stock_prices')
      .select('date, open, high, low, close, volume, spread')
      .eq('stock_id', stockId)
      .order('date', { ascending: false })
      .limit(fetchLimit);

    if (error) {
      console.error('Stock prices error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Reverse to ascending order (oldest first) for indicator calculation
    const allRows = (data ?? []).reverse();

    // Extract arrays for indicator calculations
    const closes = allRows.map((r) => Number(r.close));
    const highs = allRows.map((r) => Number(r.high));
    const lows = allRows.map((r) => Number(r.low));
    const dates = allRows.map((r) => r.date as string);

    // Determine the slice start index: we want the last `days` rows
    const sliceStart = Math.max(0, allRows.length - days);

    // Build price output (only requested days)
    const prices = allRows.slice(sliceStart).map((r) => ({
      date: r.date,
      open: Number(r.open),
      high: Number(r.high),
      low: Number(r.low),
      close: Number(r.close),
      volume: Number(r.volume),
      spread: Number(r.spread),
    }));

    // Compute indicators on full data, then slice
    const indicators: Record<string, unknown[]> = {};

    for (const ind of requestedIndicators) {
      if (MA_PERIODS[ind]) {
        // MA indicators (SMA)
        const period = MA_PERIODS[ind];
        const smaValues = calcSMA(closes, period);
        const sliced: { date: string; value: number }[] = [];
        for (let i = sliceStart; i < allRows.length; i++) {
          if (smaValues[i] !== null) {
            sliced.push({ date: dates[i], value: smaValues[i] as number });
          }
        }
        indicators[ind] = sliced;
      } else if (ind === 'rsi') {
        const rsiValues = calcRSI(closes);
        const sliced: { date: string; value: number }[] = [];
        for (let i = sliceStart; i < allRows.length; i++) {
          if (rsiValues[i] !== null) {
            sliced.push({ date: dates[i], value: rsiValues[i] as number });
          }
        }
        indicators.rsi = sliced;
      } else if (ind === 'macd') {
        const macdResult = calcMACD(closes);
        const sliced: {
          date: string;
          dif: number;
          signal: number;
          histogram: number;
        }[] = [];
        for (let i = sliceStart; i < allRows.length; i++) {
          if (
            macdResult.dif[i] !== null &&
            macdResult.signal[i] !== null &&
            macdResult.histogram[i] !== null
          ) {
            sliced.push({
              date: dates[i],
              dif: macdResult.dif[i] as number,
              signal: macdResult.signal[i] as number,
              histogram: macdResult.histogram[i] as number,
            });
          }
        }
        indicators.macd = sliced;
      } else if (ind === 'kd') {
        const kdResult = calcKD(highs, lows, closes);
        const sliced: { date: string; k: number; d: number }[] = [];
        for (let i = sliceStart; i < allRows.length; i++) {
          if (kdResult.k[i] !== null && kdResult.d[i] !== null) {
            sliced.push({
              date: dates[i],
              k: kdResult.k[i] as number,
              d: kdResult.d[i] as number,
            });
          }
        }
        indicators.kd = sliced;
      } else if (ind === 'bollinger') {
        const bollResult = calcBollinger(closes);
        const sliced: {
          date: string;
          upper: number;
          middle: number;
          lower: number;
        }[] = [];
        for (let i = sliceStart; i < allRows.length; i++) {
          if (
            bollResult.upper[i] !== null &&
            bollResult.middle[i] !== null &&
            bollResult.lower[i] !== null
          ) {
            sliced.push({
              date: dates[i],
              upper: bollResult.upper[i] as number,
              middle: bollResult.middle[i] as number,
              lower: bollResult.lower[i] as number,
            });
          }
        }
        indicators.bollinger = sliced;
      }
    }

    return NextResponse.json({
      data: {
        prices,
        indicators,
      },
    });
  } catch (err) {
    console.error('Stock prices unexpected error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
