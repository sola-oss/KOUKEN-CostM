-- Minimal Sales Order Management Migration
-- Creates simplified sales_orders and sales_order_lines tables
-- Run with: npm run migrate

-- 受注テーブル (simplified version with customer_name instead of customer_id)
CREATE TABLE IF NOT EXISTS sales_orders_min (
    id INTEGER PRIMARY KEY,
    so_no TEXT UNIQUE,
    customer_name TEXT NOT NULL,
    order_date TEXT NOT NULL,
    due_date TEXT,
    order_type TEXT,
    sales_rep TEXT,
    ship_to_name TEXT,
    ship_to_address TEXT,
    customer_contact TEXT,
    customer_email TEXT,
    tags TEXT,
    note TEXT,
    status TEXT CHECK(status IN ('draft','confirmed','closed')) DEFAULT 'draft',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- 受注明細テーブル (simplified version)
CREATE TABLE IF NOT EXISTS sales_order_lines_min (
    id INTEGER PRIMARY KEY,
    sales_order_id INTEGER NOT NULL,
    line_no INTEGER NOT NULL,
    item_code TEXT,
    item_name TEXT,
    qty REAL NOT NULL,
    uom TEXT NOT NULL,
    line_due_date TEXT,
    unit_price REAL,
    amount REAL,
    tax_rate REAL,
    partial_allowed INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    FOREIGN KEY (sales_order_id) REFERENCES sales_orders_min(id) ON DELETE CASCADE
);

-- Main indexes for performance
CREATE INDEX IF NOT EXISTS idx_so_min_status_date ON sales_orders_min(status, order_date);
CREATE INDEX IF NOT EXISTS idx_so_min_customer_name ON sales_orders_min(customer_name);
CREATE INDEX IF NOT EXISTS idx_so_min_no ON sales_orders_min(so_no);
CREATE INDEX IF NOT EXISTS idx_so_min_created_at ON sales_orders_min(created_at);
CREATE INDEX IF NOT EXISTS idx_sol_min_so ON sales_order_lines_min(sales_order_id);

-- Insert some sample data for testing
INSERT INTO sales_orders_min (customer_name, order_date, due_date, note, status, created_at, updated_at) VALUES
('山田商事', '2025-09-15', '2025-09-25', 'テスト受注1', 'draft', datetime('now'), datetime('now')),
('田中工業', '2025-09-16', '2025-09-30', 'テスト受注2', 'draft', datetime('now'), datetime('now')),
('佐藤製作所', '2025-09-17', '2025-10-01', 'テスト受注3', 'confirmed', datetime('now'), datetime('now')),
('鈴木電機', '2025-09-18', '2025-10-05', 'テスト受注4', 'draft', datetime('now'), datetime('now')),
('高橋建設', '2025-09-19', '2025-10-10', 'テスト受注5', 'draft', datetime('now'), datetime('now'));

-- Insert sample order lines
INSERT INTO sales_order_lines_min (sales_order_id, line_no, item_name, qty, uom, unit_price, amount, created_at) VALUES
(1, 1, '製品A', 10, '個', 1000, 10000, datetime('now')),
(1, 2, '製品B', 5, '個', 2000, 10000, datetime('now')),
(2, 1, '材料C', 100, 'kg', 500, 50000, datetime('now')),
(3, 1, '部品D', 20, '個', 1500, 30000, datetime('now')),
(4, 1, '工具E', 3, '台', 5000, 15000, datetime('now'));