'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface TriggeredAlert {
  id: string;
  alert_id: string;
  stock_id: string;
  triggered_at: string;
  trigger_price: number | null;
  message: string | null;
  alerts: {
    alert_type: string;
    condition_value: number;
    is_active: boolean;
  } | null;
  stocks: {
    stock_name: string;
  } | null;
}

export function AlertCenter() {
  const [alerts, setAlerts] = useState<TriggeredAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    async function fetchAlerts() {
      try {
        const res = await fetch('/api/alerts/triggered-today');
        if (res.ok) {
          const json = await res.json();
          setAlerts(json.data ?? []);
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    }
    fetchAlerts();
  }, []);

  if (loading) {
    return (
      <div className="text-sm text-[#94A3B8]">載入警示中...</div>
    );
  }

  return (
    <div>
      {/* Header with collapse toggle */}
      <div className="mb-2 flex items-center gap-2">
        <AlertTriangle className="size-4 text-[#F59E0B]" />
        <span className="text-sm font-medium text-[#F8FAFC]">
          今日觸發警示 ({alerts.length})
        </span>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => setCollapsed((prev) => !prev)}
          aria-label={collapsed ? '展開' : '收起'}
        >
          {collapsed ? (
            <ChevronDown className="size-3" />
          ) : (
            <ChevronUp className="size-3" />
          )}
        </Button>
      </div>

      {/* Collapsible content */}
      {!collapsed && (
        <div className="space-y-2">
          {alerts.length === 0 ? (
            <div className="rounded-md border border-[#1E293B] bg-[#1E293B] px-4 py-3 text-sm text-[#94A3B8]">
              今日無觸發警示
            </div>
          ) : (
            alerts.map((alert) => {
              const stockName =
                (alert.stocks as unknown as { stock_name: string } | null)?.stock_name ?? alert.stock_id;

              return (
                <Link
                  key={alert.id}
                  href={`/stock/${alert.stock_id}`}
                  className="block"
                >
                  <Card className="border-[#F59E0B]/30 bg-[#1E293B] transition-colors hover:border-[#F59E0B]/60">
                    <CardContent className="flex items-center gap-3 py-3">
                      <AlertTriangle className="size-4 shrink-0 text-[#F59E0B]" />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-[#F8FAFC]">
                          {alert.stock_id} {stockName}
                        </div>
                        <div className="truncate text-xs text-[#94A3B8]">
                          {alert.message ?? '警示觸發'}
                          {alert.trigger_price !== null && (
                            <span className="ml-1">
                              @ {alert.trigger_price.toLocaleString('zh-TW', { minimumFractionDigits: 2 })}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="shrink-0 text-xs text-[#94A3B8]">
                        {new Date(alert.triggered_at).toLocaleTimeString('zh-TW', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
