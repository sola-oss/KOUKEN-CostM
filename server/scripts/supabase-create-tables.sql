-- ============================================================
-- Supabase SQL Editor で実行するテーブル作成SQL
-- ============================================================
-- 実行方法: Supabase ダッシュボード → SQL Editor → このSQL全体を貼り付けて Run
-- ============================================================

-- ① material_costs（材料費入力）
CREATE TABLE IF NOT EXISTS material_costs (
  id           SERIAL PRIMARY KEY,
  order_id     TEXT NOT NULL,
  description  TEXT,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  vendor_id    INTEGER,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_material_costs_order_id ON material_costs(order_id);

-- ② purchased_items（購入品入力）
CREATE TABLE IF NOT EXISTS purchased_items (
  id           SERIAL PRIMARY KEY,
  order_id     TEXT NOT NULL,
  description  TEXT,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  vendor_id    INTEGER,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_purchased_items_order_id ON purchased_items(order_id);

-- ③ order_customer_map（受注-得意先マッピング）
CREATE TABLE IF NOT EXISTS order_customer_map (
  order_id     TEXT PRIMARY KEY,
  customer_id  INTEGER,
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);
