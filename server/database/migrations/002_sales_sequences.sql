-- Add sequences table for sales order number generation
-- Run with: npm run migrate

-- Sequences table for order number generation (year/month-based)
CREATE TABLE IF NOT EXISTS sequences (
  key TEXT PRIMARY KEY,   -- Example: 'SO-202509'
  value INTEGER NOT NULL  -- Latest sequence number
);

-- Add index on sales_orders status and date for better query performance  
CREATE INDEX IF NOT EXISTS idx_sales_orders_status_date 
  ON sales_orders(status, order_date);