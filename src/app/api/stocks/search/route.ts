import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, handleApiError } from '@/lib/api';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q')?.trim();

    if (!q) {
      return NextResponse.json(
        { error: 'Missing search query parameter "q"' },
        { status: 400 }
      );
    }

    const { supabase } = await requireAuth();

    const pattern = `%${q}%`;

    const { data, error } = await supabase
      .from('stocks')
      .select('stock_id, stock_name, industry_category, type')
      .or(`stock_id.ilike.${pattern},stock_name.ilike.${pattern}`)
      .limit(20);

    if (error) {
      console.error('Stock search error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (err) {
    return handleApiError('Stock search', err);
  }
}
