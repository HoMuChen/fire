import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();

    const { data: user } = await supabase.auth.getUser();
    if (!user?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Get the latest trading date from stock_prices
    const { data: latestRow, error: latestError } = await supabase
      .from('stock_prices')
      .select('date')
      .order('date', { ascending: false })
      .limit(1)
      .single();

    if (latestError || !latestRow) {
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

    const latestDate = latestRow.date;

    // 2. Count stocks by spread direction and sum volume for the latest date
    const { data: pricesOnDate, error: pricesError } = await supabase
      .from('stock_prices')
      .select('spread, volume')
      .eq('date', latestDate);

    if (pricesError) {
      console.error('Market overview prices error:', pricesError);
      return NextResponse.json(
        { error: pricesError.message },
        { status: 500 }
      );
    }

    let up = 0;
    let down = 0;
    let unchanged = 0;
    let totalVolume = 0;

    for (const row of pricesOnDate ?? []) {
      const spread = row.spread ?? 0;
      if (spread > 0) up++;
      else if (spread < 0) down++;
      else unchanged++;

      totalVolume += row.volume ?? 0;
    }

    // 3. Get TAIEX index close price
    const { data: taiexRow } = await supabase
      .from('stock_prices')
      .select('close, spread')
      .eq('date', latestDate)
      .in('stock_id', ['TAIEX', 'IX0001'])
      .limit(1)
      .maybeSingle();

    return NextResponse.json({
      data: {
        date: latestDate,
        up,
        down,
        unchanged,
        total_volume: totalVolume,
        taiex: taiexRow
          ? { close: taiexRow.close, spread: taiexRow.spread }
          : null,
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
