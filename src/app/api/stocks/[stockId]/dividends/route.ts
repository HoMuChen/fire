import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(
  _request: NextRequest,
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

    const admin = createAdminClient();
    const { data, error } = await admin
      .from('dividends')
      .select('date, year, cash_dividend, stock_dividend')
      .eq('stock_id', stockId)
      .order('year', { ascending: false });

    if (error) {
      console.error('Dividends error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const result = (data ?? []).map((row) => {
      const cashDividend = Number(row.cash_dividend);
      const stockDividend = Number(row.stock_dividend);

      return {
        date: row.date,
        year: row.year,
        cash_dividend: cashDividend,
        stock_dividend: stockDividend,
        total_dividend: cashDividend + stockDividend,
      };
    });

    return NextResponse.json({ data: result });
  } catch (err) {
    console.error('Dividends unexpected error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
