-- SQLite migration for minimal sales order system
-- Emergency recovery schema

CREATE TABLE IF NOT EXISTS sales_orders (
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
    status TEXT CHECK(status IN ('draft','confirmed','closed')) NOT NULL DEFAULT 'draft',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sales_order_lines (
    id INTEGER PRIMARY KEY,
    sales_order_id INTEGER NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
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
    created_at TEXT NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_so_status_date ON sales_orders(status, order_date);
CREATE INDEX IF NOT EXISTS idx_sol_so ON sales_order_lines(sales_order_id);