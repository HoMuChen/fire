import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAuth, validateStockId, handleApiError } from '@/lib/api';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ stockId: string }> }
) {
  try {
    await requireAuth();
    const stockId = await validateStockId(params);

    const admin = createAdminClient();
    const { data, error } = await admin
      .from('dividends')
      .select('date, year, cash_dividend, stock_dividend')
      .eq('stock_id', stockId)
      .order('year', { ascending: false });

    if (error) {
      console.error('Dividends error:', error);
      return NextResponse.json({ error: 'Failed to fetch dividends data' }, { status: 500 });
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
    return handleApiError('Dividends', err);
  }
}
