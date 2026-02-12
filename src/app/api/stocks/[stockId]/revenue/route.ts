import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

interface RevenueRow {
  date: string;
  revenue_year: number;
  revenue_month: number;
  revenue: number;
}

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
    const months = parseInt(searchParams.get('months') ?? '12', 10);

    if (isNaN(months) || months < 1 || months > 120) {
      return NextResponse.json(
        { error: 'Invalid "months" parameter. Must be between 1 and 120.' },
        { status: 400 }
      );
    }

    // Fetch extra months to calculate YoY (need 12 more months for previous year)
    const fetchLimit = months + 12;

    const admin = createAdminClient();
    const { data, error } = await admin
      .from('monthly_revenue')
      .select('date, revenue_year, revenue_month, revenue')
      .eq('stock_id', stockId)
      .order('date', { ascending: false })
      .limit(fetchLimit);

    if (error) {
      console.error('Monthly revenue error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const rows = (data ?? []) as RevenueRow[];

    // Build a lookup map by year-month for easy access
    const revenueMap = new Map<string, number>();
    for (const row of rows) {
      const key = `${row.revenue_year}-${row.revenue_month}`;
      revenueMap.set(key, Number(row.revenue));
    }

    // Process only the requested months (the most recent ones)
    const requestedRows = rows.slice(0, months);

    const result = requestedRows.map((row, index) => {
      const currentRevenue = Number(row.revenue);

      // MoM: compare with the next row in the array (which is the previous month since data is desc)
      let momPercent: number | null = null;
      const prevMonthRow = rows[index + 1];
      if (prevMonthRow) {
        const prevRevenue = Number(prevMonthRow.revenue);
        if (prevRevenue !== 0) {
          momPercent =
            ((currentRevenue - prevRevenue) / prevRevenue) * 100;
        }
      }

      // YoY: compare with same month previous year
      let yoyPercent: number | null = null;
      const prevYearKey = `${row.revenue_year - 1}-${row.revenue_month}`;
      const prevYearRevenue = revenueMap.get(prevYearKey);
      if (prevYearRevenue !== undefined && prevYearRevenue !== 0) {
        yoyPercent =
          ((currentRevenue - prevYearRevenue) / prevYearRevenue) * 100;
      }

      return {
        date: row.date,
        revenue_year: row.revenue_year,
        revenue_month: row.revenue_month,
        revenue: currentRevenue,
        mom_percent: momPercent !== null ? Math.round(momPercent * 100) / 100 : null,
        yoy_percent: yoyPercent !== null ? Math.round(yoyPercent * 100) / 100 : null,
      };
    });

    return NextResponse.json({ data: result });
  } catch (err) {
    console.error('Monthly revenue unexpected error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
