-- Migration 007: Vendors Master and Outsourcing Costs

-- 外注先マスタ (Vendors Master)
CREATE TABLE IF NOT EXISTS vendors_master (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  note TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_vendors_master_name ON vendors_master(name);

-- 外注費 (Outsourcing Costs)
CREATE TABLE IF NOT EXISTS outsourcing_costs (
  id INTEGER PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
  vendor_id INTEGER NOT NULL REFERENCES vendors_master(id) ON DELETE RESTRICT,
  description TEXT NOT NULL,
  amount REAL NOT NULL,
  date TEXT NOT NULL,
  note TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_outsourcing_costs_project ON outsourcing_costs(project_id);
CREATE INDEX IF NOT EXISTS idx_outsourcing_costs_vendor ON outsourcing_costs(vendor_id);
