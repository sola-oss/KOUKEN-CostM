// Script to create simple_time_entries and time_approvals tables
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const dbPath = path.join(process.cwd(), 'data', 'production.db');
const db = new Database(dbPath);

console.log('Creating simple time entry tables...');

try {
  // Enable foreign keys
  db.pragma('foreign_keys = ON');
  
  // Create simple_time_entries table
  const createSimpleTimeEntriesTable = db.prepare(`
    CREATE TABLE IF NOT EXISTS simple_time_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_name TEXT NOT NULL,
      sales_order_id INTEGER NOT NULL,
      start_at DATETIME,
      end_at DATETIME,
      minutes INTEGER,
      note TEXT,
      status TEXT NOT NULL DEFAULT 'draft',
      approved_at DATETIME,
      approved_by TEXT,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  createSimpleTimeEntriesTable.run();
  console.log('✅ Created simple_time_entries table');
  
  // Create time_approvals table
  const createTimeApprovalsTable = db.prepare(`
    CREATE TABLE IF NOT EXISTS time_approvals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      time_entry_id INTEGER NOT NULL REFERENCES simple_time_entries(id),
      approver TEXT NOT NULL,
      approved_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      note TEXT
    )
  `);
  
  createTimeApprovalsTable.run();
  console.log('✅ Created time_approvals table');
  
  // Check if tables were created successfully
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('simple_time_entries', 'time_approvals')").all();
  console.log('📋 Created tables:', tables.map(t => t.name));
  
} catch (error) {
  console.error('❌ Error creating tables:', error);
  process.exit(1);
} finally {
  db.close();
  console.log('✅ Database connection closed');
}