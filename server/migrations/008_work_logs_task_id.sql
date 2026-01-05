-- Migration 008: Add task_id column to work_logs table
-- This links work results to tasks for accurate progress calculation

ALTER TABLE work_logs ADD COLUMN task_id INTEGER REFERENCES tasks(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_work_logs_task_id ON work_logs(task_id);
