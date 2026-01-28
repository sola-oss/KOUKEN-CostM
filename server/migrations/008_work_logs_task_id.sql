-- Migration 008: Add task_id column to work_logs table
-- This links work results to tasks for accurate progress calculation
-- Note: task_id column is now included in 001_production_schema.sql base schema

-- Create index for faster lookups (if column exists)
CREATE INDEX IF NOT EXISTS idx_work_logs_task_id ON work_logs(task_id);
