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
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') ?? '30', 10);

    if (isNaN(days) || days < 1 || days > 365) {
      return NextResponse.json(
        { error: 'Invalid "days" parameter. Must be between 1 and 365.' },
        { status: 400 }
      );
    }

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
      .order('date', { ascending: false });

    if (error) {
      console.error('Stock news error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
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
    console.error('Stock news unexpected error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
