-- ============================================================
-- 発注管理テーブル マイグレーション
-- Supabaseダッシュボード > SQL Editor で実行してください
-- ============================================================

-- 旧カラムを削除し、新カラムを追加する
ALTER TABLE procurements
  DROP COLUMN IF EXISTS kind,
  DROP COLUMN IF EXISTS item_name,
  DROP COLUMN IF EXISTS qty,
  DROP COLUMN IF EXISTS unit,
  DROP COLUMN IF EXISTS eta,
  DROP COLUMN IF EXISTS vendor,
  DROP COLUMN IF EXISTS received_at,
  DROP COLUMN IF EXISTS std_time_per_unit,
  DROP COLUMN IF EXISTS act_time_per_unit,
  DROP COLUMN IF EXISTS worker,
  DROP COLUMN IF EXISTS completed_at,
  DROP COLUMN IF EXISTS total_amount,
  DROP COLUMN IF EXISTS is_approved;

-- 新カラムを追加
ALTER TABLE procurements
  ADD COLUMN IF NOT EXISTS material_id INTEGER REFERENCES materials(id),
  ADD COLUMN IF NOT EXISTS account_type TEXT NOT NULL DEFAULT '外注費',
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS quantity NUMERIC,
  ADD COLUMN IF NOT EXISTS unit_price NUMERIC,
  ADD COLUMN IF NOT EXISTS amount NUMERIC,
  ADD COLUMN IF NOT EXISTS order_date TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT '発注中',
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- statusカラムのデフォルト値を確実に「発注中」に設定
-- （カラムが既存だった場合にも適用される）
ALTER TABLE procurements ALTER COLUMN status SET DEFAULT '発注中';

-- vendor_id は既存カラムなのでそのまま利用

-- インデックスを追加
CREATE INDEX IF NOT EXISTS idx_proc_order_status ON procurements (order_id, status);
CREATE INDEX IF NOT EXISTS idx_proc_account_type ON procurements (account_type);
