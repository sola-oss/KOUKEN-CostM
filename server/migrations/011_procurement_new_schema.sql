-- Migration 011: 発注管理テーブルの新スキーマへの移行
-- 旧カラムを削除し、外注費管理に特化した新カラム構成に変更

-- SQLiteはALTER TABLE DROP COLUMNに制限があるため、テーブルを再作成する方法を使用
-- ただし既存データが0件であることが前提（本番もSupabaseで別途実行済み）

-- 既存インデックスを削除
DROP INDEX IF EXISTS idx_proc_orders;
DROP INDEX IF EXISTS idx_proc_vendor;

-- 既存テーブルを削除して再作成（データ0件前提）
DROP TABLE IF EXISTS procurements;

CREATE TABLE procurements (
  id INTEGER PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
  vendor_id INTEGER,               -- 業者マスタID
  material_id INTEGER,             -- 材料マスタID（任意）
  account_type TEXT NOT NULL DEFAULT '外注費', -- 科目
  description TEXT,                -- 内容（テキスト）
  quantity REAL,                   -- 数量
  unit_price REAL,                 -- 単価
  amount REAL,                     -- 金額（quantity × unit_price）
  order_date TEXT,                 -- 発注日
  status TEXT DEFAULT '発注中',    -- ステータス（発注中/完了/キャンセル）
  notes TEXT,                      -- 備考
  created_at TEXT NOT NULL
);

-- インデックスを再作成
CREATE INDEX IF NOT EXISTS idx_proc_order_status ON procurements(order_id, status);
CREATE INDEX IF NOT EXISTS idx_proc_vendor ON procurements(vendor_id);
CREATE INDEX IF NOT EXISTS idx_proc_account_type ON procurements(account_type);
