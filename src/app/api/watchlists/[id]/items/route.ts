import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();

    const { data: user } = await supabase.auth.getUser();
    if (!user?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user owns the watchlist (RLS handles this, but good to check)
    const { data: watchlist, error: wlError } = await supabase
      .from('watchlists')
      .select('id')
      .eq('id', id)
      .single();

    if (wlError || !watchlist) {
      return NextResponse.json(
        { error: 'Watchlist not found' },
        { status: 404 }
      );
    }

    const { data, error } = await supabase
      .from('watchlist_items')
      .select('id, stock_id, sort_order, added_at, stocks(stock_id, stock_name, industry_category, type)')
      .eq('watchlist_id', id)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('List watchlist items error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (err) {
    console.error('List watchlist items unexpected error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();

    const { data: user } = await supabase.auth.getUser();
    if (!user?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { stock_id } = body;

    if (!stock_id || typeof stock_id !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid "stock_id" field' },
        { status: 400 }
      );
    }

    // Verify user owns the watchlist
    const { data: watchlist, error: wlError } = await supabase
      .from('watchlists')
      .select('id')
      .eq('id', id)
      .single();

    if (wlError || !watchlist) {
      return NextResponse.json(
        { error: 'Watchlist not found' },
        { status: 404 }
      );
    }

    // Check for duplicate
    const { data: existingItem } = await supabase
      .from('watchlist_items')
      .select('id')
      .eq('watchlist_id', id)
      .eq('stock_id', stock_id)
      .maybeSingle();

    if (existingItem) {
      return NextResponse.json(
        { error: 'Stock already in watchlist' },
        { status: 409 }
      );
    }

    // Determine next sort_order
    const { data: lastItem } = await supabase
      .from('watchlist_items')
      .select('sort_order')
      .eq('watchlist_id', id)
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextSortOrder = lastItem ? lastItem.sort_order + 1 : 0;

    // Insert the watchlist item
    const { data, error } = await supabase
      .from('watchlist_items')
      .insert({
        watchlist_id: id,
        stock_id,
        sort_order: nextSortOrder,
      })
      .select()
      .single();

    if (error) {
      console.error('Add watchlist item error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Set stock sync_status to 'pending' if not already 'synced' (use admin client, no RLS on stocks)
    const admin = createAdminClient();
    const { data: stock } = await admin
      .from('stocks')
      .select('sync_status')
      .eq('stock_id', stock_id)
      .single();

    if (stock && stock.sync_status !== 'synced') {
      await admin
        .from('stocks')
        .update({ sync_status: 'pending' })
        .eq('stock_id', stock_id);
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    console.error('Add watchlist item unexpected error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
