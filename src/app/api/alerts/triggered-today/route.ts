import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAuth, handleApiError } from '@/lib/api';

export async function GET() {
  try {
    const { supabase } = await requireAuth();

    // Get start of today in Taiwan time (UTC+8)
    const now = new Date();
    const taiwanOffset = 8 * 60; // UTC+8 in minutes
    const taiwanMs = now.getTime() + (taiwanOffset + now.getTimezoneOffset()) * 60000;
    const taiwanNow = new Date(taiwanMs);
    taiwanNow.setHours(0, 0, 0, 0);
    // Convert back to UTC for the query
    const todayISO = new Date(taiwanNow.getTime() - (taiwanOffset + now.getTimezoneOffset()) * 60000).toISOString();

    // alert_history has FK to alerts but not to stocks, so query without stocks join
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
        alerts(alert_type, condition_value, is_active)
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
    const rows = (data ?? []).filter((row) => {
      const alert = row.alerts as unknown as { alert_type: string; condition_value: number; is_active: boolean } | null;
      return alert !== null;
    });

    // Look up stock names for the triggered alerts
    const stockIds = [...new Set(rows.map((r) => r.stock_id))];
    const stockNameMap: Record<string, string> = {};
    if (stockIds.length > 0) {
      const admin = createAdminClient();
      const { data: stocks } = await admin
        .from('stocks')
        .select('stock_id, stock_name')
        .in('stock_id', stockIds);
      if (stocks) {
        for (const s of stocks) {
          stockNameMap[s.stock_id] = s.stock_name;
        }
      }
    }

    const filtered = rows.map((row) => ({
      ...row,
      stocks: stockNameMap[row.stock_id]
        ? { stock_name: stockNameMap[row.stock_id] }
        : null,
    }));

    return NextResponse.json({ data: filtered });
  } catch (err) {
    return handleApiError('Triggered alerts', err);
  }
}
