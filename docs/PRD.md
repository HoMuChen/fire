# PRD: 台股交易輔助平台（TW Stock Assistant）

## 版本：MVP v1.0

## 最後更新：2025-02-12

---

## 1. 產品概述

### 1.1 產品定位

一個個人使用的台股交易輔助網頁平台，核心功能為管理觀察清單、查看技術線圖、追蹤籌碼與基本面資料、閱讀個股新聞、以及設定價格/指標警示。

### 1.2 技術棧

| 層級 | 技術 |
|------|------|
| 前端框架 | Next.js 14+ (App Router) |
| UI 框架 | Tailwind CSS + shadcn/ui |
| 圖表 | lightweight-charts (TradingView 開源版) 或 recharts |
| 資料庫 | Supabase (PostgreSQL) |
| 資料來源 | FinMind API (`https://api.finmindtrade.com/api/v4/data`) |
| 部署 | Vercel |
| 語言 | TypeScript |

### 1.3 MVP 範圍

MVP 聚焦以下功能模組：

1. **Dashboard 首頁** — 大盤概覽 + 警示中心 + 觀察清單總覽
2. **觀察清單管理** — 建立/編輯清單、新增/移除個股
3. **個股詳細頁** — K 線圖 + 技術指標 + 基本面 + 籌碼面 + 新聞
4. **警示系統** — 價格條件 + 指標條件警示（站內通知）

**不在 MVP 範圍**：即時報價（FinMind 即時資料需 Sponsor 方案）、策略回測、社群功能、交易日誌、AI 新聞摘要。

---

## 2. FinMind API 規格

### 2.1 基本呼叫方式

```
GET https://api.finmindtrade.com/api/v4/data
```

通用參數：

| 參數 | 類型 | 說明 |
|------|------|------|
| dataset | string | 資料集名稱（必填） |
| data_id | string | 股票代碼，如 "2330"（可選，不填則取全市場） |
| start_date | string | 起始日期 YYYY-MM-DD（必填） |
| end_date | string | 結束日期 YYYY-MM-DD（可選） |
| token | string | API token（可選，加上可提高限流到 600 req/hr） |

回傳格式：

```json
{
  "msg": "success",
  "status": 200,
  "data": [ ... ]
}
```

### 2.2 MVP 使用的資料集

#### 技術面（股價）

**TaiwanStockPrice** — 日K線（免費）

```
GET /api/v4/data?dataset=TaiwanStockPrice&data_id=2330&start_date=2024-01-01&end_date=2025-02-12
```

回傳欄位：

```typescript
interface StockPrice {
  date: string;          // "2025-02-12"
  stock_id: string;      // "2330"
  Trading_Volume: number; // 成交量（股）
  Trading_money: number;  // 成交金額（元）
  open: number;           // 開盤價
  max: number;            // 最高價
  min: number;            // 最低價
  close: number;          // 收盤價
  spread: number;         // 漲跌價差（今收-昨收）
  Trading_turnover: number; // 成交筆數
}
```

**TaiwanStockPER** — 本益比/股價淨值比/殖利率（免費）

```
GET /api/v4/data?dataset=TaiwanStockPER&data_id=2330&start_date=2025-02-12
```

回傳欄位：

```typescript
interface StockPER {
  date: string;
  stock_id: string;
  dividend_yield: number;  // 殖利率 (%)
  PER: number;             // 本益比
  PBR: number;             // 股價淨值比
}
```

**TaiwanStockInfo** — 股票總覽/清單（免費）

```
GET /api/v4/data?dataset=TaiwanStockInfo
```

回傳欄位：

```typescript
interface StockInfo {
  industry_category: string; // 產業類別，如 "半導體業"
  stock_id: string;          // "2330"
  stock_name: string;        // "台積電"
  type: string;              // "twse"(上市) 或 "tpex"(上櫃)
  date: string;
}
```

**TaiwanVariousIndicators5Seconds** — 加權指數（免費）

```
GET /api/v4/data?dataset=TaiwanVariousIndicators5Seconds&start_date=2025-02-12
```

#### 基本面

**TaiwanStockFinancialStatements** — 綜合損益表（免費）

```
GET /api/v4/data?dataset=TaiwanStockFinancialStatements&data_id=2330&start_date=2024-01-01
```

回傳欄位：

