-- Add sales orders table for the sales order management system
-- Run with: npm run migrate

-- 受注テーブル
CREATE TABLE IF NOT EXISTS sales_orders (
    id INTEGER PRIMARY KEY,
    so_no TEXT,
    customer_name TEXT NOT NULL,
    order_date TEXT NOT NULL,
    due_date TEXT,
    status TEXT CHECK(status IN ('draft','confirmed','closed')) NOT NULL DEFAULT 'draft',
    note TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_sales_orders_so_no ON sales_orders(so_no);
CREATE INDEX IF NOT EXISTS idx_sales_orders_status ON sales_orders(status);
CREATE INDEX IF NOT EXISTS idx_sales_orders_order_date ON sales_orders(order_date);
CREATE INDEX IF NOT EXISTS idx_sales_orders_customer_name ON sales_orders(customer_name);
CREATE INDEX IF NOT EXISTS idx_sales_orders_created_at ON sales_orders(created_at);