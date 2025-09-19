#!/usr/bin/env tsx
// Database Migration Script for Production Management System
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dbPath = process.env.DB_PATH || path.join(process.cwd(), 'data', 'production.db');
const dbDir = path.dirname(dbPath);

// Create data directory if it doesn't exist
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
  console.log(`✅ Created directory: ${dbDir}`);
}

console.log(`📦 Running migrations on: ${dbPath}`);

const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');

try {
  db.exec(`
    -- ========== Employees Table ==========
    CREATE TABLE IF NOT EXISTS employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT,
      role TEXT NOT NULL CHECK(role IN ('admin', 'manager', 'worker', 'viewer')),
      department TEXT,
      hourly_cost_rate REAL NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_employees_email ON employees(email);
    CREATE INDEX IF NOT EXISTS idx_employees_role ON employees(role);

    -- ========== Customers Table ==========
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      address TEXT,
      phone TEXT,
      email TEXT,
      contact_person TEXT,
      payment_terms TEXT,
      credit_limit REAL,
      tags TEXT, -- JSON array
      custom_fields TEXT, -- JSON object
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_customers_code ON customers(code);
    CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);

    -- ========== Vendors Table ==========
    CREATE TABLE IF NOT EXISTS vendors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      category TEXT,
      address TEXT,
      phone TEXT,
      email TEXT,
      contact_person TEXT,
      payment_terms TEXT,
      tags TEXT, -- JSON array
      custom_fields TEXT, -- JSON object
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_vendors_code ON vendors(code);
    CREATE INDEX IF NOT EXISTS idx_vendors_name ON vendors(name);
    CREATE INDEX IF NOT EXISTS idx_vendors_category ON vendors(category);

    -- ========== Items Table ==========
    CREATE TABLE IF NOT EXISTS items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      description TEXT,
      category TEXT,
      uom TEXT NOT NULL,
      unit_cost REAL NOT NULL DEFAULT 0,
      unit_price REAL NOT NULL DEFAULT 0,
      stock_min REAL DEFAULT 0,
      stock_max REAL,
      lead_time_days INTEGER DEFAULT 0,
      tags TEXT, -- JSON array
      custom_fields TEXT, -- JSON object
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_items_code ON items(code);
    CREATE INDEX IF NOT EXISTS idx_items_name ON items(name);
    CREATE INDEX IF NOT EXISTS idx_items_category ON items(category);

    -- ========== Work Centers Table ==========
    CREATE TABLE IF NOT EXISTS work_centers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      description TEXT,
      capacity_per_day REAL NOT NULL DEFAULT 8,
      cost_per_hour REAL NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_work_centers_code ON work_centers(code);

    -- ========== Sequences Table ==========
    CREATE TABLE IF NOT EXISTS sequences (
      key TEXT PRIMARY KEY,
      value INTEGER NOT NULL
    );

    -- ========== Sales Orders Table ==========
    CREATE TABLE IF NOT EXISTS sales_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_no TEXT UNIQUE, -- Can be null until confirmed
      customer_id INTEGER NOT NULL REFERENCES customers(id),
      order_date TEXT NOT NULL,
      delivery_date TEXT,
      status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'confirmed', 'shipped', 'closed')),
      total_amount REAL NOT NULL DEFAULT 0,
      notes TEXT,
      tags TEXT, -- JSON array
      custom_fields TEXT, -- JSON object
      confirmed_at TEXT,
      confirmed_by INTEGER REFERENCES employees(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_sales_orders_no ON sales_orders(order_no);
    CREATE INDEX IF NOT EXISTS idx_sales_orders_customer ON sales_orders(customer_id);
    CREATE INDEX IF NOT EXISTS idx_sales_orders_status ON sales_orders(status);
    CREATE INDEX IF NOT EXISTS idx_sales_orders_date ON sales_orders(order_date);

    -- ========== Sales Order Lines Table ==========
    CREATE TABLE IF NOT EXISTS sales_order_lines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sales_order_id INTEGER NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
      line_no INTEGER NOT NULL,
      item_id INTEGER NOT NULL REFERENCES items(id),
      quantity REAL NOT NULL,
      unit_price REAL NOT NULL,
      amount REAL NOT NULL,
      delivery_date TEXT,
      notes TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_so_lines_order ON sales_order_lines(sales_order_id);
    CREATE INDEX IF NOT EXISTS idx_so_lines_item ON sales_order_lines(item_id);

    -- ========== Production Orders Table ==========
    CREATE TABLE IF NOT EXISTS production_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      production_no TEXT NOT NULL UNIQUE,
      sales_order_id INTEGER REFERENCES sales_orders(id),
      item_id INTEGER NOT NULL REFERENCES items(id),
      quantity REAL NOT NULL,
      start_date TEXT,
      end_date TEXT,
      status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'planned', 'released', 'in_progress', 'completed')),
      priority INTEGER DEFAULT 0,
      notes TEXT,
      confirmed_at TEXT,
      confirmed_by INTEGER REFERENCES employees(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_production_no ON production_orders(production_no);
    CREATE INDEX IF NOT EXISTS idx_production_status ON production_orders(status);
    CREATE INDEX IF NOT EXISTS idx_production_so ON production_orders(sales_order_id);
    CREATE INDEX IF NOT EXISTS idx_production_start ON production_orders(start_date);

    -- ========== Work Orders Table ==========
    CREATE TABLE IF NOT EXISTS work_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      work_order_no TEXT NOT NULL UNIQUE,
      production_order_id INTEGER NOT NULL REFERENCES production_orders(id) ON DELETE CASCADE,
      work_center_id INTEGER NOT NULL REFERENCES work_centers(id),
      operation TEXT NOT NULL,
      sequence INTEGER NOT NULL,
      planned_hours REAL NOT NULL,
      actual_hours REAL DEFAULT 0,
      start_date TEXT,
      end_date TEXT,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'released', 'in_progress', 'completed')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_work_order_no ON work_orders(work_order_no);
    CREATE INDEX IF NOT EXISTS idx_wo_production ON work_orders(production_order_id);
    CREATE INDEX IF NOT EXISTS idx_wo_status ON work_orders(status);

    -- ========== Work Instructions Table ==========
    CREATE TABLE IF NOT EXISTS work_instructions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      work_order_id INTEGER NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
      instruction_no TEXT NOT NULL UNIQUE,
      employee_id INTEGER REFERENCES employees(id),
      description TEXT NOT NULL,
      scheduled_date TEXT,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'confirmed', 'completed')),
      confirmed_at TEXT,
      confirmed_by INTEGER REFERENCES employees(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_instruction_no ON work_instructions(instruction_no);
    CREATE INDEX IF NOT EXISTS idx_wi_work_order ON work_instructions(work_order_id);
    CREATE INDEX IF NOT EXISTS idx_wi_employee ON work_instructions(employee_id);

    -- ========== Purchase Orders Table ==========
    CREATE TABLE IF NOT EXISTS purchase_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      po_no TEXT NOT NULL UNIQUE,
      vendor_id INTEGER NOT NULL REFERENCES vendors(id),
      order_date TEXT NOT NULL,
      delivery_date TEXT,
      status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'confirmed', 'received', 'closed')),
      total_amount REAL NOT NULL DEFAULT 0,
      notes TEXT,
      confirmed_at TEXT,
      confirmed_by INTEGER REFERENCES employees(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_po_no ON purchase_orders(po_no);
    CREATE INDEX IF NOT EXISTS idx_po_vendor ON purchase_orders(vendor_id);
    CREATE INDEX IF NOT EXISTS idx_po_status ON purchase_orders(status);
    CREATE INDEX IF NOT EXISTS idx_po_date ON purchase_orders(order_date);

    -- ========== Purchase Order Lines Table ==========
    CREATE TABLE IF NOT EXISTS purchase_order_lines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      purchase_order_id INTEGER NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
      line_no INTEGER NOT NULL,
      item_id INTEGER NOT NULL REFERENCES items(id),
      quantity REAL NOT NULL,
      unit_price REAL NOT NULL,
      amount REAL NOT NULL,
      received_quantity REAL DEFAULT 0,
      notes TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_po_lines_order ON purchase_order_lines(purchase_order_id);
    CREATE INDEX IF NOT EXISTS idx_po_lines_item ON purchase_order_lines(item_id);

    -- ========== Receipts Table ==========
    CREATE TABLE IF NOT EXISTS receipts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      receipt_no TEXT NOT NULL UNIQUE,
      purchase_order_id INTEGER NOT NULL REFERENCES purchase_orders(id),
      receipt_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'confirmed')),
      notes TEXT,
      confirmed_at TEXT,
      confirmed_by INTEGER REFERENCES employees(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_receipt_no ON receipts(receipt_no);
    CREATE INDEX IF NOT EXISTS idx_receipt_po ON receipts(purchase_order_id);

    -- ========== Time Entries Table ==========
    CREATE TABLE IF NOT EXISTS time_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL REFERENCES employees(id),
      work_order_id INTEGER NOT NULL REFERENCES work_orders(id),
      entry_date TEXT NOT NULL,
      start_time TEXT,
      end_time TEXT,
      hours REAL NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'submitted', 'approved', 'rejected')),
      approved_at TEXT,
      approved_by INTEGER REFERENCES employees(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_time_employee ON time_entries(employee_id);
    CREATE INDEX IF NOT EXISTS idx_time_work_order ON time_entries(work_order_id);
    CREATE INDEX IF NOT EXISTS idx_time_date ON time_entries(entry_date);
    CREATE INDEX IF NOT EXISTS idx_time_status ON time_entries(status);

    -- ========== External Time Entries Table ==========
    CREATE TABLE IF NOT EXISTS external_time_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vendor_id INTEGER NOT NULL REFERENCES vendors(id),
      work_order_id INTEGER NOT NULL REFERENCES work_orders(id),
      entry_date TEXT NOT NULL,
      hours REAL NOT NULL,
      amount REAL NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'approved')),
      approved_at TEXT,
      approved_by INTEGER REFERENCES employees(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_ext_time_vendor ON external_time_entries(vendor_id);
    CREATE INDEX IF NOT EXISTS idx_ext_time_wo ON external_time_entries(work_order_id);
    CREATE INDEX IF NOT EXISTS idx_ext_time_date ON external_time_entries(entry_date);

    -- ========== Shipments Table ==========
    CREATE TABLE IF NOT EXISTS shipments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      shipment_no TEXT NOT NULL UNIQUE,
      sales_order_id INTEGER NOT NULL REFERENCES sales_orders(id),
      ship_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'confirmed', 'delivered')),
      tracking_no TEXT,
      notes TEXT,
      confirmed_at TEXT,
      confirmed_by INTEGER REFERENCES employees(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_shipment_no ON shipments(shipment_no);
    CREATE INDEX IF NOT EXISTS idx_shipment_so ON shipments(sales_order_id);
    CREATE INDEX IF NOT EXISTS idx_shipment_date ON shipments(ship_date);

    -- ========== Shipment Lines Table ==========
    CREATE TABLE IF NOT EXISTS shipment_lines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      shipment_id INTEGER NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
      sales_order_line_id INTEGER NOT NULL REFERENCES sales_order_lines(id),
      quantity REAL NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_ship_lines_shipment ON shipment_lines(shipment_id);

    -- ========== Invoices Table ==========
    CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_no TEXT NOT NULL UNIQUE,
      customer_id INTEGER NOT NULL REFERENCES customers(id),
      invoice_date TEXT NOT NULL,
      due_date TEXT,
      status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'sent', 'paid', 'cancelled')),
      total_amount REAL NOT NULL DEFAULT 0,
      paid_amount REAL DEFAULT 0,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_invoice_no ON invoices(invoice_no);
    CREATE INDEX IF NOT EXISTS idx_invoice_customer ON invoices(customer_id);
    CREATE INDEX IF NOT EXISTS idx_invoice_date ON invoices(invoice_date);
    CREATE INDEX IF NOT EXISTS idx_invoice_status ON invoices(status);

    -- ========== Invoice Lines Table ==========
    CREATE TABLE IF NOT EXISTS invoice_lines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
      line_no INTEGER NOT NULL,
      description TEXT NOT NULL,
      quantity REAL NOT NULL,
      unit_price REAL NOT NULL,
      amount REAL NOT NULL,
      sales_order_line_id INTEGER REFERENCES sales_order_lines(id)
    );
    CREATE INDEX IF NOT EXISTS idx_inv_lines_invoice ON invoice_lines(invoice_id);

    -- ========== Calendars Table ==========
    CREATE TABLE IF NOT EXISTS calendars (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL UNIQUE,
      is_working_day INTEGER NOT NULL DEFAULT 1,
      capacity_adjustment REAL DEFAULT 1.0,
      notes TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_calendar_date ON calendars(date);

    -- ========== Attachments Table ==========
    CREATE TABLE IF NOT EXISTS attachments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entity_type TEXT NOT NULL,
      entity_id INTEGER NOT NULL,
      file_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_size INTEGER,
      mime_type TEXT,
      uploaded_by INTEGER NOT NULL REFERENCES employees(id),
      uploaded_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_attach_entity ON attachments(entity_type, entity_id);

    -- ========== Comments Table ==========
    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entity_type TEXT NOT NULL,
      entity_id INTEGER NOT NULL,
      comment TEXT NOT NULL,
      created_by INTEGER NOT NULL REFERENCES employees(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_comment_entity ON comments(entity_type, entity_id);

    -- ========== Activity Logs Table ==========
    CREATE TABLE IF NOT EXISTS activity_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entity_type TEXT NOT NULL,
      entity_id INTEGER NOT NULL,
      action TEXT NOT NULL,
      old_value TEXT, -- JSON
      new_value TEXT, -- JSON
      user_id INTEGER NOT NULL REFERENCES employees(id),
      ip_address TEXT,
      user_agent TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_log_entity ON activity_logs(entity_type, entity_id);
    CREATE INDEX IF NOT EXISTS idx_log_action ON activity_logs(action);
    CREATE INDEX IF NOT EXISTS idx_log_user ON activity_logs(user_id);
    CREATE INDEX IF NOT EXISTS idx_log_created ON activity_logs(created_at);
  `);

  console.log('✅ All tables and indexes created successfully');
  
  // Verify tables
  const tables = db.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' 
    ORDER BY name
  `).all();
  
  console.log('\n📊 Tables created:');
  tables.forEach(t => console.log(`  - ${t.name}`));
  
  console.log('\n✅ Migration completed successfully!');
} catch (error) {
  console.error('❌ Migration failed:', error);
  process.exit(1);
} finally {
  db.close();
}