```typescript
interface FinancialStatement {
  date: string;      // 財報日期，如 "2024-03-31"
  stock_id: string;
  type: string;      // 科目名稱，如 "營業收入合計"
  value: number;     // 金額
  origin_name: string;
}
```

**TaiwanStockBalanceSheet** — 資產負債表（免費）

```
GET /api/v4/data?dataset=TaiwanStockBalanceSheet&data_id=2330&start_date=2024-01-01
```

**TaiwanStockCashFlowsStatement** — 現金流量表（免費）

```
GET /api/v4/data?dataset=TaiwanStockCashFlowsStatement&data_id=2330&start_date=2024-01-01
```

**TaiwanStockMonthRevenue** — 月營收（免費）

```
GET /api/v4/data?dataset=TaiwanStockMonthRevenue&data_id=2330&start_date=2024-01-01
```

回傳欄位：

```typescript
interface MonthRevenue {
  date: string;
  stock_id: string;
  country: string;
  revenue: number;          // 當月營收
  revenue_month: number;    // 月份
  revenue_year: number;     // 年份
}
```

**TaiwanStockDividend** — 股利政策（免費）

```
GET /api/v4/data?dataset=TaiwanStockDividend&data_id=2330&start_date=2020-01-01
```

#### 籌碼面

**TaiwanStockInstitutionalInvestorsBuySell** — 三大法人買賣超（免費）

```
GET /api/v4/data?dataset=TaiwanStockInstitutionalInvestorsBuySell&data_id=2330&start_date=2025-01-01
```

回傳欄位：

```typescript
interface InstitutionalInvestors {
  date: string;
  stock_id: string;
  name: string;    // "Foreign_Investor" | "Investment_Trust" | "Dealer_self" | "Dealer_Hedging"
  buy: number;     // 買進股數
  sell: number;    // 賣出股數
}
```

**TaiwanStockMarginPurchaseShortSale** — 融資融券（免費）

```
GET /api/v4/data?dataset=TaiwanStockMarginPurchaseShortSale&data_id=2330&start_date=2025-01-01
```

回傳欄位：

```typescript
interface MarginData {
  date: string;
  stock_id: string;
  MarginPurchaseBuy: number;           // 融資買進
  MarginPurchaseSell: number;          // 融資賣出
  MarginPurchaseCashRepayment: number; // 融資現金償還
  MarginPurchaseYesterdayBalance: number; // 融資前日餘額
  MarginPurchaseTodayBalance: number;    // 融資今日餘額
  ShortSaleBuy: number;               // 融券買進
  ShortSaleSell: number;              // 融券賣出
  ShortSaleCashRepayment: number;     // 融券現券償還
  ShortSaleYesterdayBalance: number;  // 融券前日餘額
  ShortSaleTodayBalance: number;      // 融券今日餘額
}
```

**TaiwanStockShareholding** — 外資持股（免費）

```
GET /api/v4/data?dataset=TaiwanStockShareholding&data_id=2330&start_date=2025-01-01
```

#### 新聞

**TaiwanStockNews** — 個股相關新聞（免費）

```
GET /api/v4/data?dataset=TaiwanStockNews&data_id=2330&start_date=2025-02-01
```

回傳欄位：

```typescript
interface StockNews {
  date: string;
  stock_id: string;
  description: string;  // 新聞內容摘要
  link: string;         // 新聞連結
  source: string;       // 來源
  title: string;        // 標題
}
```

### 2.3 API 限制

- 未註冊：300 req/hr
- 註冊（免費）：600 req/hr
- 資料更新時間：每日凌晨約 01:30

### 2.4 資料抓取策略

**不要讓前端直接呼叫 FinMind API。** 所有資料透過 Next.js API Route 從 Supabase 讀取。

資料同步方式：

| 資料類型 | 同步頻率 | 同步時間 |
|---------|---------|---------|
| 股票清單 (TaiwanStockInfo) | 每週一次 | 週一 02:00 |
| 日K股價 (TaiwanStockPrice) | 每個交易日 | 每日 02:00（等 FinMind 更新後） |
| 三大法人 | 每個交易日 | 每日 02:00 |
| 融資融券 | 每個交易日 | 每日 02:00 |
| 外資持股 | 每個交易日 | 每日 02:00 |
| 新聞 | 每個交易日 | 每日 02:00 |
| PER/PBR | 每個交易日 | 每日 02:00 |
| 月營收 | 每月一次 | 每月 12 日 02:00 |
| 財報 | 每季一次 | 季報公布後手動觸發 |
| 股利政策 | 每季一次 | 同上 |

