-- 生産業向け工数管理システム データベーススキーマ (SQLite)
-- タイムゾーン: Asia/Tokyo (サーバーはUTC保存、入出力時に変換)

-- 従業員テーブル
CREATE TABLE employees (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    role TEXT CHECK(role IN ('worker','manager','admin')) DEFAULT 'worker',
    email TEXT,
    hourly_cost_rate REAL NOT NULL,
    is_active INTEGER DEFAULT 1,
    created_at TEXT NOT NULL
);

-- 業者テーブル (300件想定、検索・フィルター・ページング対応)
CREATE TABLE vendors (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT,
    address_pref TEXT, -- 都道府県
    phone TEXT,
    email TEXT,
    payment_terms TEXT, -- 支払条件
    is_active INTEGER DEFAULT 1,
    created_at TEXT NOT NULL
);

-- 案件テーブル (セグメント: 観光、住宅、サウナ)
CREATE TABLE projects (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    customer TEXT,
    segment TEXT CHECK(segment IN ('観光','住宅','サウナ')) NOT NULL,
    start_date TEXT,
    end_date TEXT,
    vendor_id INTEGER,
    is_active INTEGER DEFAULT 1,
    created_at TEXT NOT NULL,
    FOREIGN KEY (vendor_id) REFERENCES vendors(id)
);

-- 工程テーブル
CREATE TABLE work_orders (
    id INTEGER PRIMARY KEY,
    project_id INTEGER NOT NULL,
    operation TEXT NOT NULL, -- 工程名
    std_minutes INTEGER DEFAULT 0, -- 標準作業時間（分）
    FOREIGN KEY (project_id) REFERENCES projects(id)
);

-- 工数実績テーブル (承認フロー: draft → approved)
CREATE TABLE time_entries (
    id INTEGER PRIMARY KEY,
    employee_id INTEGER NOT NULL,
    work_order_id INTEGER NOT NULL,
    start_at TEXT, -- ISO 8601 format (UTC)
    end_at TEXT,   -- ISO 8601 format (UTC)
    minutes INTEGER, -- 実績時間（分） start/stop運用時は自動計算、手入力時は直接指定
    note TEXT,
    status TEXT CHECK(status IN ('draft','approved')) NOT NULL DEFAULT 'draft',
    approved_at TEXT, -- 承認日時 (UTC)
    approved_by INTEGER, -- 承認者ID
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (employee_id) REFERENCES employees(id),
    FOREIGN KEY (work_order_id) REFERENCES work_orders(id),
    FOREIGN KEY (approved_by) REFERENCES employees(id)
);

-- 承認ログテーブル (監査ログ)
CREATE TABLE approvals (
    id INTEGER PRIMARY KEY,
    time_entry_id INTEGER NOT NULL,
    approver_id INTEGER NOT NULL,
    approved_at TEXT NOT NULL, -- 承認日時 (UTC)
    FOREIGN KEY (time_entry_id) REFERENCES time_entries(id),
    FOREIGN KEY (approver_id) REFERENCES employees(id)
);

-- 必須インデックス (パフォーマンス最適化)

-- 業者テーブル用インデックス
CREATE INDEX idx_vendors_name ON vendors(name);
CREATE INDEX idx_vendors_category_active ON vendors(category, is_active);
CREATE INDEX idx_vendors_created_at ON vendors(created_at);

-- 案件テーブル用インデックス
CREATE INDEX idx_projects_segment_active ON projects(segment, is_active);
CREATE INDEX idx_projects_created_at ON projects(created_at);

-- 工数実績テーブル用インデックス
CREATE INDEX idx_time_entries_employee_start ON time_entries(employee_id, start_at);
CREATE INDEX idx_time_entries_work_order_created ON time_entries(work_order_id, created_at);
CREATE INDEX idx_time_entries_status ON time_entries(status);
CREATE INDEX idx_time_entries_approved_at ON time_entries(approved_at);

-- 工程テーブル用インデックス
CREATE INDEX idx_work_orders_project_id ON work_orders(project_id);

-- 承認ログ用インデックス
CREATE INDEX idx_approvals_time_entry_id ON approvals(time_entry_id);
CREATE INDEX idx_approvals_approver_id ON approvals(approver_id);

-- FTS5検索用テーブル (オプション - 環境変数でON/OFF切替)
-- CREATE VIRTUAL TABLE vendors_fts USING fts5(name, phone, email, content=vendors, content_rowid=id);
-- CREATE TRIGGER vendors_fts_insert AFTER INSERT ON vendors BEGIN
--   INSERT INTO vendors_fts(rowid, name, phone, email) VALUES (new.id, new.name, new.phone, new.email);
-- END;
-- CREATE TRIGGER vendors_fts_delete AFTER DELETE ON vendors BEGIN
--   INSERT INTO vendors_fts(vendors_fts, rowid, name, phone, email) VALUES ('delete', old.id, old.name, old.phone, old.email);
-- END;
-- CREATE TRIGGER vendors_fts_update AFTER UPDATE ON vendors BEGIN
--   INSERT INTO vendors_fts(vendors_fts, rowid, name, phone, email) VALUES ('delete', old.id, old.name, old.phone, old.email);
--   INSERT INTO vendors_fts(rowid, name, phone, email) VALUES (new.id, new.name, new.phone, new.email);
-- END;