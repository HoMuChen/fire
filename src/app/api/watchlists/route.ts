import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, handleApiError } from '@/lib/api';

export async function GET() {
  try {
    const { supabase } = await requireAuth();

    const { data, error } = await supabase
      .from('watchlists')
      .select('id, name, sort_order, created_at')
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('List watchlists error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (err) {
    return handleApiError('List watchlists', err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, user } = await requireAuth();

    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Missing or invalid "name" field' },
        { status: 400 }
      );
    }

    // Determine the next sort_order
    const { data: existing } = await supabase
      .from('watchlists')
      .select('sort_order')
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextSortOrder = existing ? existing.sort_order + 1 : 0;

    const { data, error } = await supabase
      .from('watchlists')
      .insert({
        user_id: user.id,
        name: name.trim(),
        sort_order: nextSortOrder,
      })
      .select()
      .single();

    if (error) {
      console.error('Create watchlist error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    return handleApiError('Create watchlist', err);
  }
}
