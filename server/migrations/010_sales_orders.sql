-- Sales Orders Schema for SQLite
-- Creates tables for sales order management

-- 受注マスタ (Sales Orders)
CREATE TABLE IF NOT EXISTS sales_orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  so_no TEXT,                           -- 受注番号（確定後に自動採番）
  customer_name TEXT NOT NULL,          -- 顧客名
  order_date TEXT NOT NULL,             -- 受注日 (YYYY-MM-DD)
  due_date TEXT,                        -- 納期 (YYYY-MM-DD)
  order_type TEXT DEFAULT 'normal',     -- 受注種別
  sales_rep TEXT,                       -- 営業担当
  ship_to_name TEXT,                    -- 配送先名
  ship_to_address TEXT,                 -- 配送先住所
  customer_contact TEXT,                -- 顧客担当者
  customer_email TEXT,                  -- 顧客メール
  tags TEXT,                            -- タグ（JSON配列）
  note TEXT,                            -- メモ
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'confirmed', 'closed')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 受注明細 (Sales Order Lines)
CREATE TABLE IF NOT EXISTS sales_order_lines (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sales_order_id INTEGER NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
  line_no INTEGER NOT NULL,
  item_code TEXT,
  item_name TEXT,
  qty REAL NOT NULL,
  uom TEXT NOT NULL,                    -- 単位
  line_due_date TEXT,                   -- 明細納期
  unit_price REAL,                      -- 単価
  amount REAL,                          -- 金額
  tax_rate REAL,                        -- 税率
  partial_allowed INTEGER DEFAULT 0,    -- 分納可否
  created_at TEXT NOT NULL
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_sales_orders_status ON sales_orders(status);
CREATE INDEX IF NOT EXISTS idx_sales_orders_order_date ON sales_orders(order_date);
CREATE INDEX IF NOT EXISTS idx_sales_orders_customer ON sales_orders(customer_name);
CREATE INDEX IF NOT EXISTS idx_sales_order_lines_order ON sales_order_lines(sales_order_id);
