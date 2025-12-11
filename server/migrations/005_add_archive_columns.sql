-- Migration 005: Add archive columns to orders table
-- アーカイブ機能を追加して過去データを管理可能にする

-- Add is_archived column (default: false = 0)
ALTER TABLE orders ADD COLUMN is_archived INTEGER DEFAULT 0;

-- Add archived_at column (datetime when archived)
ALTER TABLE orders ADD COLUMN archived_at TEXT;

-- Create index for efficient filtering
CREATE INDEX IF NOT EXISTS idx_orders_archived ON orders(is_archived);
