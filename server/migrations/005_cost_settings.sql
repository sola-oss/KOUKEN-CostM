-- Cost Settings Table (原価設定)
-- 労務単価などの原価計算設定

CREATE TABLE IF NOT EXISTS cost_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  labor_rate_per_hour REAL NOT NULL DEFAULT 3000,  -- 労務単価（円/時間）
  updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

-- Insert default settings if table is empty
INSERT OR IGNORE INTO cost_settings (id, labor_rate_per_hour, updated_at)
SELECT 1, 3000, datetime('now', 'localtime')
WHERE NOT EXISTS (SELECT 1 FROM cost_settings WHERE id = 1);

-- Add unit_price column to materials table if it doesn't exist
-- Note: SQLite doesn't support IF NOT EXISTS for ALTER TABLE ADD COLUMN
-- This will fail silently if column already exists
ALTER TABLE materials ADD COLUMN unit_price REAL;
