-- Materials Master Table (材料マスタ)
-- 共通の材料マスタ - プロジェクト非依存
-- 将来の「材料使用テーブル」から参照される前提

CREATE TABLE IF NOT EXISTS materials (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  material_type TEXT NOT NULL,           -- 材料種別（鋼材、配管、など）
  name TEXT NOT NULL,                     -- 材料名（C鋼、H鋼、など）
  size TEXT NOT NULL,                     -- サイズ（C100×50×5×7.5）
  unit TEXT NOT NULL,                     -- 単位（m、本、kg）
  unit_weight REAL,                       -- 単位重量（kg/m など）
  remark TEXT,                            -- 備考
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

-- インデックス: 材料種別と名前での検索を最適化
CREATE INDEX IF NOT EXISTS idx_materials_type_name ON materials(material_type, name);
