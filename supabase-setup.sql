-- ============================================================
-- Supabase テーブル作成SQL
-- Supabaseダッシュボード > SQL Editor で実行してください
-- ============================================================

-- 受注テーブル
CREATE TABLE IF NOT EXISTS orders (
  order_id TEXT PRIMARY KEY,
  order_date TEXT,
  client_name TEXT,
  manager TEXT,
  client_order_no TEXT,
  project_title TEXT,
  is_delivered BOOLEAN DEFAULT FALSE,
  has_shipping_fee BOOLEAN DEFAULT FALSE,
  is_amount_confirmed BOOLEAN DEFAULT FALSE,
  is_invoiced BOOLEAN DEFAULT FALSE,
  due_date TEXT,
  delivery_date TEXT,
  confirmed_date TEXT,
  estimated_amount NUMERIC,
  invoiced_amount NUMERIC,
  invoice_month TEXT,
  subcontractor TEXT,
  processing_hours NUMERIC,
  note TEXT,
  product_name TEXT,
  qty NUMERIC,
  start_date TEXT,
  sales NUMERIC,
  estimated_material_cost NUMERIC,
  std_time_per_unit NUMERIC,
  status TEXT DEFAULT 'pending',
  customer_name TEXT,
  customer_code TEXT,
  customer_zip TEXT,
  customer_address1 TEXT,
  customer_address2 TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 調達テーブル
CREATE TABLE IF NOT EXISTS procurements (
  id SERIAL PRIMARY KEY,
  order_id TEXT REFERENCES orders(order_id) ON DELETE CASCADE,
  kind TEXT,
  item_name TEXT,
  qty NUMERIC,
  unit TEXT,
  eta TEXT,
  status TEXT,
  vendor TEXT,
  unit_price NUMERIC,
  received_at TEXT,
  std_time_per_unit NUMERIC,
  act_time_per_unit NUMERIC,
  worker TEXT,
  completed_at TEXT,
  vendor_id INTEGER,
  total_amount NUMERIC,
  is_approved BOOLEAN DEFAULT FALSE,
  created_at TEXT NOT NULL
);

-- 作業者ログテーブル
CREATE TABLE IF NOT EXISTS workers_log (
  id SERIAL PRIMARY KEY,
  order_id TEXT REFERENCES orders(order_id) ON DELETE CASCADE,
  qty NUMERIC,
  act_time_per_unit NUMERIC,
  worker TEXT,
  date TEXT,
  created_at TEXT NOT NULL
);

-- タスクテーブル
CREATE TABLE IF NOT EXISTS tasks (
  id SERIAL PRIMARY KEY,
  order_id TEXT REFERENCES orders(order_id) ON DELETE CASCADE,
  task_name TEXT,
  assignee TEXT,
  planned_start TEXT,
  planned_end TEXT,
  std_time_per_unit NUMERIC,
  qty NUMERIC,
  status TEXT DEFAULT 'not_started',
  created_at TEXT NOT NULL
);

-- 作業実績テーブル
CREATE TABLE IF NOT EXISTS work_logs (
  id SERIAL PRIMARY KEY,
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
  task_id INTEGER,
  start_time TEXT,
  end_time TEXT,
  duration_hours NUMERIC,
  quantity NUMERIC,
  memo TEXT,
  status TEXT,
  order_id TEXT REFERENCES orders(order_id) ON DELETE SET NULL,
  order_no TEXT,
  match_status TEXT DEFAULT 'unlinked',
  source TEXT DEFAULT 'manual',
  imported_at TEXT
);

-- 材料マスタテーブル
CREATE TABLE IF NOT EXISTS materials (
  id SERIAL PRIMARY KEY,
  material_type TEXT NOT NULL,
  name TEXT NOT NULL,
  size TEXT NOT NULL,
  unit TEXT NOT NULL,
  unit_weight NUMERIC,
  unit_price NUMERIC,
  remark TEXT,
  created_at TEXT NOT NULL DEFAULT NOW()::TEXT
);

-- 材料使用実績テーブル
CREATE TABLE IF NOT EXISTS material_usages (
  id SERIAL PRIMARY KEY,
  project_id TEXT,
  area TEXT,
  zone TEXT,
  drawing_no TEXT,
  material_id INTEGER REFERENCES materials(id) ON DELETE CASCADE,
  quantity NUMERIC DEFAULT 1,
  length NUMERIC,
  remark TEXT,
  created_at TEXT NOT NULL
);

-- 原価設定テーブル
CREATE TABLE IF NOT EXISTS cost_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  labor_rate_per_hour NUMERIC NOT NULL DEFAULT 3000,
  updated_at TEXT NOT NULL DEFAULT NOW()::TEXT
);

-- 作業者マスタテーブル
CREATE TABLE IF NOT EXISTS workers_master (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  hourly_rate NUMERIC NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 業者マスタテーブル
CREATE TABLE IF NOT EXISTS vendors_master (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  note TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 外注費テーブル
CREATE TABLE IF NOT EXISTS outsourcing_costs (
  id SERIAL PRIMARY KEY,
  project_id TEXT,
  vendor_id INTEGER REFERENCES vendors_master(id),
  description TEXT,
  amount NUMERIC,
  date TEXT,
  note TEXT,
  created_at TEXT NOT NULL
);

-- 原価設定の初期データ
INSERT INTO cost_settings (id, labor_rate_per_hour, updated_at)
VALUES (1, 3000, NOW()::TEXT)
ON CONFLICT (id) DO NOTHING;
