import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAuth, validateStockId, parseIntParam, handleApiError } from '@/lib/api';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ stockId: string }> }
) {
  try {
    await requireAuth();
    const stockId = await validateStockId(params);
    const { searchParams } = new URL(request.url);
    const days = parseIntParam(searchParams, 'days', 20, 1, 365);

    const admin = createAdminClient();
    const { data, error } = await admin
      .from('margin_trading')
      .select(
        'date, margin_purchase_today_balance, margin_purchase_yesterday_balance, short_sale_today_balance, short_sale_yesterday_balance'
      )
      .eq('stock_id', stockId)
      .order('date', { ascending: false })
      .limit(days);

    if (error) {
      console.error('Margin trading error:', error);
      return NextResponse.json({ error: 'Failed to fetch margin data' }, { status: 500 });
    }

    const result = (data ?? []).map((row) => {
      const marginBalance = Number(row.margin_purchase_today_balance);
      const marginYesterday = Number(row.margin_purchase_yesterday_balance);
      const shortBalance = Number(row.short_sale_today_balance);
      const shortYesterday = Number(row.short_sale_yesterday_balance);

      return {
        date: row.date,
        margin_balance: marginBalance,
        margin_change: marginBalance - marginYesterday,
        short_balance: shortBalance,
        short_change: shortBalance - shortYesterday,
      };
    });

    return NextResponse.json({ data: result });
  } catch (err) {
    return handleApiError('Margin trading', err);
  }
}
