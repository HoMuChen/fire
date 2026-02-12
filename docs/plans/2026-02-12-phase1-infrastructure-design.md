# Phase 1: Infrastructure Design

## Overview

Foundation layer for the TW Stock Assistant platform. Sets up the project, database, authentication, FinMind API client, seed script, and data sync pipeline.

## 1. Project Setup

- Next.js 14+ with App Router, TypeScript, Tailwind CSS
- shadcn/ui with slate theme, dark mode default
- Project lives at repo root (not a subdirectory)
- Package name: `tw-stock-assistant`
- Directory structure follows PRD Section 7: `src/app/`, `src/components/`, `src/lib/`, `src/types/`

## 2. Authentication

- Supabase Auth with email/password
- `@supabase/auth-helpers-nextjs` for session management
- `/login` page with sign-up and sign-in forms (shadcn/ui components)
- Next.js middleware redirects unauthenticated users to `/login`
- Exceptions: `/login`, `/api/sync/*` (protected by CRON_SECRET)

## 3. Database Schema

13 tables from PRD Section 3.1 with these modifications:

- `stocks` table: add `sync_status VARCHAR(20) DEFAULT 'pending'` column (values: pending, syncing, synced, failed)
- `watchlists` table: add `user_id UUID NOT NULL REFERENCES auth.users(id)`
- `alerts` table: add `user_id UUID NOT NULL REFERENCES auth.users(id)`

RLS enabled on user-owned tables:
- `watchlists`: SELECT/INSERT/UPDATE/DELETE WHERE user_id = auth.uid()
- `watchlist_items`: access through watchlist_id join to verify ownership
- `alerts`: SELECT/INSERT/UPDATE/DELETE WHERE user_id = auth.uid()
- `alert_history`: access through alert_id join to verify ownership

Market data tables (stocks, stock_prices, etc.): no RLS, readable by all. Writes use service role key.

Migration file: `supabase/migrations/001_init.sql`
Setup script: `scripts/setup-db.ts` executes SQL against Supabase.

## 4. FinMind API Client

`src/lib/finmind.ts`

- Core function: `fetchFinMind(dataset, params)` → typed response
- Rate limiting: 8 req/min (safe within 600 req/hr), 8-second delay between requests
- Token from `FINMIND_API_TOKEN` env var
- Error handling: checks `msg`/`status` in response, throws typed errors

Dataset-specific helpers:
- `fetchStockList()` → TaiwanStockInfo
- `fetchStockPrices(stockId, startDate, endDate)` → TaiwanStockPrice
- `fetchStockPER(stockId, startDate)` → TaiwanStockPER
- `fetchInstitutional(stockId, startDate)` → TaiwanStockInstitutionalInvestorsBuySell
- `fetchMarginTrading(stockId, startDate)` → TaiwanStockMarginPurchaseShortSale
- `fetchShareholding(stockId, startDate)` → TaiwanStockShareholding
- `fetchMonthRevenue(stockId, startDate)` → TaiwanStockMonthRevenue
- `fetchFinancialStatements(stockId, startDate)` → TaiwanStockFinancialStatements
- `fetchBalanceSheet(stockId, startDate)` → TaiwanStockBalanceSheet
- `fetchCashFlow(stockId, startDate)` → TaiwanStockCashFlowsStatement
- `fetchDividends(stockId, startDate)` → TaiwanStockDividend
- `fetchNews(stockId, startDate)` → TaiwanStockNews

## 5. Seed Script

`scripts/seed.ts` — run once on first deployment.

- Fetches `TaiwanStockInfo` only (1 API call)
- Upserts ~2000 stocks into `stocks` table with `sync_status = 'pending'`
- Execution: `npx tsx scripts/seed.ts`

Detailed stock data (prices, PER, etc.) is fetched on demand when stocks are added to watchlists.

## 6. Sync API Routes

All protected by `CRON_SECRET` header check.

### Initial stock sync (`POST /api/sync/stock-init`)
- Cron: every 15 minutes
- Picks one stock with `sync_status = 'pending'`, sets to `'syncing'`
- Fetches all datasets for 2-year history (~12 API calls, 8s delays, ~100s total)
- On success: `sync_status = 'synced'`. On failure: `sync_status = 'failed'`
- One stock per invocation (serverless timeout safe)

### Daily incremental sync (`POST /api/sync/daily`)
- Cron: 02:00 daily
- Fetches today's data only for all stocks where `sync_status = 'synced'`
- Processes one stock at a time, 8-second delays
- Calls sub-routes sequentially: stock-prices, institutional, margin, per, news, etc.
- Runs alert check after completion

### Alert check (`POST /api/sync/check-alerts`)
- Runs after daily sync
- Evaluates all active alerts against latest data
- Writes to `alert_history`, updates `alerts.is_triggered`

## 7. Types & Utilities

### `src/types/index.ts`
- FinMind API response types
- Database row types (with user_id, sync_status)
- API response types for frontend

### `src/lib/supabase.ts`
- `supabaseClient` — browser client (anon key, for auth + client queries)
- `supabaseAdmin` — server client (service role key, for sync jobs, bypasses RLS)

### `src/lib/utils.ts`
- `formatVolume(shares)` — shares to 張 (÷1000)
- `formatCurrency(value)` — number formatting with commas
- `calcChangePercent(spread, close)` — 漲跌%
- `cn()` — shadcn/ui class merge

### `src/middleware.ts`
- Auth session check on every request
- Redirect to `/login` if unauthenticated
- Exceptions: `/login`, `/api/sync/*`

## 8. Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
FINMIND_API_TOKEN=
CRON_SECRET=
```

## 9. Implementation Order

1. Create Next.js project + Tailwind + shadcn/ui
2. Set up Supabase clients (`src/lib/supabase.ts`)
3. Create database migration + setup script
4. Implement auth (middleware, `/login` page)
5. Implement types (`src/types/index.ts`)
6. Implement utilities (`src/lib/utils.ts`)
7. Implement FinMind client (`src/lib/finmind.ts`)
8. Implement seed script (`scripts/seed.ts`)
9. Implement sync API routes (`/api/sync/*`)
