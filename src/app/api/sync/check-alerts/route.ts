// Cron: 30 18 * * 1-5 (weekdays 18:30 UTC, after daily sync)
// POST /api/sync/check-alerts  Authorization: Bearer $CRON_SECRET
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { verifyCronSecret } from '@/lib/sync-auth';

function calculateRSI(closes: number[], period: number): number {
  if (closes.length < period + 1) return 50;

  let avgGain = 0;
  let avgLoss = 0;

  // Initial SMA for first period
  for (let i = 1; i <= period; i++) {
    const change = closes[i] - closes[i - 1];
    if (change > 0) avgGain += change;
    else avgLoss += Math.abs(change);
  }

  avgGain /= period;
  avgLoss /= period;

  // Apply Wilder's smoothing for remaining data points
  for (let i = period + 1; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1];
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? Math.abs(change) : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
  }

  if (avgLoss === 0) return 100;

  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

export async function POST(request: NextRequest) {
  const authError = verifyCronSecret(request);
  if (authError) return authError;

  const supabase = createAdminClient();

  // Get all active, un-triggered alerts
  const { data: alerts, error: alertsError } = await supabase
    .from('alerts')
    .select('*')
    .eq('is_active', true)
    .eq('is_triggered', false);

  if (alertsError || !alerts || alerts.length === 0) {
    return NextResponse.json({ message: 'No active alerts to check' });
  }

  const triggered: string[] = [];

  for (const alert of alerts) {
    try {
      // Get latest price for this stock
      const { data: latestPrice } = await supabase
        .from('stock_prices')
        .select('close, date')
        .eq('stock_id', alert.stock_id)
        .order('date', { ascending: false })
        .limit(1)
        .single();

      if (!latestPrice) continue;

      let isTriggered = false;
      let message = '';

      switch (alert.alert_type) {
        case 'price_above':
          if (latestPrice.close > alert.condition_value) {
            isTriggered = true;
            message = `${alert.stock_id} 股價 ${latestPrice.close} 突破 ${alert.condition_value}`;
          }
          break;

        case 'price_below':
          if (latestPrice.close < alert.condition_value) {
            isTriggered = true;
            message = `${alert.stock_id} 股價 ${latestPrice.close} 跌破 ${alert.condition_value}`;
          }
          break;

        case 'rsi_above':
        case 'rsi_below': {
          const { data: recentPrices } = await supabase
            .from('stock_prices')
            .select('close, date')
            .eq('stock_id', alert.stock_id)
            .order('date', { ascending: false })
            .limit(100);

          if (!recentPrices || recentPrices.length < 15) break;

          const closes = recentPrices.reverse().map((p) => p.close);
          const rsi = calculateRSI(closes, 14);

          if (alert.alert_type === 'rsi_above' && rsi > alert.condition_value) {
            isTriggered = true;
            message = `${alert.stock_id} RSI(14) = ${rsi.toFixed(1)} 超過 ${alert.condition_value}`;
          } else if (alert.alert_type === 'rsi_below' && rsi < alert.condition_value) {
            isTriggered = true;
            message = `${alert.stock_id} RSI(14) = ${rsi.toFixed(1)} 低於 ${alert.condition_value}`;
          }
          break;
        }

        case 'ma_cross_above':
        case 'ma_cross_below': {
          const maPeriod = (alert.condition_params as Record<string, number>)?.ma_period ?? 20;
          const { data: maPrices } = await supabase
            .from('stock_prices')
            .select('close, date')
            .eq('stock_id', alert.stock_id)
            .order('date', { ascending: false })
            .limit(maPeriod + 1);

          if (!maPrices || maPrices.length < maPeriod + 1) break;

          const sorted = maPrices.reverse();
          const todayClose = sorted[sorted.length - 1].close;
          const yesterdayClose = sorted[sorted.length - 2].close;
          const maToday =
            sorted.slice(-maPeriod).reduce((sum, p) => sum + p.close, 0) / maPeriod;
          const maYesterday =
            sorted.slice(-maPeriod - 1, -1).reduce((sum, p) => sum + p.close, 0) / maPeriod;

          if (alert.alert_type === 'ma_cross_above') {
            if (todayClose > maToday && yesterdayClose <= maYesterday) {
              isTriggered = true;
              message = `${alert.stock_id} 股價突破 MA${maPeriod} (${maToday.toFixed(2)})`;
            }
          } else {
            if (todayClose < maToday && yesterdayClose >= maYesterday) {
              isTriggered = true;
              message = `${alert.stock_id} 股價跌破 MA${maPeriod} (${maToday.toFixed(2)})`;
            }
          }
          break;
        }
      }

      if (isTriggered) {
        await supabase
          .from('alerts')
          .update({
            is_triggered: true,
            triggered_at: new Date().toISOString(),
          })
          .eq('id', alert.id);

        await supabase.from('alert_history').insert({
          alert_id: alert.id,
          stock_id: alert.stock_id,
          trigger_price: latestPrice.close,
          message,
        });

        triggered.push(alert.id);
      }
    } catch (error) {
      console.error(`Error checking alert ${alert.id}:`, error);
    }
  }

  return NextResponse.json({
    message: `Checked ${alerts.length} alerts, ${triggered.length} triggered`,
    triggered,
  });
}