實作方式：使用 Vercel Cron Jobs 或外部 cron 服務觸發 Next.js API Route，該 Route 呼叫 FinMind API 抓資料後寫入 Supabase。

初始資料載入：首次部署時需要跑一次 seed script，抓取最近 2 年的歷史資料。

---

## 3. 資料庫設計（Supabase / PostgreSQL）

### 3.1 Tables

```sql
-- 股票基本資料
CREATE TABLE stocks (
  stock_id VARCHAR(10) PRIMARY KEY,
  stock_name VARCHAR(50) NOT NULL,
  industry_category VARCHAR(50),
  type VARCHAR(10) NOT NULL, -- 'twse' or 'tpex'
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 日K線股價
CREATE TABLE stock_prices (
  id BIGSERIAL PRIMARY KEY,
  stock_id VARCHAR(10) NOT NULL REFERENCES stocks(stock_id),
  date DATE NOT NULL,
  open DECIMAL(10,2),
  high DECIMAL(10,2),     -- FinMind 欄位名 "max"
  low DECIMAL(10,2),      -- FinMind 欄位名 "min"
  close DECIMAL(10,2),
  volume BIGINT,           -- FinMind: Trading_Volume
  trading_money BIGINT,    -- FinMind: Trading_money
  trading_turnover INT,    -- FinMind: Trading_turnover（成交筆數）
  spread DECIMAL(10,2),    -- 漲跌價差
  UNIQUE(stock_id, date)
);
CREATE INDEX idx_stock_prices_lookup ON stock_prices(stock_id, date DESC);

-- PER / PBR / 殖利率
CREATE TABLE stock_per (
  id BIGSERIAL PRIMARY KEY,
  stock_id VARCHAR(10) NOT NULL REFERENCES stocks(stock_id),
  date DATE NOT NULL,
  per DECIMAL(10,2),
  pbr DECIMAL(10,2),
  dividend_yield DECIMAL(10,2),
  UNIQUE(stock_id, date)
);

-- 三大法人買賣超
CREATE TABLE institutional_investors (
  id BIGSERIAL PRIMARY KEY,
  stock_id VARCHAR(10) NOT NULL REFERENCES stocks(stock_id),
  date DATE NOT NULL,
  investor_name VARCHAR(50) NOT NULL, -- Foreign_Investor, Investment_Trust, Dealer_self, Dealer_Hedging
  buy BIGINT,
  sell BIGINT,
  UNIQUE(stock_id, date, investor_name)
);
CREATE INDEX idx_institutional_lookup ON institutional_investors(stock_id, date DESC);

-- 融資融券
CREATE TABLE margin_trading (
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
CREATE TABLE foreign_shareholding (
  id BIGSERIAL PRIMARY KEY,
  stock_id VARCHAR(10) NOT NULL REFERENCES stocks(stock_id),
  date DATE NOT NULL,
  foreign_holding_shares BIGINT,
  foreign_holding_percentage DECIMAL(8,4),
  UNIQUE(stock_id, date)
);

-- 月營收
CREATE TABLE monthly_revenue (
  id BIGSERIAL PRIMARY KEY,
  stock_id VARCHAR(10) NOT NULL REFERENCES stocks(stock_id),
  date DATE NOT NULL,
  revenue_year INT,
  revenue_month INT,
  revenue BIGINT,
  UNIQUE(stock_id, revenue_year, revenue_month)
);

-- 財務報表（損益表/資產負債表/現金流量表統一存）
CREATE TABLE financial_statements (
  id BIGSERIAL PRIMARY KEY,
  stock_id VARCHAR(10) NOT NULL REFERENCES stocks(stock_id),
  date DATE NOT NULL,          -- 財報期間，如 2024-03-31
  statement_type VARCHAR(20) NOT NULL, -- 'income', 'balance_sheet', 'cash_flow'
  item_name VARCHAR(100) NOT NULL,     -- 科目名稱
  value DECIMAL(20,2),
  UNIQUE(stock_id, date, statement_type, item_name)
);

-- 股利政策
CREATE TABLE dividends (
  id BIGSERIAL PRIMARY KEY,
  stock_id VARCHAR(10) NOT NULL REFERENCES stocks(stock_id),
  date DATE NOT NULL,
  year INT,
  cash_dividend DECIMAL(10,4),    -- 現金股利
  stock_dividend DECIMAL(10,4),   -- 股票股利
  UNIQUE(stock_id, date)
);

-- 個股新聞
CREATE TABLE stock_news (
  id BIGSERIAL PRIMARY KEY,
  stock_id VARCHAR(10) NOT NULL REFERENCES stocks(stock_id),
  date TIMESTAMP NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  link TEXT,
  source VARCHAR(50),
  UNIQUE(stock_id, date, title)
);
CREATE INDEX idx_news_lookup ON stock_news(stock_id, date DESC);

-- ===== 使用者功能 =====

-- 觀察清單
CREATE TABLE watchlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 觀察清單內的個股
CREATE TABLE watchlist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  watchlist_id UUID NOT NULL REFERENCES watchlists(id) ON DELETE CASCADE,
  stock_id VARCHAR(10) NOT NULL REFERENCES stocks(stock_id),
  sort_order INT DEFAULT 0,
  added_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(watchlist_id, stock_id)
);

-- 警示設定
CREATE TABLE alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_id VARCHAR(10) NOT NULL REFERENCES stocks(stock_id),
  alert_type VARCHAR(20) NOT NULL, -- 'price_above', 'price_below', 'rsi_above', 'rsi_below', 'ma_cross_above', 'ma_cross_below'
  condition_value DECIMAL(10,2),   -- 門檻值，如價格 1050 或 RSI 80
  condition_params JSONB,          -- 額外參數，如 {"ma_period": 20}
  is_active BOOLEAN DEFAULT TRUE,
  is_triggered BOOLEAN DEFAULT FALSE,
  triggered_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 警示觸發紀錄
CREATE TABLE alert_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id UUID NOT NULL REFERENCES alerts(id) ON DELETE CASCADE,
  stock_id VARCHAR(10) NOT NULL,
  triggered_at TIMESTAMP DEFAULT NOW(),
  trigger_price DECIMAL(10,2),
  message TEXT
);
```

