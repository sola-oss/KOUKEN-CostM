-- Production Management MVP - SQLite Schema
-- Replaces existing complex sales order system

-- Drop existing tables (complete system replacement)
DROP TABLE IF EXISTS sales_order_lines_min;
DROP TABLE IF EXISTS sales_orders_min;
DROP TABLE IF EXISTS sequences;

-- 受注 (Orders) - Core production orders
CREATE TABLE orders (
  order_id INTEGER PRIMARY KEY,
  product_name TEXT NOT NULL,
  qty REAL NOT NULL,
  due_date TEXT NOT NULL,          -- UTC ISO
  sales REAL NOT NULL,             -- 売上（合計）
  material_unit_cost REAL NOT NULL,-- 材料単価（1個あたり）
  std_time_per_unit REAL NOT NULL, -- 標準工数[h/個]
  wage_rate REAL NOT NULL,         -- 時給[円/h]
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 手配 (Procurements) - 購買(purchase) と 製造(manufacture) を統合
CREATE TABLE procurements (
  id INTEGER PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
  kind TEXT CHECK(kind IN ('purchase','manufacture')) NOT NULL,
  item_name TEXT,
  qty REAL,
  eta TEXT,                        -- 予定日(UTC)
  status TEXT,                     -- 'planned'|'ordered'|'received'|'done' など
  vendor TEXT,                     -- kind=purchase 用（任意）
  unit_price REAL,                 -- kind=purchase 用（入荷時に金額算出）
  received_at TEXT,                -- kind=purchase 用（UTC）
  std_time_per_unit REAL,          -- kind=manufacture 用 [h/個]
  act_time_per_unit REAL,          -- kind=manufacture 用 [h/個]
  worker TEXT,                     -- kind=manufacture 用（任意）
  completed_at TEXT,               -- kind=manufacture 用（UTC）
  created_at TEXT NOT NULL
);

-- 工数入力 (Workers Log) - スタッフ用の簡易打刻
CREATE TABLE workers_log (
  id INTEGER PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
  qty REAL NOT NULL,
  act_time_per_unit REAL NOT NULL, -- [h/個]
  worker TEXT NOT NULL,
  date TEXT NOT NULL,              -- 作業日(UTC)
  created_at TEXT NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_orders_due ON orders(due_date);
CREATE INDEX IF NOT EXISTS idx_proc_orders ON procurements(order_id, kind, status);
CREATE INDEX IF NOT EXISTS idx_wlog_order ON workers_log(order_id, date);