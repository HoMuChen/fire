import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();

    const { data: user } = await supabase.auth.getUser();
    if (!user?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get start of today in ISO format (UTC)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayISO = todayStart.toISOString();

    const { data, error } = await supabase
      .from('alert_history')
      .select(
        `
        id,
        alert_id,
        stock_id,
        triggered_at,
        trigger_price,
        message,
        alerts(alert_type, condition_value, is_active),
        stocks(stock_name)
      `
      )
      .gte('triggered_at', todayISO)
      .order('triggered_at', { ascending: false });

    if (error) {
      console.error('Triggered alerts error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Filter to only alerts belonging to the current user
    // (alert_history doesn't have user_id, so we filter via the alerts join)
    const filtered = (data ?? []).filter((row) => {
      const alert = row.alerts as unknown as { alert_type: string; condition_value: number; is_active: boolean } | null;
      return alert !== null;
    });

    return NextResponse.json({ data: filtered });
  } catch (err) {
    console.error('Triggered alerts unexpected error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