### 3.2 Supabase Row Level Security

MVP 為個人使用，暫不需要 RLS。如果未來要支援多使用者，在 watchlists、alerts 等表加上 `user_id` 欄位並啟用 RLS。

---

## 4. 頁面與功能規格

### 4.1 頁面結構

```
/                        → Dashboard 首頁
/stock/[stockId]         → 個股詳細頁
/watchlist/[watchlistId] → 觀察清單詳細頁（可選，也可以在 Dashboard 內 tab 切換）
/alerts                  → 警示管理頁
```

### 4.2 Dashboard 首頁 (`/`)

#### 4.2.1 大盤概覽列（頂部橫 bar）

顯示內容：
- 加權指數（數值 + 漲跌 + 漲跌%）
- 成交量（億）
- 漲跌家數（漲 / 跌 / 平）

資料來源：`stock_prices` 表做全市場當日彙總

UI：一排卡片，使用 shadcn Card 元件，漲為紅色、跌為綠色（台股慣例）。

#### 4.2.2 警示中心

顯示今日已觸發的警示列表。

- 每個警示顯示：股票代號 + 名稱、觸發條件描述、當前價格
- 點擊可跳轉到個股詳細頁
- 無警示時顯示「今日無觸發警示」

資料來源：`alert_history` 表，篩選今日

UI：shadcn Alert 元件或自訂卡片列表，用黃色/橘色邊框標示。

#### 4.2.3 觀察清單區塊

- 頂部有 Tab 切換不同觀察清單
- 表格列出清單內每檔股票：

| 欄位 | 來源 |
|------|------|
| 代號 | stocks.stock_id |
| 名稱 | stocks.stock_name |
| 收盤價 | stock_prices.close（最新一日） |
| 漲跌% | 用 spread / (close - spread) 計算 |
| 成交量（張） | stock_prices.volume / 1000 |
| 法人買賣 | institutional_investors 今日彙總（外資+投信+自營） |
| 訊號 | 後端計算，如「▲突破MA20」「⚠RSI>80」 |

