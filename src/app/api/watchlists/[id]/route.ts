import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function PUT(
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
    const updates: Record<string, unknown> = {};

    if (body.name !== undefined) {
      if (typeof body.name !== 'string' || body.name.trim().length === 0) {
        return NextResponse.json(
          { error: 'Invalid "name" field' },
          { status: 400 }
        );
      }
      updates.name = body.name.trim();
    }

    if (body.sort_order !== undefined) {
      if (typeof body.sort_order !== 'number') {
        return NextResponse.json(
          { error: 'Invalid "sort_order" field' },
          { status: 400 }
        );
      }
      updates.sort_order = body.sort_order;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('watchlists')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Update watchlist error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Watchlist not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ data });
  } catch (err) {
    console.error('Update watchlist unexpected error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    const { error } = await supabase
      .from('watchlists')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Delete watchlist error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Delete watchlist unexpected error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
