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
    const days = parseIntParam(searchParams, 'days', 30, 1, 365);

    // Calculate the cutoff date
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    const cutoffStr = cutoffDate.toISOString();

    const admin = createAdminClient();
    const { data, error } = await admin
      .from('stock_news')
      .select('date, title, description, link, source')
      .eq('stock_id', stockId)
      .gte('date', cutoffStr)
      .order('date', { ascending: false })
      .limit(200);

    if (error) {
      console.error('Stock news error:', error);
      return NextResponse.json({ error: 'Failed to fetch news data' }, { status: 500 });
    }

    const result = (data ?? []).map((row) => ({
      date: row.date,
      title: row.title,
      description: row.description,
      link: row.link,
      source: row.source,
    }));

    return NextResponse.json({ data: result });
  } catch (err) {
    return handleApiError('Stock news', err);
  }
}
