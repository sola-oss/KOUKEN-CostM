-- Initial schema migration for work hour management system
-- Run with: npm run migrate

-- 従業員テーブル
CREATE TABLE IF NOT EXISTS employees (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    role TEXT CHECK(role IN ('worker','manager','admin')) DEFAULT 'worker',
    email TEXT,
    hourly_cost_rate REAL NOT NULL,
    is_active INTEGER DEFAULT 1,
    created_at TEXT NOT NULL
);

-- 業者テーブル
CREATE TABLE IF NOT EXISTS vendors (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT,
    address_pref TEXT,
    phone TEXT,
    email TEXT,
    payment_terms TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT NOT NULL
);

-- 案件テーブル
CREATE TABLE IF NOT EXISTS projects (
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
CREATE TABLE IF NOT EXISTS work_orders (
    id INTEGER PRIMARY KEY,
    project_id INTEGER NOT NULL,
    operation TEXT NOT NULL,
    std_minutes INTEGER DEFAULT 0,
    FOREIGN KEY (project_id) REFERENCES projects(id)
);

-- 工数実績テーブル
CREATE TABLE IF NOT EXISTS time_entries (
    id INTEGER PRIMARY KEY,
    employee_id INTEGER NOT NULL,
    work_order_id INTEGER NOT NULL,
    start_at TEXT,
    end_at TEXT,
    minutes INTEGER,
    note TEXT,
    status TEXT CHECK(status IN ('draft','approved')) NOT NULL DEFAULT 'draft',
    approved_at TEXT,
    approved_by INTEGER,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (employee_id) REFERENCES employees(id),
    FOREIGN KEY (work_order_id) REFERENCES work_orders(id),
    FOREIGN KEY (approved_by) REFERENCES employees(id)
);

-- 承認ログテーブル
CREATE TABLE IF NOT EXISTS approvals (
    id INTEGER PRIMARY KEY,
    time_entry_id INTEGER NOT NULL,
    approver_id INTEGER NOT NULL,
    approved_at TEXT NOT NULL,
    FOREIGN KEY (time_entry_id) REFERENCES time_entries(id),
    FOREIGN KEY (approver_id) REFERENCES employees(id)
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_vendors_name ON vendors(name);
CREATE INDEX IF NOT EXISTS idx_vendors_category_active ON vendors(category, is_active);
CREATE INDEX IF NOT EXISTS idx_vendors_created_at ON vendors(created_at);

CREATE INDEX IF NOT EXISTS idx_projects_segment_active ON projects(segment, is_active);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at);

CREATE INDEX IF NOT EXISTS idx_time_entries_employee_start ON time_entries(employee_id, start_at);
CREATE INDEX IF NOT EXISTS idx_time_entries_work_order_created ON time_entries(work_order_id, created_at);
CREATE INDEX IF NOT EXISTS idx_time_entries_status ON time_entries(status);
CREATE INDEX IF NOT EXISTS idx_time_entries_approved_at ON time_entries(approved_at);

CREATE INDEX IF NOT EXISTS idx_work_orders_project_id ON work_orders(project_id);

CREATE INDEX IF NOT EXISTS idx_approvals_time_entry_id ON approvals(time_entry_id);
CREATE INDEX IF NOT EXISTS idx_approvals_approver_id ON approvals(approver_id);