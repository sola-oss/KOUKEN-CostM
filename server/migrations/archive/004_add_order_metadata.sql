-- Add Order Management Metadata Fields
-- Migration: Extend orders table with comprehensive order management fields

-- Step 1: Add all new columns first
ALTER TABLE orders ADD COLUMN order_date TEXT;
ALTER TABLE orders ADD COLUMN client_name TEXT;
ALTER TABLE orders ADD COLUMN manager TEXT;
ALTER TABLE orders ADD COLUMN client_order_no TEXT;
ALTER TABLE orders ADD COLUMN project_title TEXT;
ALTER TABLE orders ADD COLUMN is_delivered INTEGER DEFAULT 0;
ALTER TABLE orders ADD COLUMN has_shipping_fee INTEGER DEFAULT 0;
ALTER TABLE orders ADD COLUMN is_amount_confirmed INTEGER DEFAULT 0;
ALTER TABLE orders ADD COLUMN is_invoiced INTEGER DEFAULT 0;
ALTER TABLE orders ADD COLUMN delivery_date TEXT;
ALTER TABLE orders ADD COLUMN confirmed_date TEXT;
ALTER TABLE orders ADD COLUMN estimated_amount REAL;
ALTER TABLE orders ADD COLUMN invoiced_amount REAL;
ALTER TABLE orders ADD COLUMN invoice_month TEXT;
ALTER TABLE orders ADD COLUMN subcontractor TEXT;
ALTER TABLE orders ADD COLUMN processing_hours REAL;
ALTER TABLE orders ADD COLUMN note TEXT;

-- Step 2: Create indexes for new fields
CREATE INDEX IF NOT EXISTS idx_orders_order_date ON orders(order_date);
CREATE INDEX IF NOT EXISTS idx_orders_invoice_month ON orders(invoice_month);

-- Step 3: データバックフィル: レガシー項目から新項目へコピー
UPDATE orders SET project_title = product_name WHERE project_title IS NULL AND product_name IS NOT NULL;
UPDATE orders SET client_name = customer_name WHERE client_name IS NULL AND customer_name IS NOT NULL;
UPDATE orders SET estimated_amount = sales WHERE estimated_amount IS NULL AND sales IS NOT NULL;
