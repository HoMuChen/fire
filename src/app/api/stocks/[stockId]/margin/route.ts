import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

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
    if (!/^\d{4,6}$/.test(stockId)) {
      return NextResponse.json({ error: 'Invalid stock ID' }, { status: 400 });
    }
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') ?? '20', 10);

    if (isNaN(days) || days < 1 || days > 365) {
      return NextResponse.json(
        { error: 'Invalid "days" parameter. Must be between 1 and 365.' },
        { status: 400 }
      );
    }

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
    console.error('Margin trading unexpected error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
