import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; stockId: string }> }
) {
  try {
    const { id, stockId } = await params;
    const supabase = await createServerSupabaseClient();

    const { data: user } = await supabase.auth.getUser();
    if (!user?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

    const { error } = await supabase
      .from('watchlist_items')
      .delete()
      .eq('watchlist_id', id)
      .eq('stock_id', stockId);

    if (error) {
      console.error('Delete watchlist item error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Delete watchlist item unexpected error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
