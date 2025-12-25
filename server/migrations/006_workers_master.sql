-- Workers Master (作業者マスタ) - 作業者別の時間単価を管理
CREATE TABLE IF NOT EXISTS workers_master (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  hourly_rate REAL NOT NULL,
  is_active INTEGER DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_workers_master_name ON workers_master(name);
