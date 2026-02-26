# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Fire is a Taiwan stock market tracking app with watchlists, technical analysis, fundamental data, and alerts. It targets the TWSE (Taiwan Stock Exchange) market with zh-TW localization.

## Commands

```bash
npm run dev        # Dev server on port 3000
npm run build      # Production build
npm run lint       # ESLint
npm run seed       # Seed database (scripts/seed.ts via tsx)
npm run setup-db   # Display migration SQL
```

No test framework is configured.

## Tech Stack

- **Framework**: Next.js 16 (App Router) with React 19, TypeScript 5
- **Styling**: Tailwind CSS 4 + shadcn/ui (new-york style, RSC enabled)
- **Charts**: TradingView lightweight-charts 5
- **Database**: Supabase (PostgreSQL) with RLS on user tables
- **Auth**: Supabase Auth (email/password)
- **Data Sources**: FinMind API (historical daily data), TWSE API (real-time intraday)

## Architecture

### Path Alias

`@/*` maps to `./src/*`

### Data Flow

1. Server components handle auth and initial data fetching
2. Client components use the `useFetch` custom hook (`/src/hooks/`) for dynamic data
3. API routes (`/src/app/api/`) validate auth via `requireAuth()` and return JSON
4. `ApiError` class in `/src/lib/api.ts` standardizes error responses

### API Routes (`/src/app/api/`)

~20 route handlers organized by domain: `/stocks`, `/watchlists`, `/alerts`, `/market`, `/sync`. Cron-triggered sync routes are protected by `verifyCronSecret()` from `/src/lib/sync-auth.ts`.

### Data Sync (Cron Endpoints)

- `/api/sync/intraday` — TWSE real-time quotes every 5 min during market hours (UTC 1:00–5:55)
- `/api/sync/daily` — Full FinMind market sync after close (weekdays 18:00 UTC)
- `/api/sync/stock-init` — Initialize historical data for pending stocks
- `/api/sync/check-alerts` — Evaluate active alert conditions

Rate limits: FinMind 6s/stock (1s full-market), TWSE 3s/batch of 50.

### External API Clients

- `/src/lib/finmind.ts` — FinMind API wrapper (prices, PER, institutional, margin, revenue, financials, dividends, news)
- `/src/lib/twse.ts` — TWSE real-time quote fetcher

### Technical Indicators (`/src/lib/indicators.ts`)

Pure functions computing SMA, EMA, RSI, MACD, KD, Bollinger Bands as arrays. Used by the K-line chart component.

### Components

- `/src/components/ui/` — shadcn/ui primitives (do not edit manually; use `npx shadcn add`)
- `/src/components/shared/` — App-wide components (Sidebar, StockSearch, NumberDisplay)
- `/src/components/dashboard/` — Dashboard page components
- `/src/components/stock/` — Stock detail page components (K-line chart is ~690 lines using lightweight-charts)

### Database Schema (`/supabase/migrations/001_init.sql`)

Market data tables: `stocks`, `stock_prices`, `stock_per`, `institutional_investors`, `margin_trading`, `foreign_shareholding`, `monthly_revenue`, `financial_statements`, `dividends`, `stock_news`.

User tables (RLS enabled): `watchlists`, `watchlist_items`, `alerts`, `alert_history`.

## Type Conventions

- DB row types prefixed with `DB*` (e.g., `DBStock`, `DBStockPrice`)
- FinMind API response types prefixed with `FinMind*`
- Component-local types in co-located `types.ts` files
- Alert types use discriminated unions

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
FINMIND_API_TOKEN
CRON_SECRET
```
