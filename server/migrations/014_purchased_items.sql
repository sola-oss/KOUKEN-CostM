-- 014_purchased_items.sql
-- 購入品入力テーブル (SQLite)
CREATE TABLE IF NOT EXISTS purchased_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id TEXT NOT NULL,
  description TEXT,
  total_amount NUMERIC NOT NULL,
  vendor_id INTEGER,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_purchased_items_order_id ON purchased_items(order_id);
