-- Migration: 004_material_usages.sql
-- 材料使用テーブル（プロジェクト別・工区別の材料使用管理）

CREATE TABLE IF NOT EXISTS material_usages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id TEXT NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
  area TEXT,                                    -- エリア（2F など）
  zone TEXT,                                    -- 工区（N工区 / S工区）
  drawing_no TEXT,                              -- 図面番号
  material_id INTEGER NOT NULL REFERENCES materials(id) ON DELETE RESTRICT,
  quantity REAL NOT NULL DEFAULT 1,             -- 数量
  length REAL,                                  -- 長さ（m）
  remark TEXT,                                  -- 備考
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_material_usages_project ON material_usages(project_id);
CREATE INDEX IF NOT EXISTS idx_material_usages_material ON material_usages(material_id);
