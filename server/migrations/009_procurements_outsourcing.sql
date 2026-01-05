-- Migration 009: Add outsourcing cost fields to procurements table
-- This consolidates outsourcing cost management into procurement

-- Add vendor_id for linking to vendors_master
ALTER TABLE procurements ADD COLUMN vendor_id INTEGER REFERENCES vendors_master(id) ON DELETE SET NULL;

-- Add total_amount for computed/entered cost
ALTER TABLE procurements ADD COLUMN total_amount REAL;

-- Add is_approved flag for cost approval workflow
ALTER TABLE procurements ADD COLUMN is_approved INTEGER DEFAULT 0;

-- Create index for vendor lookups
CREATE INDEX IF NOT EXISTS idx_proc_vendor ON procurements(vendor_id);
