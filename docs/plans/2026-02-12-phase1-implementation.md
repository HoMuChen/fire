# Phase 1: Infrastructure Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Set up the full infrastructure layer for the TW Stock Assistant: project scaffolding, database, auth, FinMind client, seed script, and sync API routes.

**Architecture:** Next.js 14+ App Router with Supabase for auth and database. FinMind API as external data source, accessed only through server-side API routes. Data synced via cron-triggered endpoints.

**Tech Stack:** Next.js 14+, TypeScript, Tailwind CSS, shadcn/ui, @supabase/ssr, @supabase/supabase-js, lightweight-charts (installed now, used in Phase 2)

---

### Task 1: Scaffold Next.js Project

**Files:**
- Create: entire project scaffold at `/Users/largitdata/project/fire/`

**Step 1: Create Next.js app**

```bash
cd /Users/largitdata/project/fire
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --turbopack --yes
```

Note: Using `.` to scaffold in current directory. The `--yes` flag accepts all defaults.

**Step 2: Install dependencies**

```bash
npm install @supabase/ssr @supabase/supabase-js lightweight-charts
npm install -D tsx
```

**Step 3: Initialize shadcn/ui**

```bash
npx shadcn@latest init -d
```

The `-d` flag uses defaults (New York style, Slate base color, CSS variables). Then configure for dark mode.

**Step 4: Add shadcn/ui components needed for Phase 1**

```bash
npx shadcn@latest add button card input label tabs table alert badge dialog command select checkbox toast
```

**Step 5: Configure dark mode**

Edit `src/app/layout.tsx` — add `dark` class to `<html>` tag and set `suppressHydrationWarning`:

```tsx
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-TW" className="dark" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
```

**Step 6: Create `.env.local`**

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# FinMind
FINMIND_API_TOKEN=

# Cron Secret
CRON_SECRET=
```

**Step 7: Add `.env.local` to `.gitignore`**

Verify `.env.local` is already in `.gitignore` (create-next-app should handle this). If not, add it.

**Step 8: Create `.env.example`**

Create `.env.example` with the same keys but empty values (for documentation).

**Step 9: Commit**

```bash
git add -A
git commit -m "feat: scaffold Next.js project with Tailwind, shadcn/ui, and Supabase deps"
```

---

### Task 2: TypeScript Types

**Files:**
- Create: `src/types/index.ts`

**Step 1: Create type definitions**

```typescript
// ===== FinMind API Response Types =====

export interface FinMindResponse<T> {
  msg: string;
  status: number;
  data: T[];
}

export interface FinMindStockPrice {
  date: string;
  stock_id: string;
  Trading_Volume: number;
  Trading_money: number;
  open: number;
  max: number;
  min: number;
  close: number;
  spread: number;
  Trading_turnover: number;
}

export interface FinMindStockPER {
  date: string;
  stock_id: string;
  dividend_yield: number;
  PER: number;
  PBR: number;
}

export interface FinMindStockInfo {
  industry_category: string;
  stock_id: string;
  stock_name: string;
  type: string;
  date: string;
}

export interface FinMindInstitutionalInvestors {
  date: string;
  stock_id: string;
  name: string;
  buy: number;
  sell: number;
}

export interface FinMindMarginData {
  date: string;
  stock_id: string;
  MarginPurchaseBuy: number;
  MarginPurchaseSell: number;
  MarginPurchaseCashRepayment: number;
  MarginPurchaseYesterdayBalance: number;
  MarginPurchaseTodayBalance: number;
  ShortSaleBuy: number;
  ShortSaleSell: number;
  ShortSaleCashRepayment: number;
  ShortSaleYesterdayBalance: number;
  ShortSaleTodayBalance: number;
}

export interface FinMindShareholding {
  date: string;
  stock_id: string;
  ForeignInvestmentSharesHolding: number;
  ForeignInvestmentRemainingShares: number;
  ForeignInvestmentShareholdingRatio: number;
}

export interface FinMindMonthRevenue {
  date: string;
  stock_id: string;
  country: string;
  revenue: number;
  revenue_month: number;
  revenue_year: number;
}

export interface FinMindFinancialStatement {
  date: string;
  stock_id: string;
  type: string;
  value: number;
  origin_name: string;
}

export interface FinMindDividend {
  date: string;
  stock_id: string;
  StockEarningsDistribution: number;
  StockStatutorySurplus: number;
  StockExDividendTradingDate: string;
  TotalEmployeeStockDividend: number;
  TotalEmployeeStockDividendAmount: number;
  RatioOfEmployeeStockDividendOfTotal: number;
  RatioOfEmployeeStockDividend: number;
  CashEarningsDistribution: number;
  CashStatutorySurplus: number;
  CashExDividendTradingDate: string;
  CashDividendPaymentDate: string;
  TotalEmployeeCashDividend: number;
  TotalNumberOfCashCapitalIncrease: number;
  CashIncreaseSubscriptionRate: number;
  CashIncreaseSubscriptionpable: number;
}

export interface FinMindStockNews {
  date: string;
  stock_id: string;
  description: string;
  link: string;
  source: string;
  title: string;
}

// ===== Database Row Types =====

export type SyncStatus = 'pending' | 'syncing' | 'synced' | 'failed';

export interface DBStock {
  stock_id: string;
  stock_name: string;
  industry_category: string | null;
  type: string;
  sync_status: SyncStatus;
  updated_at: string;
}

export interface DBStockPrice {
  id: number;
  stock_id: string;
  date: string;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
  volume: number | null;
  trading_money: number | null;
  trading_turnover: number | null;
  spread: number | null;
}

export interface DBStockPER {
  id: number;
  stock_id: string;
  date: string;
  per: number | null;
  pbr: number | null;
  dividend_yield: number | null;
}

