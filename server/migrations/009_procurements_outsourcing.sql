-- Migration 009: Add outsourcing cost fields to procurements table
-- This consolidates outsourcing cost management into procurement
-- Note: vendor_id, total_amount, is_approved columns are now included in 001_production_schema.sql

-- Create index for vendor lookups (if column exists)
CREATE INDEX IF NOT EXISTS idx_proc_vendor ON procurements(vendor_id);
