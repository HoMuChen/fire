'use client';

import { useEffect, useState, useCallback } from 'react';
import { Settings, Plus, Trash2, X } from 'lucide-react';
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { NumberDisplay } from '@/components/shared/NumberDisplay';
import { StockSearch } from '@/components/shared/StockSearch';

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
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newWatchlistName, setNewWatchlistName] = useState('');
  const [creatingWatchlist, setCreatingWatchlist] = useState(false);
  const [watchlistItems, setWatchlistItems] = useState<WatchlistItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [deletingWatchlist, setDeletingWatchlist] = useState(false);

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
    const confirmed = window.confirm('確定要刪除此自選清單嗎？此操作無法復原。');
    if (!confirmed) return;

    setDeletingWatchlist(true);
    try {
      const res = await fetch(`/api/watchlists/${activeTab}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        onWatchlistsChange?.();
        setDialogOpen(false);
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

  // Open management dialog
  function openManageDialog() {
    setDialogOpen(true);
    if (activeTab) {
      fetchItems(activeTab);
    }
  }

  if (watchlists.length === 0) {
    return (
      <div className="rounded-lg border border-[#1E293B] bg-[#1E293B] p-6 text-center">
        <p className="text-sm text-[#94A3B8]">尚無自選清單</p>
        <Button
          variant="outline"
          size="sm"
          className="mt-3"
          onClick={openManageDialog}
        >
          <Plus className="size-4" />
          建立自選清單
        </Button>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="border-[#1E293B] bg-[#0F172A] sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-[#F8FAFC]">管理清單</DialogTitle>
              <DialogDescription className="text-[#94A3B8]">
                建立新的自選清單
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="輸入清單名稱..."
                  value={newWatchlistName}
                  onChange={(e) => setNewWatchlistName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateWatchlist();
                  }}
                />
                <Button
                  onClick={handleCreateWatchlist}
                  disabled={creatingWatchlist || !newWatchlistName.trim()}
                  size="sm"
                >
                  <Plus className="size-4" />
                  建立
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
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
          <Button variant="ghost" size="sm" onClick={openManageDialog}>
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

      {/* Management Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[80vh] overflow-y-auto border-[#1E293B] bg-[#0F172A] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-[#F8FAFC]">管理清單</DialogTitle>
            <DialogDescription className="text-[#94A3B8]">
              建立、刪除自選清單，或新增移除股票
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Create new watchlist */}
            <div>
              <h4 className="mb-2 text-sm font-medium text-[#F8FAFC]">
                建立新清單
              </h4>
              <div className="flex gap-2">
                <Input
                  placeholder="輸入清單名稱..."
                  value={newWatchlistName}
                  onChange={(e) => setNewWatchlistName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateWatchlist();
                  }}
                />
                <Button
                  onClick={handleCreateWatchlist}
                  disabled={creatingWatchlist || !newWatchlistName.trim()}
                  size="sm"
                >
                  <Plus className="size-4" />
                  建立
                </Button>
              </div>
            </div>

            {/* Delete current watchlist */}
            {activeTab && (
              <div>
                <h4 className="mb-2 text-sm font-medium text-[#F8FAFC]">
                  刪除目前清單
                </h4>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDeleteWatchlist}
                  disabled={deletingWatchlist}
                >
                  <Trash2 className="size-4" />
                  刪除「{watchlists.find((w) => w.id === activeTab)?.name}」
                </Button>
              </div>
            )}

            {/* Add stock */}
            {activeTab && (
              <div>
                <h4 className="mb-2 text-sm font-medium text-[#F8FAFC]">
                  新增股票
                </h4>
                <StockSearch onSelect={handleAddStock} />
              </div>
            )}

            {/* Current stocks list */}
            {activeTab && (
              <div>
                <h4 className="mb-2 text-sm font-medium text-[#F8FAFC]">
                  目前持有股票
                </h4>
                {loadingItems ? (
                  <div className="text-sm text-[#94A3B8]">載入中...</div>
                ) : watchlistItems.length === 0 ? (
                  <div className="text-sm text-[#94A3B8]">清單中尚無股票</div>
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
                          className="flex items-center justify-between rounded-md border border-[#1E293B] bg-[#1E293B] px-3 py-2"
                        >
                          <div className="text-sm text-[#F8FAFC]">
                            <span className="font-mono">{item.stock_id}</span>{' '}
                            {stock?.stock_name ?? ''}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => handleRemoveStock(item.stock_id)}
                            aria-label={`移除 ${item.stock_id}`}
                          >
                            <X className="size-3 text-[#94A3B8] hover:text-[#EF4444]" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