export interface DBInstitutionalInvestor {
  id: number;
  stock_id: string;
  date: string;
  investor_name: string;
  buy: number | null;
  sell: number | null;
}

export interface DBMarginTrading {
  id: number;
  stock_id: string;
  date: string;
  margin_purchase_buy: number | null;
  margin_purchase_sell: number | null;
  margin_purchase_cash_repayment: number | null;
  margin_purchase_yesterday_balance: number | null;
  margin_purchase_today_balance: number | null;
  short_sale_buy: number | null;
  short_sale_sell: number | null;
  short_sale_cash_repayment: number | null;
  short_sale_yesterday_balance: number | null;
  short_sale_today_balance: number | null;
}

export interface DBForeignShareholding {
  id: number;
  stock_id: string;
  date: string;
  foreign_holding_shares: number | null;
  foreign_holding_percentage: number | null;
}

export interface DBMonthlyRevenue {
  id: number;
  stock_id: string;
  date: string;
  revenue_year: number;
  revenue_month: number;
  revenue: number | null;
}

export interface DBFinancialStatement {
  id: number;
  stock_id: string;
  date: string;
  statement_type: string;
  item_name: string;
  value: number | null;
}

export interface DBDividend {
  id: number;
  stock_id: string;
  date: string;
  year: number | null;
  cash_dividend: number | null;
  stock_dividend: number | null;
}

export interface DBStockNews {
  id: number;
  stock_id: string;
  date: string;
  title: string;
  description: string | null;
  link: string | null;
  source: string | null;
}

