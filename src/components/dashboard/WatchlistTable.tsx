'use client';

import { useEffect, useState, useCallback } from 'react';
import { Settings, Plus, Trash2, X, ChevronDown } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { NumberDisplay } from '@/components/shared/NumberDisplay';
import { StockSearch } from '@/components/shared/StockSearch';
import { cn } from '@/lib/utils';

interface Watchlist {
  id: string;
  name: string;
}

interface StockSummary {
  stock_id: string;
  stock_name: string | null;
  close: number | null;
  spread: number | null;
  change_percent: number | null;
  volume: number | null;
  per: number | null;
  pbr: number | null;
  dividend_yield: number | null;
  institutional_net: number | null;
  sync_status: string | null;
}

interface WatchlistItem {
  id: string;
  stock_id: string;
  sort_order: number;
  added_at: string;
  stocks: {
    stock_id: string;
    stock_name: string;
    industry_category: string | null;
    type: string;
  } | null;
}

interface WatchlistTableProps {
  watchlists: Watchlist[];
  onWatchlistsChange?: () => void;
}

export function WatchlistTable({
  watchlists,
  onWatchlistsChange,
}: WatchlistTableProps) {
  const [activeTab, setActiveTab] = useState<string>(watchlists[0]?.id ?? '');
  const [summaryData, setSummaryData] = useState<StockSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [newWatchlistName, setNewWatchlistName] = useState('');
  const [creatingWatchlist, setCreatingWatchlist] = useState(false);
  const [watchlistItems, setWatchlistItems] = useState<WatchlistItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [deletingWatchlist, setDeletingWatchlist] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [settingsExpanded, setSettingsExpanded] = useState(false);

  // Fetch summary for the active watchlist
  const fetchSummary = useCallback(async (watchlistId: string) => {
    if (!watchlistId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/watchlists/${watchlistId}/summary`);
      if (res.ok) {
        const json = await res.json();
        setSummaryData(json.data ?? []);
      } else {
        setSummaryData([]);
      }
    } catch {
      setSummaryData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch items for management dialog
  const fetchItems = useCallback(async (watchlistId: string) => {
    if (!watchlistId) return;
    setLoadingItems(true);
    try {
      const res = await fetch(`/api/watchlists/${watchlistId}/items`);
      if (res.ok) {
        const json = await res.json();
        setWatchlistItems(json.data ?? []);
      } else {
        setWatchlistItems([]);
      }
    } catch {
      setWatchlistItems([]);
    } finally {
      setLoadingItems(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab) {
      fetchSummary(activeTab);
    }
  }, [activeTab, fetchSummary]);

  // Update activeTab if watchlists change
  useEffect(() => {
    if (watchlists.length > 0 && !watchlists.find((w) => w.id === activeTab)) {
      setActiveTab(watchlists[0].id);
    }
  }, [watchlists, activeTab]);

  // Create a new watchlist
  async function handleCreateWatchlist() {
    if (!newWatchlistName.trim()) return;
    setCreatingWatchlist(true);
    try {
      const res = await fetch('/api/watchlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newWatchlistName.trim() }),
      });
      if (res.ok) {
        setNewWatchlistName('');
        onWatchlistsChange?.();
      }
    } catch {
      // silently fail
    } finally {
      setCreatingWatchlist(false);
    }
  }

  // Delete the active watchlist
  async function handleDeleteWatchlist() {
    if (!activeTab) return;
    setDeletingWatchlist(true);
    try {
      const res = await fetch(`/api/watchlists/${activeTab}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        onWatchlistsChange?.();
        setSheetOpen(false);
        setConfirmDelete(false);
      }
    } catch {
      // silently fail
    } finally {
      setDeletingWatchlist(false);
    }
  }

  // Add stock to watchlist
  async function handleAddStock(stockId: string) {
    if (!activeTab) return;
    try {
      const res = await fetch(`/api/watchlists/${activeTab}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stock_id: stockId }),
      });
      if (res.ok) {
        fetchItems(activeTab);
        fetchSummary(activeTab);
      }
    } catch {
      // silently fail
    }
  }

  // Remove stock from watchlist
  async function handleRemoveStock(stockId: string) {
    if (!activeTab) return;
    try {
      const res = await fetch(`/api/watchlists/${activeTab}/items/${stockId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        fetchItems(activeTab);
        fetchSummary(activeTab);
      }
    } catch {
      // silently fail
    }
  }

  // Open management sheet
  function openManageSheet() {
    setSheetOpen(true);
    setConfirmDelete(false);
    setSettingsExpanded(false);
    if (activeTab) {
      fetchItems(activeTab);
    }
  }

  const activeWatchlistName = watchlists.find((w) => w.id === activeTab)?.name;

  // Shared Sheet content
  const sheetContent = (
    <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
      <SheetContent
        side="right"
        className="flex h-full w-[380px] flex-col border-[#1E293B] bg-[#0F172A] p-0 sm:max-w-[380px]"
      >
        <SheetHeader className="border-b border-[#1E293B] px-4 py-4">
          <SheetTitle className="text-[#F8FAFC]">
            {activeWatchlistName ? `管理 — ${activeWatchlistName}` : '管理自選清單'}
          </SheetTitle>
          <SheetDescription className="text-[#94A3B8]">
            搜尋並新增股票，或管理清單設定
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Primary: Add stock search */}
          {activeTab && (
            <div className="border-b border-[#1E293B] px-4 py-3">
              <StockSearch onSelect={handleAddStock} />
            </div>
          )}

          {/* Stock list */}
          {activeTab && (
            <div className="flex-1 overflow-y-auto px-4 py-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wider text-[#64748B]">
                  清單股票
                </span>
                <span className="text-xs text-[#64748B]">
                  {loadingItems ? '...' : `${watchlistItems.length} 檔`}
                </span>
              </div>
              {loadingItems ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-9 animate-pulse rounded-md bg-[#1E293B]" />
                  ))}
                </div>
              ) : watchlistItems.length === 0 ? (
                <div className="rounded-md border border-dashed border-[#334155] px-3 py-6 text-center text-sm text-[#64748B]">
                  使用上方搜尋加入股票
                </div>
              ) : (
                <div className="space-y-1">
                  {watchlistItems.map((item) => {
                    const stock = item.stocks as unknown as {
                      stock_id: string;
                      stock_name: string;
                    } | null;
                    return (
                      <div
                        key={item.id}
                        className="group flex items-center justify-between rounded-md px-3 py-2 transition-colors hover:bg-[#1E293B]"
                      >
                        <div className="text-sm text-[#F8FAFC]">
                          <span className="font-mono text-[#94A3B8]">{item.stock_id}</span>
                          <span className="ml-2">{stock?.stock_name ?? ''}</span>
                        </div>
                        <button
                          onClick={() => handleRemoveStock(item.stock_id)}
                          className="cursor-pointer rounded p-1 text-[#475569] opacity-0 transition-all hover:bg-[#334155] hover:text-[#EF4444] group-hover:opacity-100"
                          aria-label={`移除 ${item.stock_id}`}
                        >
                          <X className="size-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Secondary: Watchlist settings (collapsible) */}
          <div className="border-t border-[#1E293B]">
            <button
              onClick={() => setSettingsExpanded((v) => !v)}
              className="flex w-full cursor-pointer items-center justify-between px-4 py-3 text-xs font-medium uppercase tracking-wider text-[#64748B] transition-colors hover:text-[#94A3B8]"
            >
              清單設定
              <ChevronDown
                className={cn(
                  'size-3.5 transition-transform duration-200',
                  settingsExpanded && 'rotate-180'
                )}
              />
            </button>
            {settingsExpanded && (
              <div className="space-y-3 px-4 pb-4">
                {/* Create new watchlist */}
                <div className="flex gap-2">
                  <Input
                    placeholder="新清單名稱..."
                    value={newWatchlistName}
                    onChange={(e) => setNewWatchlistName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCreateWatchlist();
                    }}
                    className="border-[#334155] bg-[#1E293B] text-[#F8FAFC] placeholder:text-[#475569]"
                  />
                  <Button
                    onClick={handleCreateWatchlist}
                    disabled={creatingWatchlist || !newWatchlistName.trim()}
                    size="sm"
                    className="shrink-0"
                  >
                    <Plus className="size-4" />
                    建立
                  </Button>
                </div>

                {/* Delete current watchlist */}
                {activeTab && (
                  <div>
                    {!confirmDelete ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start text-[#64748B] hover:text-[#EF4444]"
                        onClick={() => setConfirmDelete(true)}
                      >
                        <Trash2 className="size-3.5" />
                        刪除「{activeWatchlistName}」
                      </Button>
                    ) : (
                      <div className="flex items-center gap-2 rounded-md bg-[#EF4444]/10 px-3 py-2">
                        <span className="flex-1 text-xs text-[#EF4444]">確定刪除？此操作無法復原</span>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={handleDeleteWatchlist}
                          disabled={deletingWatchlist}
                        >
                          刪除
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs text-[#94A3B8]"
                          onClick={() => setConfirmDelete(false)}
                        >
                          取消
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );

  if (watchlists.length === 0) {
    return (
      <div className="rounded-lg border border-[#1E293B] bg-[#1E293B] p-6 text-center">
        <p className="text-sm text-[#94A3B8]">尚無自選清單</p>
        <Button
          variant="outline"
          size="sm"
          className="mt-3"
          onClick={openManageSheet}
        >
          <Plus className="size-4" />
          建立自選清單
        </Button>
        {sheetContent}
      </div>
    );
  }

  return (
    <div>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="mb-3 flex items-center justify-between">
          <TabsList>
            {watchlists.map((wl) => (
              <TabsTrigger key={wl.id} value={wl.id}>
                {wl.name}
              </TabsTrigger>
            ))}
          </TabsList>
          <Button variant="ghost" size="sm" onClick={openManageSheet}>
            <Settings className="size-4" />
            管理清單
          </Button>
        </div>

        {watchlists.map((wl) => (
          <TabsContent key={wl.id} value={wl.id}>
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="h-10 animate-pulse rounded bg-[#1E293B]"
                  />
                ))}
              </div>
            ) : summaryData.length === 0 ? (
              <div className="rounded-lg border border-[#1E293B] bg-[#1E293B] py-8 text-center text-sm text-[#94A3B8]">
                此清單尚無股票，請點擊「管理清單」新增
              </div>
            ) : (
              <div className="rounded-lg border border-[#1E293B] bg-[#1E293B]">
                <Table>
                  <TableHeader>
                    <TableRow className="border-[#334155] hover:bg-transparent">
                      <TableHead className="text-[#94A3B8]">代號</TableHead>
                      <TableHead className="text-[#94A3B8]">名稱</TableHead>
                      <TableHead className="text-right text-[#94A3B8]">收盤價</TableHead>
                      <TableHead className="text-right text-[#94A3B8]">漲跌%</TableHead>
                      <TableHead className="text-right text-[#94A3B8]">成交量(張)</TableHead>
                      <TableHead className="text-right text-[#94A3B8]">法人買賣超</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {summaryData.map((stock) => (
                      <TableRow
                        key={stock.stock_id}
                        className="cursor-pointer border-[#334155] transition-colors hover:bg-[#334155]/50"
                        onClick={() => window.open(`/stock/${stock.stock_id}`, '_blank')}
                      >
                        <TableCell className="font-mono text-[#F8FAFC]">
                          {stock.stock_id}
                        </TableCell>
                        <TableCell className="text-[#F8FAFC]">
                          {stock.stock_name ?? '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          {stock.close !== null ? (
                            <span
                              className={
                                (stock.spread ?? 0) > 0
                                  ? 'font-medium tabular-nums text-[#EF4444]'
                                  : (stock.spread ?? 0) < 0
                                    ? 'font-medium tabular-nums text-[#22C55E]'
                                    : 'font-medium tabular-nums text-[#9CA3AF]'
                              }
                            >
                              {stock.close.toLocaleString('zh-TW', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </span>
                          ) : (
                            <span className="text-[#94A3B8]">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {stock.change_percent !== null ? (
                            <NumberDisplay
                              value={stock.change_percent}
                              suffix="%"
                              className="text-sm"
                            />
                          ) : (
                            <span className="text-[#94A3B8]">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-[#F8FAFC]">
                          {stock.volume !== null
                            ? stock.volume.toLocaleString('zh-TW')
                            : '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          {stock.institutional_net !== null ? (
                            <NumberDisplay
                              value={stock.institutional_net}
                              className="text-sm"
                            />
                          ) : (
                            <span className="text-[#94A3B8]">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {sheetContent}
    </div>
  );
}
