import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ stockId: string }> }
) {
  try {
    const { stockId } = await params;
    const supabase = await createServerSupabaseClient();

    const { data: user } = await supabase.auth.getUser();
    if (!user?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') ?? '60', 10);

    if (isNaN(days) || days < 1 || days > 365) {
      return NextResponse.json(
        { error: 'Invalid "days" parameter. Must be between 1 and 365.' },
        { status: 400 }
      );
    }

    // Get the most recent N rows by date descending, then reverse for ascending order
    const { data, error } = await supabase
      .from('stock_prices')
      .select('date, open, high, low, close, volume, spread')
      .eq('stock_id', stockId)
      .order('date', { ascending: false })
      .limit(days);

    if (error) {
      console.error('Stock prices error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Reverse to ascending order (oldest first) for chart consumption
    const sorted = (data ?? []).reverse();

    return NextResponse.json({ data: sorted });
  } catch (err) {
    console.error('Stock prices unexpected error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
