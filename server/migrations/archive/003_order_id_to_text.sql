-- Migration: Convert order_id from INTEGER to TEXT across all tables
-- This migration rebuilds all tables with TEXT order_id to support alphanumeric order numbers
-- Safe approach: Create new tables → Copy data with CAST → Drop old → Rename

BEGIN TRANSACTION;

-- Disable foreign key constraints during rebuild
PRAGMA foreign_keys = OFF;

-- ========== Step 1: Create new tables with TEXT order_id ==========

-- orders_new
CREATE TABLE orders_new (
  order_id TEXT PRIMARY KEY,
  product_name TEXT NOT NULL,
  qty REAL NOT NULL,
  due_date TEXT NOT NULL,
  sales REAL NOT NULL,
  estimated_material_cost REAL NOT NULL,
  std_time_per_unit REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','in_progress','completed')),
  customer_name TEXT,
  start_date TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- procurements_new  
CREATE TABLE procurements_new (
  id INTEGER PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders_new(order_id) ON DELETE CASCADE,
  kind TEXT CHECK(kind IN ('purchase','manufacture')) NOT NULL,
  item_name TEXT,
  qty REAL,
  unit TEXT,
  eta TEXT,
  status TEXT,
  vendor TEXT,
  unit_price REAL,
  received_at TEXT,
  std_time_per_unit REAL,
  act_time_per_unit REAL,
  worker TEXT,
  completed_at TEXT,
  created_at TEXT NOT NULL
);

-- workers_log_new
CREATE TABLE workers_log_new (
  id INTEGER PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders_new(order_id) ON DELETE CASCADE,
  qty REAL NOT NULL,
  act_time_per_unit REAL NOT NULL,
  worker TEXT NOT NULL,
  date TEXT NOT NULL,
  created_at TEXT NOT NULL
);

-- tasks_new
CREATE TABLE tasks_new (
  id INTEGER PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders_new(order_id) ON DELETE CASCADE,
  task_name TEXT NOT NULL,
  assignee TEXT NOT NULL,
  planned_start TEXT NOT NULL,
  planned_end TEXT NOT NULL,
  std_time_per_unit REAL NOT NULL,
  qty REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'not_started' CHECK(status IN ('not_started','in_progress','completed')),
  created_at TEXT NOT NULL
);

-- work_logs_new
CREATE TABLE work_logs_new (
  id INTEGER PRIMARY KEY,
  work_date TEXT,
  employee_name TEXT,
  client_name TEXT,
  project_name TEXT,
  task_large TEXT,
  task_medium TEXT,
  task_small TEXT,
  work_name TEXT,
  planned_time TEXT,
  actual_time TEXT,
  total_work_time TEXT,
  note TEXT,
  date TEXT,
  worker TEXT,
  task_name TEXT,
  start_time TEXT,
  end_time TEXT,
  duration_hours REAL,
  quantity REAL DEFAULT 0,
  memo TEXT,
  status TEXT DEFAULT '下書き',
  order_id TEXT,
  order_no TEXT,
  match_status TEXT DEFAULT 'unlinked',
  source TEXT DEFAULT 'manual',
  imported_at TEXT DEFAULT (datetime('now', 'localtime')),
  product_name TEXT
);

-- ========== Step 2: Copy data with CAST ==========

-- Copy orders (convert INTEGER to TEXT)
INSERT INTO orders_new SELECT 
  CAST(order_id AS TEXT),
  product_name,
  qty,
  due_date,
  sales,
  estimated_material_cost,
  std_time_per_unit,
  status,
  customer_name,
  start_date,
  created_at,
  updated_at
FROM orders;

-- Copy procurements
INSERT INTO procurements_new SELECT 
  id,
  CAST(order_id AS TEXT),
  kind,
  item_name,
  qty,
  unit,
  eta,
  status,
  vendor,
  unit_price,
  received_at,
  std_time_per_unit,
  act_time_per_unit,
  worker,
  completed_at,
  created_at
FROM procurements;

-- Copy workers_log
INSERT INTO workers_log_new SELECT 
  id,
  CAST(order_id AS TEXT),
  qty,
  act_time_per_unit,
  worker,
  date,
  created_at
FROM workers_log;

-- Copy tasks
INSERT INTO tasks_new SELECT 
  id,
  CAST(order_id AS TEXT),
  task_name,
  assignee,
  planned_start,
  planned_end,
  std_time_per_unit,
  qty,
  status,
  created_at
FROM tasks;

-- Copy work_logs (both order_id and order_no may need conversion)
INSERT INTO work_logs_new SELECT 
  id,
  work_date,
  employee_name,
  client_name,
  project_name,
  task_large,
  task_medium,
  task_small,
  work_name,
  planned_time,
  actual_time,
  total_work_time,
  note,
  date,
  worker,
  task_name,
  start_time,
  end_time,
  duration_hours,
  quantity,
  memo,
  status,
  CASE WHEN order_id IS NOT NULL THEN CAST(order_id AS TEXT) ELSE NULL END,
  order_no,
  match_status,
  source,
  imported_at,
  product_name
FROM work_logs;

-- ========== Step 3: Drop old tables ==========

DROP TABLE work_logs;
DROP TABLE tasks;
DROP TABLE workers_log;
DROP TABLE procurements;
DROP TABLE orders;

-- ========== Step 4: Rename new tables ==========

ALTER TABLE orders_new RENAME TO orders;
ALTER TABLE procurements_new RENAME TO procurements;
ALTER TABLE workers_log_new RENAME TO workers_log;
ALTER TABLE tasks_new RENAME TO tasks;
ALTER TABLE work_logs_new RENAME TO work_logs;

-- ========== Step 5: Recreate indexes ==========

-- orders indexes
CREATE INDEX idx_orders_due ON orders(due_date);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_start ON orders(start_date);

-- procurements indexes
CREATE INDEX idx_proc_orders ON procurements(order_id, kind, status);

-- workers_log indexes
CREATE INDEX idx_wlog_order ON workers_log(order_id, date);

-- tasks indexes
CREATE INDEX idx_tasks_order ON tasks(order_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_planned_start ON tasks(planned_start);

-- work_logs indexes
CREATE INDEX idx_work_logs_date ON work_logs(work_date);
CREATE INDEX idx_work_logs_order ON work_logs(order_id);
CREATE INDEX idx_work_logs_order_no ON work_logs(order_no);

-- ========== Step 6: Re-enable foreign keys and validate ==========

PRAGMA foreign_keys = ON;
PRAGMA foreign_key_check;

COMMIT;

-- Note: After migration, order_id is now TEXT type and supports both numeric ("1", "2") and alphanumeric ("K001", "ORD-2025-001") values
