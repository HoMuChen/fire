import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAuth, validateStockId, parseIntParam, handleApiError } from '@/lib/api';

interface InvestorRow {
  date: string;
  investor_name: string;
  buy: number;
  sell: number;
}

interface InvestorNet {
  buy: number;
  sell: number;
  net: number;
}

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

    // First get the distinct dates to limit by days
    const { data: dateRows, error: dateError } = await admin
      .from('institutional_investors')
      .select('date')
      .eq('stock_id', stockId)
      .order('date', { ascending: false })
      .limit(days * 4); // Each date has multiple investor rows

    if (dateError) {
      console.error('Institutional dates error:', dateError);
      return NextResponse.json(
        { error: 'Failed to fetch institutional data' },
        { status: 500 }
      );
    }

    // Get unique dates, limited to requested days
    const uniqueDates = [...new Set((dateRows ?? []).map((r) => r.date as string))].slice(0, days);

    if (uniqueDates.length === 0) {
      return NextResponse.json({ data: [] });
    }

    // Fetch all rows for those dates
    const { data, error } = await admin
      .from('institutional_investors')
      .select('date, investor_name, buy, sell')
      .eq('stock_id', stockId)
      .in('date', uniqueDates)
      .order('date', { ascending: false });

    if (error) {
      console.error('Institutional investors error:', error);
      return NextResponse.json({ error: 'Failed to fetch institutional data' }, { status: 500 });
    }

    // Group by date
    const grouped = new Map<string, InvestorRow[]>();
    for (const row of (data ?? []) as InvestorRow[]) {
      const dateStr = row.date;
      if (!grouped.has(dateStr)) {
        grouped.set(dateStr, []);
      }
      grouped.get(dateStr)!.push(row);
    }

    // Build response
    const result = uniqueDates.map((date) => {
      const rows = grouped.get(date) ?? [];

      const foreign: InvestorNet = { buy: 0, sell: 0, net: 0 };
      const trust: InvestorNet = { buy: 0, sell: 0, net: 0 };
      const dealer: InvestorNet = { buy: 0, sell: 0, net: 0 };

      for (const row of rows) {
        const buy = Number(row.buy);
        const sell = Number(row.sell);

        switch (row.investor_name) {
          case 'Foreign_Investor':
            foreign.buy += buy;
            foreign.sell += sell;
            foreign.net += buy - sell;
            break;
          case 'Investment_Trust':
            trust.buy += buy;
            trust.sell += sell;
            trust.net += buy - sell;
            break;
          case 'Dealer_self':
          case 'Dealer_Hedging':
            dealer.buy += buy;
            dealer.sell += sell;
            dealer.net += buy - sell;
            break;
        }
      }

      const total_net = foreign.net + trust.net + dealer.net;

      return { date, foreign, trust, dealer, total_net };
    });

    return NextResponse.json({ data: result });
  } catch (err) {
    return handleApiError('Institutional investors', err);
  }
}