- 點擊任一列跳轉到 `/stock/[stockId]`
- 右上角有「管理清單」按鈕（新增/刪除清單、新增/移除個股）

UI：shadcn Table + Tabs 元件。

#### 4.2.4 迷你 K 線圖

- 在觀察清單下方或右側
- 顯示目前 hover/選中的股票最近 60 個交易日的日 K 線
- 疊加 MA5 + MA20 均線
- 下方顯示成交量柱狀圖

資料來源：`stock_prices` 最近 60 筆

UI：使用 lightweight-charts 或 recharts 繪製。

#### 4.2.5 新聞 Feed

- 顯示觀察清單內所有股票的最新新聞，按時間倒序
- 每則新聞顯示：時間、股票代號、標題
- 點擊可展開摘要或開啟外部連結
- 最多顯示 20 則

資料來源：`stock_news` 表

UI：shadcn Card 列表，可滾動。

### 4.3 個股詳細頁 (`/stock/[stockId]`)

此頁面為平台核心，分為以下區塊：

#### 4.3.1 頂部資訊列

- 股票代號 + 名稱 + 產業類別
- 最新收盤價 + 漲跌 + 漲跌%
- PER / PBR / 殖利率
- 「加入觀察清單」按鈕 + 「設定警示」按鈕

#### 4.3.2 K 線圖（主要區塊，佔頁面上半部）

功能：
- 預設顯示日 K 線（最近 6 個月）
- 可切換時間範圍：1 個月 / 3 個月 / 6 個月 / 1 年 / 2 年 / 全部
- K 線圖支援：蠟燭圖（紅漲綠跌，台股慣例）
- 下方附帶成交量柱狀圖
- 支援十字游標（crosshair）顯示 OHLCV 數值
- 可縮放、拖拉

技術指標疊加（MVP 先做以下幾種）：
- **MA（移動平均線）**：可選 5 / 10 / 20 / 60 / 120 / 240 日，預設顯示 MA5 + MA20 + MA60
- **RSI**：預設 14 日，顯示在副圖
- **MACD**：顯示在副圖（DIF、MACD、柱狀圖）
- **KD（隨機指標）**：顯示在副圖
- **布林通道（Bollinger Bands）**：疊加在主圖

指標切換方式：用 checkbox 或 toggle 讓使用者開關各指標。

技術指標計算：全部在後端（Next.js API Route）計算，前端只負責渲染。

```typescript
// 指標計算公式參考

// MA (Simple Moving Average)
// MA(n) = 最近 n 日 close 的平均值

// RSI (Relative Strength Index)
// RSI(n) = 100 - (100 / (1 + RS))
// RS = n 日平均漲幅 / n 日平均跌幅

// MACD
// DIF = EMA(12) - EMA(26)
// MACD Signal = EMA(9) of DIF
// Histogram = DIF - Signal

// KD (Stochastic Oscillator)
// RSV = (今日收盤 - 最近 n 日最低) / (最近 n 日最高 - 最近 n 日最低) × 100
// K = 2/3 × 昨日K + 1/3 × RSV
// D = 2/3 × 昨日D + 1/3 × K

// Bollinger Bands
// 中軌 = MA(20)
// 上軌 = MA(20) + 2 × 標準差(20)
// 下軌 = MA(20) - 2 × 標準差(20)
```

資料來源：`stock_prices` 表

