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
