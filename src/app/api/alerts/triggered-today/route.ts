import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();

    const { data: user } = await supabase.auth.getUser();
    if (!user?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get start of today in Taiwan time (UTC+8)
    const now = new Date();
    const taiwanOffset = 8 * 60; // UTC+8 in minutes
    const taiwanMs = now.getTime() + (taiwanOffset + now.getTimezoneOffset()) * 60000;
    const taiwanNow = new Date(taiwanMs);
    taiwanNow.setHours(0, 0, 0, 0);
    // Convert back to UTC for the query
    const todayISO = new Date(taiwanNow.getTime() - (taiwanOffset + now.getTimezoneOffset()) * 60000).toISOString();

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
