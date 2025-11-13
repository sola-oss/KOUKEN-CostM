-- Production Management System - Complete Schema Baseline
-- Consolidated migration for order management, procurement, tasks, and work logs
-- Includes comprehensive order management metadata (2025-01)

-- ========== Orders Table (受注管理) ==========
CREATE TABLE orders (
  order_id TEXT PRIMARY KEY,
  
  -- 新受注管理項目（2025-01拡張）
  order_date TEXT,                     -- 受注日（YYYY-MM-DD）
  client_name TEXT,                    -- 客先
  manager TEXT,                        -- 担当者
  client_order_no TEXT,                -- 客先注番
  project_title TEXT,                  -- 件名
  
  -- ステータスフラグ（チェックマーク形式）
  is_delivered INTEGER DEFAULT 0 CHECK(is_delivered IN (0, 1)),               -- 納品完了 ✱
  has_shipping_fee INTEGER DEFAULT 0 CHECK(has_shipping_fee IN (0, 1)),       -- 送料有り ＃
  is_amount_confirmed INTEGER DEFAULT 0 CHECK(is_amount_confirmed IN (0, 1)), -- 金額決定済み -
  is_invoiced INTEGER DEFAULT 0 CHECK(is_invoiced IN (0, 1)),                 -- 請求済み +
  
  -- 日付情報
  due_date TEXT,                       -- 納期（YYYY-MM-DD）
  delivery_date TEXT,                  -- 納品日（YYYY-MM-DD）
  confirmed_date TEXT,                 -- 確定日（YYYY-MM-DD）
  
  -- 金額情報
  estimated_amount REAL,               -- 見積金額
  invoiced_amount REAL,                -- 請求金額
  invoice_month TEXT,                  -- 請求月（YYYY-MM形式）
  
  -- 作業情報
  subcontractor TEXT,                  -- 外注自社
  processing_hours REAL,               -- 加工時間
  
  -- その他
  note TEXT,                           -- 備考
  
  -- レガシー項目（互換性のため残す、将来的に廃止予定）
  product_name TEXT,                   -- → project_title に移行
  qty REAL,                            -- 数量（他テーブルで使用中）
  start_date TEXT,                     -- 開始予定日（KPI計算で使用中）
  sales REAL,                          -- → estimated_amount に移行
  estimated_material_cost REAL,        -- 見込み材料費（KPI計算で使用中）
  std_time_per_unit REAL,              -- 標準工数（KPI計算で使用中）
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending','in_progress','completed')), -- ワークフローステータス
  customer_name TEXT,                  -- → client_name に移行
  
  -- システム管理
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- ========== Procurements Table (手配) ==========
CREATE TABLE procurements (
  id INTEGER PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
  kind TEXT CHECK(kind IN ('purchase','manufacture')) NOT NULL,
  item_name TEXT,
  qty REAL,
  unit TEXT,                       -- 単位（個、本、kg、m、L など）
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

-- ========== Workers Log Table (工数入力) ==========
CREATE TABLE workers_log (
  id INTEGER PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
  qty REAL NOT NULL,
  act_time_per_unit REAL NOT NULL, -- [h/個]
  worker TEXT NOT NULL,
  date TEXT NOT NULL,              -- 作業日(UTC)
  created_at TEXT NOT NULL
);

-- ========== Tasks Table (作業計画) ==========
CREATE TABLE tasks (
  id INTEGER PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
  task_name TEXT NOT NULL,         -- 作業名（例：組立/塗装/検査）
  assignee TEXT NOT NULL,          -- 担当者（必須）
  planned_start TEXT NOT NULL,     -- 予定開始日(UTC)
  planned_end TEXT NOT NULL,       -- 予定終了日(UTC)
  std_time_per_unit REAL NOT NULL, -- 標準工数[h/個]
  qty REAL NOT NULL,               -- 数量
  status TEXT NOT NULL DEFAULT 'not_started' CHECK(status IN ('not_started','in_progress','completed')),
  created_at TEXT NOT NULL
);

-- ========== Work Logs Table (作業実績ログ) ==========
CREATE TABLE work_logs (
  id INTEGER PRIMARY KEY,
  
  -- ハーモスCSVフィールド
  work_date TEXT,                  -- 日付 (YYYY-MM-DD)
  employee_name TEXT,              -- 氏名
  client_name TEXT,                -- 取引先
  project_name TEXT,               -- プロジェクト
  task_large TEXT,                 -- 業務_大_
  task_medium TEXT,                -- 業務_中_
  task_small TEXT,                 -- 業務_小_
  work_name TEXT,                  -- 業務名（受注番号を入れる列）
  planned_time TEXT,               -- 業務時間_予定_
  actual_time TEXT,                -- 業務時間_実績_
  total_work_time TEXT,            -- 総労働時間
  note TEXT,                       -- 備考
  
  -- 手動入力専用フィールド
  date TEXT,                       -- 作業日（手動入力用）
  worker TEXT,                     -- 作業者（手動入力用）
  task_name TEXT,                  -- 作業名（手動入力用）
  start_time TEXT,                 -- 開始時刻（HH:MM形式）
  end_time TEXT,                   -- 終了時刻（HH:MM形式）
  duration_hours REAL,             -- 実績時間（小数）
  quantity REAL DEFAULT 0,         -- 数量
  memo TEXT,                       -- メモ（手動入力用）
  status TEXT DEFAULT '下書き',    -- ステータス（下書き/確定など）
  
  -- 紐付け関連
  order_id TEXT,                   -- 受注ID (orders.order_id)
  order_no TEXT,                   -- 受注番号 (k001など) - 廃止予定
  match_status TEXT DEFAULT 'unlinked',  -- linked / temp / unlinked
  
  -- 取込管理
  source TEXT DEFAULT 'manual',    -- データ由来: manual / harmos
  imported_at TEXT DEFAULT (datetime('now', 'localtime'))
);

-- ========== Indexes for Performance ==========
-- Orders indexes
CREATE INDEX idx_orders_due ON orders(due_date);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_start ON orders(start_date);
CREATE INDEX idx_orders_order_date ON orders(order_date);
CREATE INDEX idx_orders_invoice_month ON orders(invoice_month);

-- Procurements indexes
CREATE INDEX idx_proc_orders ON procurements(order_id, kind, status);

-- Workers log indexes
CREATE INDEX idx_wlog_order ON workers_log(order_id, date);

-- Tasks indexes
CREATE INDEX idx_tasks_order ON tasks(order_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_planned_start ON tasks(planned_start);

-- Work logs indexes
CREATE INDEX idx_work_logs_date ON work_logs(work_date);
CREATE INDEX idx_work_logs_order ON work_logs(order_id);
CREATE INDEX idx_work_logs_order_no ON work_logs(order_no);
