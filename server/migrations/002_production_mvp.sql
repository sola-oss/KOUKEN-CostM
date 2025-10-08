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
  estimated_material_cost REAL NOT NULL, -- 見込み材料費（概算）
  std_time_per_unit REAL NOT NULL, -- 標準工数[h/個]
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','in_progress','completed')), -- ステータス
  customer_name TEXT,              -- 顧客名（任意）
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

-- 作業計画 (Tasks) - 作業分解と担当者決定
CREATE TABLE tasks (
  id INTEGER PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
  task_name TEXT NOT NULL,         -- 作業名（例：組立/塗装/検査）
  assignee TEXT NOT NULL,          -- 担当者（必須）
  planned_start TEXT NOT NULL,     -- 予定開始日(UTC)
  planned_end TEXT NOT NULL,       -- 予定終了日(UTC)
  std_time_per_unit REAL NOT NULL, -- 標準工数[h/個]
  qty REAL NOT NULL,               -- 数量
  status TEXT NOT NULL DEFAULT 'not_started' CHECK(status IN ('not_started','in_progress','completed')), -- ステータス
  created_at TEXT NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_orders_due ON orders(due_date);
CREATE INDEX IF NOT EXISTS idx_proc_orders ON procurements(order_id, kind, status);
CREATE INDEX IF NOT EXISTS idx_wlog_order ON workers_log(order_id, date);
CREATE INDEX IF NOT EXISTS idx_tasks_order ON tasks(order_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_planned_start ON tasks(planned_start);