UI：推薦使用 [lightweight-charts](https://github.com/nicehash/lightweight-charts)，它是 TradingView 開源的圖表庫，天然支援 K 線和技術指標渲染，體積小且性能好。

#### 4.3.3 基本面 Tab

分頁顯示：

**月營收**
- 表格：最近 12 個月的月營收
- 顯示欄位：月份、營收（億）、月增率(%)、年增率(%)
- 附帶一個柱狀圖顯示營收趨勢
- 月增率和年增率需在後端計算

**財務報表**
- 損益表關鍵指標：營業收入、營業毛利、營業利益、稅後淨利、EPS
- 資產負債表關鍵指標：總資產、總負債、股東權益、流動比率
- 現金流量表關鍵指標：營業活動現金流、投資活動現金流、融資活動現金流
- 最近 8 季並排比較
- 用 shadcn Table 呈現

**股利政策**
- 歷年現金股利、股票股利、合計
- 殖利率（以當時股價計算）
- 用表格 + 柱狀圖呈現

資料來源：`monthly_revenue`、`financial_statements`、`dividends` 表

#### 4.3.4 籌碼面 Tab

**三大法人**
- 表格：最近 20 個交易日的三大法人買賣超
- 欄位：日期、外資買賣超、投信買賣超、自營商買賣超、合計
- 附帶柱狀圖（正值為買超紅色、負值為賣超綠色）
- 累計區間買賣超

**融資融券**
- 表格：最近 20 個交易日
- 欄位：日期、融資餘額（張）、融資增減、融券餘額（張）、融券增減、券資比
- 附帶折線圖顯示融資/融券餘額趨勢

資料來源：`institutional_investors`、`margin_trading` 表

#### 4.3.5 新聞 Tab

- 時間倒序列出個股相關新聞
- 每則：日期時間、標題、來源、摘要
- 點擊可開啟外部連結（新分頁）
- 最近 30 天的新聞

資料來源：`stock_news` 表

### 4.4 警示管理頁 (`/alerts`)

#### 4.4.1 新增警示

表單欄位：
- 股票代號（搜尋 + 下拉選擇）
- 警示類型（select）：
  - `price_above` — 股價突破（高於指定價格）
  - `price_below` — 股價跌破（低於指定價格）
  - `rsi_above` — RSI 超買（高於指定值，預設 80）
  - `rsi_below` — RSI 超賣（低於指定值，預設 20）
  - `ma_cross_above` — 股價突破 MA（指定天數）
  - `ma_cross_below` — 股價跌破 MA（指定天數）
- 條件值（number input）
- 額外參數（如 MA 天數，預設 20）

#### 4.4.2 警示列表

- 表格顯示所有已設定的警示
- 欄位：股票、類型、條件、狀態（啟用/已觸發/停用）、建立時間
- 可切換啟用/停用
- 可刪除

#### 4.4.3 警示歷史

- 顯示過去所有觸發紀錄
- 欄位：觸發時間、股票、條件、觸發時價格

#### 4.4.4 警示引擎

警示檢查在每日資料同步後執行（cron job 的一部分）：

```
每日 02:30 執行（在資料同步完成後）：
1. 從 alerts 表取出所有 is_active = true 的警示
2. 對每個警示，取該股票最新一日的資料
3. 根據 alert_type 計算是否觸發：
   - price_above: latest close > condition_value
   - price_below: latest close < condition_value
   - rsi_above: 計算 RSI(14) > condition_value
   - rsi_below: 計算 RSI(14) < condition_value
   - ma_cross_above: 今日 close > MA(n) 且 昨日 close <= MA(n)
   - ma_cross_below: 今日 close < MA(n) 且 昨日 close >= MA(n)
4. 觸發的警示：
   - 寫入 alert_history
   - 更新 alerts.is_triggered = true, triggered_at = now()
```

---

## 5. API Routes 設計

### 5.1 資料同步 API（Cron 觸發）

```
POST /api/sync/stock-prices     → 同步當日全市場股價
POST /api/sync/institutional    → 同步三大法人
POST /api/sync/margin           → 同步融資融券
POST /api/sync/news             → 同步新聞
POST /api/sync/per              → 同步 PER/PBR
POST /api/sync/revenue          → 同步月營收
POST /api/sync/financial        → 同步財報
POST /api/sync/dividends        → 同步股利
POST /api/sync/check-alerts     → 檢查並觸發警示
POST /api/seed                  → 初始化歷史資料（首次部署用）
```

### 5.2 前端讀取 API

```
GET /api/stocks/search?q=台積     → 搜尋股票（用於新增到觀察清單）
GET /api/stocks/[stockId]          → 個股基本資料 + 最新報價 + PER

GET /api/stocks/[stockId]/prices?range=6m           → K 線資料（含技術指標）
GET /api/stocks/[stockId]/indicators?type=rsi,macd   → 技術指標數值
GET /api/stocks/[stockId]/institutional?days=20       → 三大法人
GET /api/stocks/[stockId]/margin?days=20              → 融資融券
GET /api/stocks/[stockId]/revenue                     → 月營收
GET /api/stocks/[stockId]/financial                   → 財報
GET /api/stocks/[stockId]/dividends                   → 股利
GET /api/stocks/[stockId]/news?days=30                → 新聞

GET /api/market/overview          → 大盤概覽（加權指數、漲跌家數、成交量）

GET /api/watchlists               → 所有觀察清單
POST /api/watchlists              → 新增觀察清單
PUT /api/watchlists/[id]          → 更新觀察清單名稱/排序
DELETE /api/watchlists/[id]       → 刪除觀察清單
POST /api/watchlists/[id]/items   → 新增個股到清單
DELETE /api/watchlists/[id]/items/[stockId] → 從清單移除個股
GET /api/watchlists/[id]/summary  → 清單內所有股票的最新報價摘要

GET /api/alerts                   → 所有警示
POST /api/alerts                  → 新增警示
PUT /api/alerts/[id]              → 更新警示（啟用/停用）
DELETE /api/alerts/[id]           → 刪除警示
GET /api/alerts/history           → 警示觸發紀錄
GET /api/alerts/triggered-today   → 今日觸發的警示
```

---

## 6. UI/UX 設計指南

### 6.1 色彩規範

| 用途 | 顏色 | 說明 |
|------|------|------|
| 漲（正） | `#EF4444` (red-500) | 台股慣例：紅漲 |
| 跌（負） | `#22C55E` (green-500) | 台股慣例：綠跌 |
| 平盤 | `#9CA3AF` (gray-400) | |
| 主背景 | `#0F172A` (slate-900) | 深色主題（看盤軟體慣例） |
| 卡片背景 | `#1E293B` (slate-800) | |
| 文字主色 | `#F8FAFC` (slate-50) | |
| 文字次色 | `#94A3B8` (slate-400) | |
| 強調色 | `#3B82F6` (blue-500) | 按鈕、連結 |
| 警示色 | `#F59E0B` (amber-500) | Alert |

### 6.2 深色主題

整個平台預設使用深色主題（dark mode），因為看盤軟體的使用者長時間盯盤，深色較不傷眼。shadcn/ui 支援 dark mode，在 `tailwind.config` 中設定 `darkMode: 'class'`，並在 `<html>` 上加 `dark` class。

### 6.3 響應式

- Desktop first（主要使用場景為桌機看盤）
- Tablet 支援（iPad 橫向）
- Mobile 可用但非重點（觀察清單和警示可在手機上查看）

### 6.4 元件使用

優先使用 shadcn/ui 現成元件：
- Table, Tabs, Card, Button, Input, Select, Dialog, Alert, Badge, Tooltip, Sheet（mobile sidebar）, Command（搜尋 combobox）

---

## 7. 專案結構

```
tw-stock-assistant/
├── src/
│   ├── app/
│   │   ├── layout.tsx                 # 根 layout（dark theme, sidebar）
│   │   ├── page.tsx                   # Dashboard 首頁
│   │   ├── stock/
│   │   │   └── [stockId]/
│   │   │       └── page.tsx           # 個股詳細頁
│   │   ├── alerts/
│   │   │   └── page.tsx               # 警示管理頁
│   │   └── api/
│   │       ├── stocks/
│   │       │   ├── search/route.ts
│   │       │   └── [stockId]/
│   │       │       ├── route.ts
│   │       │       ├── prices/route.ts
│   │       │       ├── indicators/route.ts
│   │       │       ├── institutional/route.ts
│   │       │       ├── margin/route.ts
│   │       │       ├── revenue/route.ts
│   │       │       ├── financial/route.ts
│   │       │       ├── dividends/route.ts
│   │       │       └── news/route.ts
│   │       ├── market/
│   │       │   └── overview/route.ts
│   │       ├── watchlists/
│   │       │   ├── route.ts
│   │       │   └── [id]/
│   │       │       ├── route.ts
│   │       │       ├── items/route.ts
│   │       │       └── summary/route.ts
│   │       ├── alerts/
│   │       │   ├── route.ts
│   │       │   ├── [id]/route.ts
│   │       │   ├── history/route.ts
│   │       │   └── triggered-today/route.ts
│   │       └── sync/
│   │           ├── stock-prices/route.ts
│   │           ├── institutional/route.ts
│   │           ├── margin/route.ts
│   │           ├── news/route.ts
│   │           ├── per/route.ts
│   │           ├── revenue/route.ts
│   │           ├── financial/route.ts
│   │           ├── dividends/route.ts
│   │           └── check-alerts/route.ts
│   ├── components/
│   │   ├── ui/                        # shadcn/ui 元件
│   │   ├── dashboard/
│   │   │   ├── MarketOverview.tsx      # 大盤概覽列
│   │   │   ├── AlertCenter.tsx         # 警示中心
│   │   │   ├── WatchlistTable.tsx      # 觀察清單表格
│   │   │   ├── MiniChart.tsx           # 迷你 K 線圖
│   │   │   └── NewsFeed.tsx            # 新聞 Feed
│   │   ├── stock/
│   │   │   ├── StockHeader.tsx         # 個股頂部資訊列
│   │   │   ├── CandlestickChart.tsx    # K 線圖主元件
│   │   │   ├── IndicatorPanel.tsx      # 指標切換面板
│   │   │   ├── FundamentalsTab.tsx     # 基本面 Tab
│   │   │   ├── ChipTab.tsx             # 籌碼面 Tab
│   │   │   └── NewsTab.tsx             # 新聞 Tab
│   │   ├── alerts/
│   │   │   ├── AlertForm.tsx           # 新增警示表單
│   │   │   ├── AlertList.tsx           # 警示列表
│   │   │   └── AlertHistory.tsx        # 警示歷史
│   │   └── shared/
│   │       ├── StockSearch.tsx         # 股票搜尋 combobox
│   │       ├── Sidebar.tsx             # 側邊導覽
│   │       └── NumberDisplay.tsx       # 漲跌數字顯示（紅漲綠跌）
│   ├── lib/
│   │   ├── supabase.ts                # Supabase client
│   │   ├── finmind.ts                 # FinMind API client
│   │   ├── indicators.ts             # 技術指標計算函式
│   │   └── utils.ts                   # 工具函式
│   └── types/
│       └── index.ts                   # TypeScript 型別定義
├── supabase/
│   └── migrations/
│       └── 001_init.sql               # 資料庫 migration
├── scripts/
│   └── seed.ts                        # 初始資料載入腳本
├── .env.local                         # 環境變數
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## 8. 環境變數

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx

# FinMind
FINMIND_API_TOKEN=xxx

# Cron Secret（保護 sync API 不被外部呼叫）
CRON_SECRET=xxx
```

---

## 9. 開發順序建議

### Phase 1：基礎建設
1. 建立 Next.js 專案 + Tailwind + shadcn/ui
2. 設定 Supabase + 建立所有 tables
3. 實作 FinMind API client (`lib/finmind.ts`)
4. 實作 seed script，載入 stocks 清單 + 最近 2 年股價歷史資料
5. 實作資料同步 API routes (`/api/sync/*`)

### Phase 2：核心頁面
6. 實作 Dashboard layout（Sidebar + 大盤概覽）
7. 實作觀察清單 CRUD
8. 實作觀察清單表格（含最新報價）
9. 實作迷你 K 線圖

### Phase 3：個股詳細頁
10. 實作個股頂部資訊列
11. 實作 K 線圖（CandlestickChart）+ 技術指標計算
12. 實作基本面 Tab（月營收 + 財報 + 股利）
13. 實作籌碼面 Tab（法人 + 融資融券）
14. 實作新聞 Tab

### Phase 4：警示系統
15. 實作警示 CRUD
16. 實作警示引擎（check-alerts）
17. 實作 Dashboard 警示中心

### Phase 5：收尾
18. Vercel Cron Jobs 設定
19. 錯誤處理和 loading 狀態
20. 響應式調整

---

## 10. 注意事項

1. **FinMind API 限流**：600 req/hr，sync 時如果要抓全市場（2000+ 檔），需要分批處理，每批之間加 delay。建議先只同步觀察清單內的股票，而非全市場。
2. **台股紅漲綠跌**：這是台灣的慣例，跟美股相反。K 線圖和數字顏色都要注意。
3. **成交量單位**：FinMind 回傳的是「股」，台灣習慣看「張」（1 張 = 1000 股），顯示時要除以 1000。
4. **技術指標需要足夠的歷史資料**：計算 MA240 需要至少 240 個交易日的資料，seed 時要抓夠。
5. **財報科目名稱不固定**：不同公司/產業的科目可能不同，用 JSONB 或寬表存比較彈性。
6. **FinMind 資料更新延遲**：日 K 約凌晨 1:30 更新，cron 設在 2:00 比較保險。