export interface DBWatchlist {
  id: string;
  user_id: string;
  name: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface DBWatchlistItem {
  id: string;
  watchlist_id: string;
  stock_id: string;
  sort_order: number;
  added_at: string;
}

export type AlertType =
  | 'price_above'
  | 'price_below'
  | 'rsi_above'
  | 'rsi_below'
  | 'ma_cross_above'
  | 'ma_cross_below';

export interface DBAlert {
  id: string;
  user_id: string;
  stock_id: string;
  alert_type: AlertType;
  condition_value: number | null;
  condition_params: Record<string, unknown> | null;
  is_active: boolean;
  is_triggered: boolean;
  triggered_at: string | null;
  created_at: string;
}

export interface DBAlertHistory {
  id: string;
  alert_id: string;
  stock_id: string;
  triggered_at: string;
  trigger_price: number | null;
  message: string | null;
}
```

**Step 2: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: add TypeScript type definitions for FinMind API and database"
```

---

### Task 3: Supabase Clients

**Files:**
- Create: `src/lib/supabase/client.ts`
- Create: `src/lib/supabase/server.ts`
- Create: `src/lib/supabase/admin.ts`

**Step 1: Create browser client**

`src/lib/supabase/client.ts`:

```typescript
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

**Step 2: Create server client**

`src/lib/supabase/server.ts`:

```typescript
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing sessions.
          }
        },
      },
    }
  );
}
```

**Step 3: Create admin client (service role, bypasses RLS)**

`src/lib/supabase/admin.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
```

**Step 4: Commit**

```bash
git add src/lib/supabase/
git commit -m "feat: add Supabase client helpers (browser, server, admin)"
```

---

### Task 4: Auth Middleware

**Files:**
- Create: `src/middleware.ts`

**Step 1: Create middleware**

```typescript
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session if expired
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Allow public routes
  const isPublicRoute =
    request.nextUrl.pathname.startsWith('/login') ||
    request.nextUrl.pathname.startsWith('/auth');

  // Allow sync API routes (protected by CRON_SECRET instead)
  const isSyncRoute = request.nextUrl.pathname.startsWith('/api/sync');

  if (!user && !isPublicRoute && !isSyncRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
```

**Step 2: Commit**

```bash
git add src/middleware.ts
git commit -m "feat: add auth middleware with session refresh and route protection"
```

---

### Task 5: Login Page

**Files:**
- Create: `src/app/login/page.tsx`
- Create: `src/app/auth/callback/route.ts`

**Step 1: Create login page**

`src/app/login/page.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        setError('確認信已寄出，請查看您的信箱。');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.push('/');
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '發生錯誤');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900">
      <Card className="w-full max-w-md border-slate-700 bg-slate-800">
        <CardHeader>
          <CardTitle className="text-slate-50">台股交易輔助平台</CardTitle>
          <CardDescription className="text-slate-400">
            {isSignUp ? '建立新帳號' : '登入帳號'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-200">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="border-slate-600 bg-slate-700 text-slate-50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-200">
                密碼
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="border-slate-600 bg-slate-700 text-slate-50"
              />
            </div>
            {error && (
              <p className="text-sm text-red-400">{error}</p>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? '處理中...' : isSignUp ? '註冊' : '登入'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full text-slate-400"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError(null);
              }}
            >
              {isSignUp ? '已有帳號？登入' : '還沒有帳號？註冊'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
```

**Step 2: Create auth callback route**

`src/app/auth/callback/route.ts`:

```typescript
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (code) {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login`);
}
```

**Step 3: Commit**

```bash
git add src/app/login/ src/app/auth/
git commit -m "feat: add login page and auth callback route"
```

---

### Task 6: Utility Functions

**Files:**
- Create: `src/lib/utils.ts` (may already exist from shadcn — extend it)

**Step 1: Add utility functions**

Extend the existing `src/lib/utils.ts` (shadcn creates this with `cn()`):

```typescript
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Convert shares to 張 (1 張 = 1000 股) */
export function formatVolume(shares: number): string {
  const lots = Math.round(shares / 1000);
  return lots.toLocaleString('zh-TW');
}

/** Format currency with commas */
export function formatCurrency(value: number): string {
  return value.toLocaleString('zh-TW', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Calculate change percentage: spread / (close - spread) * 100 */
export function calcChangePercent(spread: number, close: number): number {
  const previousClose = close - spread;
  if (previousClose === 0) return 0;
  return (spread / previousClose) * 100;
}

/** Format date string to YYYY-MM-DD */
export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

/** Get date N years ago from today */
export function getDateYearsAgo(years: number): string {
  const date = new Date();
  date.setFullYear(date.getFullYear() - years);
  return formatDate(date);
}

/** Sleep for ms milliseconds */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
```

**Step 2: Commit**

```bash
git add src/lib/utils.ts
git commit -m "feat: add utility functions for formatting and date helpers"
```

---

### Task 7: Database Migration

**Files:**
- Create: `supabase/migrations/001_init.sql`
- Create: `scripts/setup-db.ts`

**Step 1: Create migration SQL**

`supabase/migrations/001_init.sql`:

```sql
-- ===== Market Data Tables =====

-- 股票基本資料
CREATE TABLE IF NOT EXISTS stocks (
  stock_id VARCHAR(10) PRIMARY KEY,
  stock_name VARCHAR(50) NOT NULL,
  industry_category VARCHAR(50),
  type VARCHAR(10) NOT NULL,
  sync_status VARCHAR(20) DEFAULT 'pending',
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 日K線股價
CREATE TABLE IF NOT EXISTS stock_prices (
  id BIGSERIAL PRIMARY KEY,
  stock_id VARCHAR(10) NOT NULL REFERENCES stocks(stock_id),
  date DATE NOT NULL,
  open DECIMAL(10,2),
  high DECIMAL(10,2),
  low DECIMAL(10,2),
  close DECIMAL(10,2),
  volume BIGINT,
  trading_money BIGINT,
  trading_turnover INT,
  spread DECIMAL(10,2),
  UNIQUE(stock_id, date)
);
CREATE INDEX IF NOT EXISTS idx_stock_prices_lookup ON stock_prices(stock_id, date DESC);

-- PER / PBR / 殖利率
CREATE TABLE IF NOT EXISTS stock_per (
  id BIGSERIAL PRIMARY KEY,
  stock_id VARCHAR(10) NOT NULL REFERENCES stocks(stock_id),
  date DATE NOT NULL,
  per DECIMAL(10,2),
  pbr DECIMAL(10,2),
  dividend_yield DECIMAL(10,2),
  UNIQUE(stock_id, date)
);

-- 三大法人買賣超
CREATE TABLE IF NOT EXISTS institutional_investors (
  id BIGSERIAL PRIMARY KEY,
  stock_id VARCHAR(10) NOT NULL REFERENCES stocks(stock_id),
  date DATE NOT NULL,
  investor_name VARCHAR(50) NOT NULL,
  buy BIGINT,
  sell BIGINT,
  UNIQUE(stock_id, date, investor_name)
);
CREATE INDEX IF NOT EXISTS idx_institutional_lookup ON institutional_investors(stock_id, date DESC);

-- 融資融券
CREATE TABLE IF NOT EXISTS margin_trading (
  id BIGSERIAL PRIMARY KEY,
  stock_id VARCHAR(10) NOT NULL REFERENCES stocks(stock_id),
  date DATE NOT NULL,
  margin_purchase_buy BIGINT,
  margin_purchase_sell BIGINT,
  margin_purchase_cash_repayment BIGINT,
  margin_purchase_yesterday_balance BIGINT,
  margin_purchase_today_balance BIGINT,
  short_sale_buy BIGINT,
  short_sale_sell BIGINT,
  short_sale_cash_repayment BIGINT,
  short_sale_yesterday_balance BIGINT,
  short_sale_today_balance BIGINT,
  UNIQUE(stock_id, date)
);

-- 外資持股
CREATE TABLE IF NOT EXISTS foreign_shareholding (
  id BIGSERIAL PRIMARY KEY,
  stock_id VARCHAR(10) NOT NULL REFERENCES stocks(stock_id),
  date DATE NOT NULL,
  foreign_holding_shares BIGINT,
  foreign_holding_percentage DECIMAL(8,4),
  UNIQUE(stock_id, date)
);

-- 月營收
CREATE TABLE IF NOT EXISTS monthly_revenue (
  id BIGSERIAL PRIMARY KEY,
  stock_id VARCHAR(10) NOT NULL REFERENCES stocks(stock_id),
  date DATE NOT NULL,
  revenue_year INT,
  revenue_month INT,
  revenue BIGINT,
  UNIQUE(stock_id, revenue_year, revenue_month)
);

-- 財務報表
CREATE TABLE IF NOT EXISTS financial_statements (
  id BIGSERIAL PRIMARY KEY,
  stock_id VARCHAR(10) NOT NULL REFERENCES stocks(stock_id),
  date DATE NOT NULL,
  statement_type VARCHAR(20) NOT NULL,
  item_name VARCHAR(100) NOT NULL,
  value DECIMAL(20,2),
  UNIQUE(stock_id, date, statement_type, item_name)
);

-- 股利政策
CREATE TABLE IF NOT EXISTS dividends (
  id BIGSERIAL PRIMARY KEY,
  stock_id VARCHAR(10) NOT NULL REFERENCES stocks(stock_id),
  date DATE NOT NULL,
  year INT,
  cash_dividend DECIMAL(10,4),
  stock_dividend DECIMAL(10,4),
  UNIQUE(stock_id, date)
);

-- 個股新聞
CREATE TABLE IF NOT EXISTS stock_news (
  id BIGSERIAL PRIMARY KEY,
  stock_id VARCHAR(10) NOT NULL REFERENCES stocks(stock_id),
  date TIMESTAMP NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  link TEXT,
  source VARCHAR(50),
  UNIQUE(stock_id, date, title)
);
CREATE INDEX IF NOT EXISTS idx_news_lookup ON stock_news(stock_id, date DESC);

-- ===== User Feature Tables =====

-- 觀察清單
CREATE TABLE IF NOT EXISTS watchlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(50) NOT NULL,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 觀察清單內的個股
CREATE TABLE IF NOT EXISTS watchlist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  watchlist_id UUID NOT NULL REFERENCES watchlists(id) ON DELETE CASCADE,
  stock_id VARCHAR(10) NOT NULL REFERENCES stocks(stock_id),
  sort_order INT DEFAULT 0,
  added_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(watchlist_id, stock_id)
);

-- 警示設定
CREATE TABLE IF NOT EXISTS alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stock_id VARCHAR(10) NOT NULL REFERENCES stocks(stock_id),
  alert_type VARCHAR(20) NOT NULL,
  condition_value DECIMAL(10,2),
  condition_params JSONB,
  is_active BOOLEAN DEFAULT TRUE,
  is_triggered BOOLEAN DEFAULT FALSE,
  triggered_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 警示觸發紀錄
CREATE TABLE IF NOT EXISTS alert_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id UUID NOT NULL REFERENCES alerts(id) ON DELETE CASCADE,
  stock_id VARCHAR(10) NOT NULL,
  triggered_at TIMESTAMP DEFAULT NOW(),
  trigger_price DECIMAL(10,2),
  message TEXT
);

-- ===== Row Level Security =====

ALTER TABLE watchlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_history ENABLE ROW LEVEL SECURITY;

-- Watchlists: users can only access their own
CREATE POLICY "Users can view own watchlists" ON watchlists
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own watchlists" ON watchlists
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own watchlists" ON watchlists
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own watchlists" ON watchlists
  FOR DELETE USING (auth.uid() = user_id);

-- Watchlist items: access through watchlist ownership
CREATE POLICY "Users can view own watchlist items" ON watchlist_items
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM watchlists WHERE watchlists.id = watchlist_items.watchlist_id AND watchlists.user_id = auth.uid())
  );
CREATE POLICY "Users can add to own watchlists" ON watchlist_items
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM watchlists WHERE watchlists.id = watchlist_items.watchlist_id AND watchlists.user_id = auth.uid())
  );
CREATE POLICY "Users can update own watchlist items" ON watchlist_items
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM watchlists WHERE watchlists.id = watchlist_items.watchlist_id AND watchlists.user_id = auth.uid())
  );
CREATE POLICY "Users can remove from own watchlists" ON watchlist_items
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM watchlists WHERE watchlists.id = watchlist_items.watchlist_id AND watchlists.user_id = auth.uid())
  );

-- Alerts: users can only access their own
CREATE POLICY "Users can view own alerts" ON alerts
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own alerts" ON alerts
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own alerts" ON alerts
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own alerts" ON alerts
  FOR DELETE USING (auth.uid() = user_id);

-- Alert history: access through alert ownership
CREATE POLICY "Users can view own alert history" ON alert_history
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM alerts WHERE alerts.id = alert_history.alert_id AND alerts.user_id = auth.uid())
  );
CREATE POLICY "Users can insert alert history" ON alert_history
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM alerts WHERE alerts.id = alert_history.alert_id AND alerts.user_id = auth.uid())
  );
```

**Step 2: Create setup script**

`scripts/setup-db.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

async function setupDatabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    console.error('Make sure .env.local is configured.');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const sqlPath = path.join(__dirname, '..', 'supabase', 'migrations', '001_init.sql');
  const sql = fs.readFileSync(sqlPath, 'utf-8');

  // Split by semicolons and execute each statement
  const statements = sql
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith('--'));

  console.log(`Executing ${statements.length} SQL statements...`);

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    const preview = stmt.substring(0, 60).replace(/\n/g, ' ');
    console.log(`[${i + 1}/${statements.length}] ${preview}...`);

    const { error } = await supabase.rpc('', undefined as never).then(() => ({ error: null })).catch(() => ({ error: null }));

    // Use the Supabase REST API to execute raw SQL via the pg_net extension or use supabase.sql
    // For raw SQL execution, we use the Supabase Management API or run via psql
    // Since supabase-js doesn't support raw SQL directly, we'll use the SQL editor approach
  }

  // Alternative: Execute the entire SQL file as one block via Supabase SQL Editor
  // For programmatic execution, use the Supabase CLI: npx supabase db push
  // Or execute via the Supabase Dashboard SQL Editor

  console.log('');
  console.log('NOTE: supabase-js does not support raw SQL execution directly.');
  console.log('Please run the migration using one of these methods:');
  console.log('');
  console.log('Option 1: Supabase Dashboard');
  console.log('  1. Go to your Supabase project > SQL Editor');
  console.log('  2. Paste the contents of supabase/migrations/001_init.sql');
  console.log('  3. Click "Run"');
  console.log('');
  console.log('Option 2: Supabase CLI');
  console.log('  npx supabase db push');
  console.log('');
}

setupDatabase();
```

**Step 3: Commit**

```bash
git add supabase/ scripts/setup-db.ts
git commit -m "feat: add database migration SQL and setup script"
```

---

### Task 8: FinMind API Client

**Files:**
- Create: `src/lib/finmind.ts`

**Step 1: Create FinMind client**

```typescript
import { sleep } from './utils';
import type {
  FinMindResponse,
  FinMindStockInfo,
  FinMindStockPrice,
  FinMindStockPER,
  FinMindInstitutionalInvestors,
  FinMindMarginData,
  FinMindShareholding,
  FinMindMonthRevenue,
  FinMindFinancialStatement,
  FinMindDividend,
  FinMindStockNews,
} from '@/types';

const FINMIND_BASE_URL = 'https://api.finmindtrade.com/api/v4/data';
const REQUEST_DELAY_MS = 8000; // 8 seconds between requests (~7.5 req/min, safe for 600/hr)

let lastRequestTime = 0;

async function rateLimitWait(): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < REQUEST_DELAY_MS && lastRequestTime > 0) {
    await sleep(REQUEST_DELAY_MS - elapsed);
  }
  lastRequestTime = Date.now();
}

export class FinMindError extends Error {
  constructor(
    message: string,
    public status: number,
    public apiMessage: string
  ) {
    super(message);
    this.name = 'FinMindError';
  }
}

export async function fetchFinMind<T>(
  dataset: string,
  params: {
    data_id?: string;
    start_date?: string;
    end_date?: string;
  } = {}
): Promise<T[]> {
  await rateLimitWait();

  const url = new URL(FINMIND_BASE_URL);
  url.searchParams.set('dataset', dataset);

  if (params.data_id) url.searchParams.set('data_id', params.data_id);
  if (params.start_date) url.searchParams.set('start_date', params.start_date);
  if (params.end_date) url.searchParams.set('end_date', params.end_date);

  const token = process.env.FINMIND_API_TOKEN;
  if (token) url.searchParams.set('token', token);

  const response = await fetch(url.toString());

  if (!response.ok) {
    throw new FinMindError(
      `FinMind API HTTP error: ${response.status}`,
      response.status,
      response.statusText
    );
  }

  const json: FinMindResponse<T> = await response.json();

  if (json.status !== 200 || json.msg !== 'success') {
    throw new FinMindError(
      `FinMind API error: ${json.msg}`,
      json.status,
      json.msg
    );
  }

  return json.data;
}

// ===== Dataset-specific helpers =====

export function fetchStockList() {
  return fetchFinMind<FinMindStockInfo>('TaiwanStockInfo');
}

export function fetchStockPrices(stockId: string, startDate: string, endDate?: string) {
  return fetchFinMind<FinMindStockPrice>('TaiwanStockPrice', {
    data_id: stockId,
    start_date: startDate,
    end_date: endDate,
  });
}

export function fetchStockPER(stockId: string, startDate: string) {
  return fetchFinMind<FinMindStockPER>('TaiwanStockPER', {
    data_id: stockId,
    start_date: startDate,
  });
}

export function fetchInstitutional(stockId: string, startDate: string) {
  return fetchFinMind<FinMindInstitutionalInvestors>(
    'TaiwanStockInstitutionalInvestorsBuySell',
    { data_id: stockId, start_date: startDate }
  );
}

export function fetchMarginTrading(stockId: string, startDate: string) {
  return fetchFinMind<FinMindMarginData>(
    'TaiwanStockMarginPurchaseShortSale',
    { data_id: stockId, start_date: startDate }
  );
}

export function fetchShareholding(stockId: string, startDate: string) {
  return fetchFinMind<FinMindShareholding>('TaiwanStockShareholding', {
    data_id: stockId,
    start_date: startDate,
  });
}

export function fetchMonthRevenue(stockId: string, startDate: string) {
  return fetchFinMind<FinMindMonthRevenue>('TaiwanStockMonthRevenue', {
    data_id: stockId,
    start_date: startDate,
  });
}

export function fetchFinancialStatements(stockId: string, startDate: string) {
  return fetchFinMind<FinMindFinancialStatement>(
    'TaiwanStockFinancialStatements',
    { data_id: stockId, start_date: startDate }
  );
}

export function fetchBalanceSheet(stockId: string, startDate: string) {
  return fetchFinMind<FinMindFinancialStatement>(
    'TaiwanStockBalanceSheet',
    { data_id: stockId, start_date: startDate }
  );
}

export function fetchCashFlow(stockId: string, startDate: string) {
  return fetchFinMind<FinMindFinancialStatement>(
    'TaiwanStockCashFlowsStatement',
    { data_id: stockId, start_date: startDate }
  );
}

export function fetchDividends(stockId: string, startDate: string) {
  return fetchFinMind<FinMindDividend>('TaiwanStockDividend', {
    data_id: stockId,
    start_date: startDate,
  });
}

export function fetchNews(stockId: string, startDate: string) {
  return fetchFinMind<FinMindStockNews>('TaiwanStockNews', {
    data_id: stockId,
    start_date: startDate,
  });
}
```

**Step 2: Commit**

```bash
git add src/lib/finmind.ts
git commit -m "feat: add FinMind API client with rate limiting and typed helpers"
```

---

### Task 9: Seed Script

**Files:**
- Create: `scripts/seed.ts`

**Step 1: Create seed script**

```typescript
import { createClient } from '@supabase/supabase-js';

const FINMIND_BASE_URL = 'https://api.finmindtrade.com/api/v4/data';

interface FinMindStockInfo {
  industry_category: string;
  stock_id: string;
  stock_name: string;
  type: string;
  date: string;
}

async function seed() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const finmindToken = process.env.FINMIND_API_TOKEN;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  console.log('Fetching stock list from FinMind...');

  const url = new URL(FINMIND_BASE_URL);
  url.searchParams.set('dataset', 'TaiwanStockInfo');
  if (finmindToken) url.searchParams.set('token', finmindToken);

  const response = await fetch(url.toString());
  const json = await response.json();

  if (json.status !== 200) {
    console.error('FinMind API error:', json.msg);
    process.exit(1);
  }

  const stocks: FinMindStockInfo[] = json.data;
  console.log(`Fetched ${stocks.length} stocks`);

  // Upsert in batches of 500
  const batchSize = 500;
  for (let i = 0; i < stocks.length; i += batchSize) {
    const batch = stocks.slice(i, i + batchSize).map((s) => ({
      stock_id: s.stock_id,
      stock_name: s.stock_name,
      industry_category: s.industry_category,
      type: s.type,
      sync_status: 'pending',
    }));

    const { error } = await supabase
      .from('stocks')
      .upsert(batch, { onConflict: 'stock_id' });

    if (error) {
      console.error(`Error upserting batch ${i / batchSize + 1}:`, error.message);
    } else {
      console.log(`[${Math.min(i + batchSize, stocks.length)}/${stocks.length}] stocks upserted`);
    }
  }

  console.log('Seed complete!');
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
```

**Step 2: Commit**

```bash
git add scripts/seed.ts
git commit -m "feat: add seed script to populate stock list from FinMind"
```

---

### Task 10: Sync Helper — Cron Auth Guard

**Files:**
- Create: `src/lib/sync-auth.ts`

**Step 1: Create cron auth guard**

```typescript
import { NextRequest, NextResponse } from 'next/server';

export function verifyCronSecret(request: NextRequest): NextResponse | null {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return null; // Auth passed
}
```

**Step 2: Commit**

```bash
git add src/lib/sync-auth.ts
git commit -m "feat: add cron secret auth guard for sync routes"
```

---

### Task 11: Sync Route — Stock Init

**Files:**
- Create: `src/app/api/sync/stock-init/route.ts`

**Step 1: Create stock-init sync route**

This route picks one `pending` stock and fetches all its historical data.

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { verifyCronSecret } from '@/lib/sync-auth';
import {
  fetchStockPrices,
  fetchStockPER,
  fetchInstitutional,
  fetchMarginTrading,
  fetchShareholding,
  fetchMonthRevenue,
  fetchFinancialStatements,
  fetchBalanceSheet,
  fetchCashFlow,
  fetchDividends,
  fetchNews,
} from '@/lib/finmind';
import { getDateYearsAgo, formatDate } from '@/lib/utils';

export const maxDuration = 300; // 5 minutes (Vercel Pro)

export async function POST(request: NextRequest) {
  const authError = verifyCronSecret(request);
  if (authError) return authError;

  const supabase = createAdminClient();
  const startDate = getDateYearsAgo(2);
  const endDate = formatDate(new Date());

  // Pick one pending stock
  const { data: stock, error: pickError } = await supabase
    .from('stocks')
    .select('stock_id, stock_name')
    .eq('sync_status', 'pending')
    .limit(1)
    .single();

  if (pickError || !stock) {
    return NextResponse.json({ message: 'No pending stocks to sync' });
  }

  // Mark as syncing
  await supabase
    .from('stocks')
    .update({ sync_status: 'syncing' })
    .eq('stock_id', stock.stock_id);

  try {
    console.log(`Syncing ${stock.stock_id} ${stock.stock_name}...`);

    // 1. Stock prices
    const prices = await fetchStockPrices(stock.stock_id, startDate, endDate);
    if (prices.length > 0) {
      const rows = prices.map((p) => ({
        stock_id: p.stock_id,
        date: p.date,
        open: p.open,
        high: p.max,
        low: p.min,
        close: p.close,
        volume: p.Trading_Volume,
        trading_money: p.Trading_money,
        trading_turnover: p.Trading_turnover,
        spread: p.spread,
      }));
      await supabase.from('stock_prices').upsert(rows, { onConflict: 'stock_id,date' });
    }

    // 2. PER/PBR
    const perData = await fetchStockPER(stock.stock_id, startDate);
    if (perData.length > 0) {
      const rows = perData.map((p) => ({
        stock_id: p.stock_id,
        date: p.date,
        per: p.PER,
        pbr: p.PBR,
        dividend_yield: p.dividend_yield,
      }));
      await supabase.from('stock_per').upsert(rows, { onConflict: 'stock_id,date' });
    }

    // 3. Institutional investors
    const institutional = await fetchInstitutional(stock.stock_id, startDate);
    if (institutional.length > 0) {
      const rows = institutional.map((i) => ({
        stock_id: i.stock_id,
        date: i.date,
        investor_name: i.name,
        buy: i.buy,
        sell: i.sell,
      }));
      await supabase
        .from('institutional_investors')
        .upsert(rows, { onConflict: 'stock_id,date,investor_name' });
    }

    // 4. Margin trading
    const margin = await fetchMarginTrading(stock.stock_id, startDate);
    if (margin.length > 0) {
      const rows = margin.map((m) => ({
        stock_id: m.stock_id,
        date: m.date,
        margin_purchase_buy: m.MarginPurchaseBuy,
        margin_purchase_sell: m.MarginPurchaseSell,
        margin_purchase_cash_repayment: m.MarginPurchaseCashRepayment,
        margin_purchase_yesterday_balance: m.MarginPurchaseYesterdayBalance,
        margin_purchase_today_balance: m.MarginPurchaseTodayBalance,
        short_sale_buy: m.ShortSaleBuy,
        short_sale_sell: m.ShortSaleSell,
        short_sale_cash_repayment: m.ShortSaleCashRepayment,
        short_sale_yesterday_balance: m.ShortSaleYesterdayBalance,
        short_sale_today_balance: m.ShortSaleTodayBalance,
      }));
      await supabase.from('margin_trading').upsert(rows, { onConflict: 'stock_id,date' });
    }

    // 5. Foreign shareholding
    const shareholding = await fetchShareholding(stock.stock_id, startDate);
    if (shareholding.length > 0) {
      const rows = shareholding.map((s) => ({
        stock_id: s.stock_id,
        date: s.date,
        foreign_holding_shares: s.ForeignInvestmentSharesHolding,
        foreign_holding_percentage: s.ForeignInvestmentShareholdingRatio,
      }));
      await supabase.from('foreign_shareholding').upsert(rows, { onConflict: 'stock_id,date' });
    }

    // 6. Monthly revenue
    const revenue = await fetchMonthRevenue(stock.stock_id, startDate);
    if (revenue.length > 0) {
      const rows = revenue.map((r) => ({
        stock_id: r.stock_id,
        date: r.date,
        revenue_year: r.revenue_year,
        revenue_month: r.revenue_month,
        revenue: r.revenue,
      }));
      await supabase
        .from('monthly_revenue')
        .upsert(rows, { onConflict: 'stock_id,revenue_year,revenue_month' });
    }

    // 7. Financial statements (income)
    const income = await fetchFinancialStatements(stock.stock_id, startDate);
    if (income.length > 0) {
      const rows = income.map((f) => ({
        stock_id: f.stock_id,
        date: f.date,
        statement_type: 'income',
        item_name: f.type,
        value: f.value,
      }));
      await supabase
        .from('financial_statements')
        .upsert(rows, { onConflict: 'stock_id,date,statement_type,item_name' });
    }

    // 8. Balance sheet
    const balance = await fetchBalanceSheet(stock.stock_id, startDate);
    if (balance.length > 0) {
      const rows = balance.map((f) => ({
        stock_id: f.stock_id,
        date: f.date,
        statement_type: 'balance_sheet',
        item_name: f.type,
        value: f.value,
      }));
      await supabase
        .from('financial_statements')
        .upsert(rows, { onConflict: 'stock_id,date,statement_type,item_name' });
    }

    // 9. Cash flow
    const cashflow = await fetchCashFlow(stock.stock_id, startDate);
    if (cashflow.length > 0) {
      const rows = cashflow.map((f) => ({
        stock_id: f.stock_id,
        date: f.date,
        statement_type: 'cash_flow',
        item_name: f.type,
        value: f.value,
      }));
      await supabase
        .from('financial_statements')
        .upsert(rows, { onConflict: 'stock_id,date,statement_type,item_name' });
    }

    // 10. Dividends
    const dividends = await fetchDividends(stock.stock_id, getDateYearsAgo(5));
    if (dividends.length > 0) {
      const rows = dividends.map((d) => ({
        stock_id: d.stock_id,
        date: d.date,
        year: new Date(d.date).getFullYear(),
        cash_dividend: d.CashEarningsDistribution + d.CashStatutorySurplus,
        stock_dividend: d.StockEarningsDistribution + d.StockStatutorySurplus,
      }));
      await supabase.from('dividends').upsert(rows, { onConflict: 'stock_id,date' });
    }

    // 11. News (last 30 days only for init)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const news = await fetchNews(stock.stock_id, formatDate(thirtyDaysAgo));
    if (news.length > 0) {
      const rows = news.map((n) => ({
        stock_id: n.stock_id,
        date: n.date,
        title: n.title,
        description: n.description,
        link: n.link,
        source: n.source,
      }));
      await supabase
        .from('stock_news')
        .upsert(rows, { onConflict: 'stock_id,date,title' });
    }

    // Mark as synced
    await supabase
      .from('stocks')
      .update({ sync_status: 'synced', updated_at: new Date().toISOString() })
      .eq('stock_id', stock.stock_id);

    return NextResponse.json({
      message: `Successfully synced ${stock.stock_id} ${stock.stock_name}`,
    });
  } catch (error) {
    console.error(`Failed to sync ${stock.stock_id}:`, error);

    await supabase
      .from('stocks')
      .update({ sync_status: 'failed' })
      .eq('stock_id', stock.stock_id);

    return NextResponse.json(
      { error: `Failed to sync ${stock.stock_id}`, details: String(error) },
      { status: 500 }
    );
  }
}
```

**Step 2: Commit**

```bash
git add src/app/api/sync/stock-init/
git commit -m "feat: add stock-init sync route for on-demand historical data fetch"
```

---

### Task 12: Sync Route — Daily

**Files:**
- Create: `src/app/api/sync/daily/route.ts`

**Step 1: Create daily sync route**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { verifyCronSecret } from '@/lib/sync-auth';
import {
  fetchStockPrices,
  fetchStockPER,
  fetchInstitutional,
  fetchMarginTrading,
  fetchNews,
} from '@/lib/finmind';
import { formatDate } from '@/lib/utils';

export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const authError = verifyCronSecret(request);
  if (authError) return authError;

  const supabase = createAdminClient();
  const today = formatDate(new Date());

  // Get all synced stocks that are in at least one watchlist
  const { data: watchlistStocks } = await supabase
    .from('watchlist_items')
    .select('stock_id')
    .then(({ data }) => ({
      data: [...new Set(data?.map((item) => item.stock_id) ?? [])],
    }));

  if (!watchlistStocks || watchlistStocks.length === 0) {
    return NextResponse.json({ message: 'No stocks in watchlists to sync' });
  }

  const results: { stock_id: string; status: string }[] = [];

  for (const stockId of watchlistStocks) {
    try {
      // Fetch today's price
      const prices = await fetchStockPrices(stockId, today, today);
      if (prices.length > 0) {
        const rows = prices.map((p) => ({
          stock_id: p.stock_id,
          date: p.date,
          open: p.open,
          high: p.max,
          low: p.min,
          close: p.close,
          volume: p.Trading_Volume,
          trading_money: p.Trading_money,
          trading_turnover: p.Trading_turnover,
          spread: p.spread,
        }));
        await supabase.from('stock_prices').upsert(rows, { onConflict: 'stock_id,date' });
      }

      // Fetch today's PER
      const perData = await fetchStockPER(stockId, today);
      if (perData.length > 0) {
        const rows = perData.map((p) => ({
          stock_id: p.stock_id,
          date: p.date,
          per: p.PER,
          pbr: p.PBR,
          dividend_yield: p.dividend_yield,
        }));
        await supabase.from('stock_per').upsert(rows, { onConflict: 'stock_id,date' });
      }

      // Fetch today's institutional
      const institutional = await fetchInstitutional(stockId, today);
      if (institutional.length > 0) {
        const rows = institutional.map((i) => ({
          stock_id: i.stock_id,
          date: i.date,
          investor_name: i.name,
          buy: i.buy,
          sell: i.sell,
        }));
        await supabase
          .from('institutional_investors')
          .upsert(rows, { onConflict: 'stock_id,date,investor_name' });
      }

      // Fetch today's margin
      const margin = await fetchMarginTrading(stockId, today);
      if (margin.length > 0) {
        const rows = margin.map((m) => ({
          stock_id: m.stock_id,
          date: m.date,
          margin_purchase_buy: m.MarginPurchaseBuy,
          margin_purchase_sell: m.MarginPurchaseSell,
          margin_purchase_cash_repayment: m.MarginPurchaseCashRepayment,
          margin_purchase_yesterday_balance: m.MarginPurchaseYesterdayBalance,
          margin_purchase_today_balance: m.MarginPurchaseTodayBalance,
          short_sale_buy: m.ShortSaleBuy,
          short_sale_sell: m.ShortSaleSell,
          short_sale_cash_repayment: m.ShortSaleCashRepayment,
          short_sale_yesterday_balance: m.ShortSaleYesterdayBalance,
          short_sale_today_balance: m.ShortSaleTodayBalance,
        }));
        await supabase.from('margin_trading').upsert(rows, { onConflict: 'stock_id,date' });
      }

      // Fetch today's news
      const news = await fetchNews(stockId, today);
      if (news.length > 0) {
        const rows = news.map((n) => ({
          stock_id: n.stock_id,
          date: n.date,
          title: n.title,
          description: n.description,
          link: n.link,
          source: n.source,
        }));
        await supabase
          .from('stock_news')
          .upsert(rows, { onConflict: 'stock_id,date,title' });
      }

      results.push({ stock_id: stockId, status: 'ok' });
    } catch (error) {
      console.error(`Daily sync failed for ${stockId}:`, error);
      results.push({ stock_id: stockId, status: 'failed' });
    }
  }

  return NextResponse.json({
    message: `Daily sync complete. ${results.filter((r) => r.status === 'ok').length}/${results.length} succeeded.`,
    results,
  });
}
```

**Step 2: Commit**

```bash
git add src/app/api/sync/daily/
git commit -m "feat: add daily sync route for incremental data updates"
```

---

### Task 13: Sync Route — Check Alerts

**Files:**
- Create: `src/app/api/sync/check-alerts/route.ts`

**Step 1: Create alert check route**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { verifyCronSecret } from '@/lib/sync-auth';

export async function POST(request: NextRequest) {
  const authError = verifyCronSecret(request);
  if (authError) return authError;

  const supabase = createAdminClient();

  // Get all active alerts
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
          // Calculate RSI(14) from recent prices
          const { data: recentPrices } = await supabase
            .from('stock_prices')
            .select('close, date')
            .eq('stock_id', alert.stock_id)
            .order('date', { ascending: false })
            .limit(15);

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
        // Update alert
        await supabase
          .from('alerts')
          .update({
            is_triggered: true,
            triggered_at: new Date().toISOString(),
          })
          .eq('id', alert.id);

        // Write history
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

function calculateRSI(closes: number[], period: number): number {
  if (closes.length < period + 1) return 50;

  let avgGain = 0;
  let avgLoss = 0;

  // Initial average
  for (let i = 1; i <= period; i++) {
    const change = closes[i] - closes[i - 1];
    if (change > 0) avgGain += change;
    else avgLoss += Math.abs(change);
  }

  avgGain /= period;
  avgLoss /= period;

  if (avgLoss === 0) return 100;

  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}
```

**Step 2: Commit**

```bash
git add src/app/api/sync/check-alerts/
git commit -m "feat: add alert check sync route with RSI and MA cross detection"
```

---

### Task 14: Vercel Cron Configuration

**Files:**
- Create: `vercel.json`

**Step 1: Create Vercel cron config**

```json
{
  "crons": [
    {
      "path": "/api/sync/stock-init",
      "schedule": "*/15 * * * *"
    },
    {
      "path": "/api/sync/daily",
      "schedule": "0 18 * * 1-5"
    },
    {
      "path": "/api/sync/check-alerts",
      "schedule": "30 18 * * 1-5"
    }
  ]
}
```

Note: Vercel cron uses UTC. `0 18 * * 1-5` = 02:00 UTC+8 (Taiwan time) on weekdays. `30 18` = 02:30 for alerts.

**Step 2: Commit**

```bash
git add vercel.json
git commit -m "feat: add Vercel cron configuration for sync jobs"
```

---

### Task 15: Placeholder Home Page

**Files:**
- Modify: `src/app/page.tsx`

**Step 1: Replace default page with placeholder**

Replace the contents of `src/app/page.tsx`:

```tsx
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-slate-50">台股交易輔助平台</h1>
        <p className="mt-2 text-slate-400">Dashboard — Phase 2 will build this out</p>
        <p className="mt-1 text-sm text-slate-500">Logged in as {user.email}</p>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: add placeholder dashboard page with auth check"
```

---

### Task 16: Final Verification

**Step 1: Run the dev server**

```bash
cd /Users/largitdata/project/fire
npm run dev
```

Verify:
- The app starts without errors
- Visiting `http://localhost:3000` redirects to `/login`
- The login page renders correctly

**Step 2: Run TypeScript check**

```bash
npx tsc --noEmit
```

Fix any type errors.

**Step 3: Run lint**

```bash
npm run lint
```

Fix any lint errors.

**Step 4: Final commit (if any fixes)**

```bash
git add -A
git commit -m "fix: resolve type and lint errors from Phase 1 setup"
```
