import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAuth, validateStockId, parseIntParam, handleApiError } from '@/lib/api';

interface FinancialRow {
  date: string;
  statement_type: string;
  item_name: string;
  value: number;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ stockId: string }> }
) {
  try {
    await requireAuth();
    const stockId = await validateStockId(params);
    const { searchParams } = new URL(request.url);
    const quarters = parseIntParam(searchParams, 'quarters', 8, 1, 40);

    const admin = createAdminClient();

    // First get distinct dates (quarters) ordered by date desc
    const { data: dateRows, error: dateError } = await admin
      .from('financial_statements')
      .select('date')
      .eq('stock_id', stockId)
      .order('date', { ascending: false })
      .limit(quarters * 200);

    if (dateError) {
      console.error('Financial dates error:', dateError);
      return NextResponse.json(
        { error: 'Failed to fetch financial data' },
        { status: 500 }
      );
    }

    // Get unique dates, limited to requested quarters
    const uniqueDates = [
      ...new Set((dateRows ?? []).map((r) => r.date as string)),
    ].slice(0, quarters);

    if (uniqueDates.length === 0) {
      return NextResponse.json({ data: [] });
    }

    // Fetch all rows for those dates
    const { data, error } = await admin
      .from('financial_statements')
      .select('date, statement_type, item_name, value')
      .eq('stock_id', stockId)
      .in('date', uniqueDates)
      .order('date', { ascending: false });

    if (error) {
      console.error('Financial statements error:', error);
      return NextResponse.json({ error: 'Failed to fetch financial data' }, { status: 500 });
    }

    // Group by date, then pivot by statement_type -> item_name -> value
    const grouped = new Map<
      string,
      Map<string, Record<string, number>>
    >();

    for (const row of (data ?? []) as FinancialRow[]) {
      const dateStr = row.date;
      if (!grouped.has(dateStr)) {
        grouped.set(dateStr, new Map());
      }
      const dateGroup = grouped.get(dateStr)!;
      if (!dateGroup.has(row.statement_type)) {
        dateGroup.set(row.statement_type, {});
      }
      dateGroup.get(row.statement_type)![row.item_name] = Number(row.value);
    }

    // Build response in date order (desc)
    const result = uniqueDates.map((date) => {
      const dateGroup = grouped.get(date);
      const entry: Record<string, unknown> = { date };

      if (dateGroup) {
        for (const [stmtType, items] of dateGroup.entries()) {
          entry[stmtType] = items;
        }
      }

      return entry;
    });

    return NextResponse.json({ data: result });
  } catch (err) {
    return handleApiError('Financial statements', err);
  }
}
