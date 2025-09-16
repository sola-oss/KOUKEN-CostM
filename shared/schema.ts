// Production Management System - Comprehensive Schema
import { sql } from "drizzle-orm";
import { sqliteTable, text, integer, real, primaryKey, index } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";

// ========== User & Auth Tables ==========
export const employees = sqliteTable("employees", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  email: text("email"),
  role: text("role").notNull(), // 'admin' | 'manager' | 'worker' | 'viewer'
  department: text("department"),
  hourly_cost_rate: real("hourly_cost_rate").notNull().default(0),
  is_active: integer("is_active", { mode: 'boolean' }).notNull().default(true),
  created_at: text("created_at").notNull().default(sql`datetime('now')`),
  updated_at: text("updated_at").notNull().default(sql`datetime('now')`),
}, (table) => ({
  emailIdx: index("idx_employees_email").on(table.email),
  roleIdx: index("idx_employees_role").on(table.role),
}));

// ========== Master Tables ==========
export const customers = sqliteTable("customers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  address: text("address"),
  phone: text("phone"),
  email: text("email"),
  contact_person: text("contact_person"),
  payment_terms: text("payment_terms"), // 'net30' | 'net60' | 'cod'
  credit_limit: real("credit_limit"),
  tags: text("tags"), // JSON array
  custom_fields: text("custom_fields"), // JSON object
  is_active: integer("is_active", { mode: 'boolean' }).notNull().default(true),
  created_at: text("created_at").notNull().default(sql`datetime('now')`),
}, (table) => ({
  codeIdx: index("idx_customers_code").on(table.code),
  nameIdx: index("idx_customers_name").on(table.name),
}));

export const vendors = sqliteTable("vendors", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  category: text("category"),
  address: text("address"),
  phone: text("phone"),
  email: text("email"),
  contact_person: text("contact_person"),
  payment_terms: text("payment_terms"),
  tags: text("tags"), // JSON array
  custom_fields: text("custom_fields"), // JSON object
  is_active: integer("is_active", { mode: 'boolean' }).notNull().default(true),
  created_at: text("created_at").notNull().default(sql`datetime('now')`),
}, (table) => ({
  codeIdx: index("idx_vendors_code").on(table.code),
  nameIdx: index("idx_vendors_name").on(table.name),
  categoryIdx: index("idx_vendors_category").on(table.category),
}));

export const items = sqliteTable("items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category"),
  uom: text("uom").notNull(), // Unit of Measure
  unit_cost: real("unit_cost").notNull().default(0),
  unit_price: real("unit_price").notNull().default(0),
  stock_min: real("stock_min").default(0),
  stock_max: real("stock_max"),
  lead_time_days: integer("lead_time_days").default(0),
  tags: text("tags"), // JSON array
  custom_fields: text("custom_fields"), // JSON object
  is_active: integer("is_active", { mode: 'boolean' }).notNull().default(true),
  created_at: text("created_at").notNull().default(sql`datetime('now')`),
}, (table) => ({
  codeIdx: index("idx_items_code").on(table.code),
  nameIdx: index("idx_items_name").on(table.name),
  categoryIdx: index("idx_items_category").on(table.category),
}));

export const work_centers = sqliteTable("work_centers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  capacity_per_day: real("capacity_per_day").notNull().default(8), // hours
  cost_per_hour: real("cost_per_hour").notNull().default(0),
  is_active: integer("is_active", { mode: 'boolean' }).notNull().default(true),
  created_at: text("created_at").notNull().default(sql`datetime('now')`),
}, (table) => ({
  codeIdx: index("idx_work_centers_code").on(table.code),
}));

// ========== Sales Management ==========
export const sales_orders = sqliteTable("sales_orders", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  order_no: text("order_no").notNull().unique(),
  customer_id: integer("customer_id").notNull().references(() => customers.id),
  order_date: text("order_date").notNull(),
  delivery_date: text("delivery_date"),
  status: text("status").notNull().default('draft'), // draft -> confirmed -> shipped -> closed
  total_amount: real("total_amount").notNull().default(0),
  notes: text("notes"),
  tags: text("tags"), // JSON array
  custom_fields: text("custom_fields"), // JSON object
  confirmed_at: text("confirmed_at"),
  confirmed_by: integer("confirmed_by").references(() => employees.id),
  created_at: text("created_at").notNull().default(sql`datetime('now')`),
  updated_at: text("updated_at").notNull().default(sql`datetime('now')`),
}, (table) => ({
  orderNoIdx: index("idx_sales_orders_no").on(table.order_no),
  customerIdx: index("idx_sales_orders_customer").on(table.customer_id),
  statusIdx: index("idx_sales_orders_status").on(table.status),
  orderDateIdx: index("idx_sales_orders_date").on(table.order_date),
}));

export const sales_order_lines = sqliteTable("sales_order_lines", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sales_order_id: integer("sales_order_id").notNull().references(() => sales_orders.id),
  line_no: integer("line_no").notNull(),
  item_id: integer("item_id").notNull().references(() => items.id),
  quantity: real("quantity").notNull(),
  unit_price: real("unit_price").notNull(),
  amount: real("amount").notNull(),
  delivery_date: text("delivery_date"),
  notes: text("notes"),
}, (table) => ({
  orderIdx: index("idx_so_lines_order").on(table.sales_order_id),
  itemIdx: index("idx_so_lines_item").on(table.item_id),
}));

// ========== Production Management ==========
export const production_orders = sqliteTable("production_orders", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  production_no: text("production_no").notNull().unique(),
  sales_order_id: integer("sales_order_id").references(() => sales_orders.id),
  item_id: integer("item_id").notNull().references(() => items.id),
  quantity: real("quantity").notNull(),
  start_date: text("start_date"),
  end_date: text("end_date"),
  status: text("status").notNull().default('draft'), // draft -> planned -> released -> in_progress -> completed
  priority: integer("priority").default(0),
  notes: text("notes"),
  confirmed_at: text("confirmed_at"),
  confirmed_by: integer("confirmed_by").references(() => employees.id),
  created_at: text("created_at").notNull().default(sql`datetime('now')`),
  updated_at: text("updated_at").notNull().default(sql`datetime('now')`),
}, (table) => ({
  productionNoIdx: index("idx_production_no").on(table.production_no),
  statusIdx: index("idx_production_status").on(table.status),
  salesOrderIdx: index("idx_production_so").on(table.sales_order_id),
  startDateIdx: index("idx_production_start").on(table.start_date),
}));

export const work_orders = sqliteTable("work_orders", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  work_order_no: text("work_order_no").notNull().unique(),
  production_order_id: integer("production_order_id").notNull().references(() => production_orders.id),
  work_center_id: integer("work_center_id").notNull().references(() => work_centers.id),
  operation: text("operation").notNull(),
  sequence: integer("sequence").notNull(),
  planned_hours: real("planned_hours").notNull(),
  actual_hours: real("actual_hours").default(0),
  start_date: text("start_date"),
  end_date: text("end_date"),
  status: text("status").notNull().default('pending'), // pending -> released -> in_progress -> completed
  created_at: text("created_at").notNull().default(sql`datetime('now')`),
}, (table) => ({
  workOrderNoIdx: index("idx_work_order_no").on(table.work_order_no),
  productionIdx: index("idx_wo_production").on(table.production_order_id),
  statusIdx: index("idx_wo_status").on(table.status),
}));

export const work_instructions = sqliteTable("work_instructions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  work_order_id: integer("work_order_id").notNull().references(() => work_orders.id),
  instruction_no: text("instruction_no").notNull().unique(),
  employee_id: integer("employee_id").references(() => employees.id),
  description: text("description").notNull(),
  scheduled_date: text("scheduled_date"),
  status: text("status").notNull().default('pending'), // pending -> confirmed -> completed
  confirmed_at: text("confirmed_at"),
  confirmed_by: integer("confirmed_by").references(() => employees.id),
  created_at: text("created_at").notNull().default(sql`datetime('now')`),
}, (table) => ({
  instructionNoIdx: index("idx_instruction_no").on(table.instruction_no),
  workOrderIdx: index("idx_wi_work_order").on(table.work_order_id),
  employeeIdx: index("idx_wi_employee").on(table.employee_id),
}));

// ========== Purchase Management ==========
export const purchase_orders = sqliteTable("purchase_orders", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  po_no: text("po_no").notNull().unique(),
  vendor_id: integer("vendor_id").notNull().references(() => vendors.id),
  order_date: text("order_date").notNull(),
  delivery_date: text("delivery_date"),
  status: text("status").notNull().default('draft'), // draft -> confirmed -> received -> closed
  total_amount: real("total_amount").notNull().default(0),
  notes: text("notes"),
  confirmed_at: text("confirmed_at"),
  confirmed_by: integer("confirmed_by").references(() => employees.id),
  created_at: text("created_at").notNull().default(sql`datetime('now')`),
  updated_at: text("updated_at").notNull().default(sql`datetime('now')`),
}, (table) => ({
  poNoIdx: index("idx_po_no").on(table.po_no),
  vendorIdx: index("idx_po_vendor").on(table.vendor_id),
  statusIdx: index("idx_po_status").on(table.status),
  orderDateIdx: index("idx_po_date").on(table.order_date),
}));

export const purchase_order_lines = sqliteTable("purchase_order_lines", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  purchase_order_id: integer("purchase_order_id").notNull().references(() => purchase_orders.id),
  line_no: integer("line_no").notNull(),
  item_id: integer("item_id").notNull().references(() => items.id),
  quantity: real("quantity").notNull(),
  unit_price: real("unit_price").notNull(),
  amount: real("amount").notNull(),
  received_quantity: real("received_quantity").default(0),
  notes: text("notes"),
}, (table) => ({
  poIdx: index("idx_po_lines_order").on(table.purchase_order_id),
  itemIdx: index("idx_po_lines_item").on(table.item_id),
}));

export const receipts = sqliteTable("receipts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  receipt_no: text("receipt_no").notNull().unique(),
  purchase_order_id: integer("purchase_order_id").notNull().references(() => purchase_orders.id),
  receipt_date: text("receipt_date").notNull(),
  status: text("status").notNull().default('pending'), // pending -> confirmed
  notes: text("notes"),
  confirmed_at: text("confirmed_at"),
  confirmed_by: integer("confirmed_by").references(() => employees.id),
  created_at: text("created_at").notNull().default(sql`datetime('now')`),
}, (table) => ({
  receiptNoIdx: index("idx_receipt_no").on(table.receipt_no),
  poIdx: index("idx_receipt_po").on(table.purchase_order_id),
}));

// ========== Time Management ==========
export const time_entries = sqliteTable("time_entries", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  employee_id: integer("employee_id").notNull().references(() => employees.id),
  work_order_id: integer("work_order_id").notNull().references(() => work_orders.id),
  entry_date: text("entry_date").notNull(),
  start_time: text("start_time"),
  end_time: text("end_time"),
  hours: real("hours").notNull(),
  description: text("description"),
  status: text("status").notNull().default('draft'), // draft -> submitted -> approved -> rejected
  approved_at: text("approved_at"),
  approved_by: integer("approved_by").references(() => employees.id),
  created_at: text("created_at").notNull().default(sql`datetime('now')`),
  updated_at: text("updated_at").notNull().default(sql`datetime('now')`),
}, (table) => ({
  employeeIdx: index("idx_time_employee").on(table.employee_id),
  workOrderIdx: index("idx_time_work_order").on(table.work_order_id),
  entryDateIdx: index("idx_time_date").on(table.entry_date),
  statusIdx: index("idx_time_status").on(table.status),
}));

export const external_time_entries = sqliteTable("external_time_entries", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  vendor_id: integer("vendor_id").notNull().references(() => vendors.id),
  work_order_id: integer("work_order_id").notNull().references(() => work_orders.id),
  entry_date: text("entry_date").notNull(),
  hours: real("hours").notNull(),
  amount: real("amount").notNull(),
  description: text("description"),
  status: text("status").notNull().default('draft'), // draft -> approved
  approved_at: text("approved_at"),
  approved_by: integer("approved_by").references(() => employees.id),
  created_at: text("created_at").notNull().default(sql`datetime('now')`),
}, (table) => ({
  vendorIdx: index("idx_ext_time_vendor").on(table.vendor_id),
  workOrderIdx: index("idx_ext_time_wo").on(table.work_order_id),
  entryDateIdx: index("idx_ext_time_date").on(table.entry_date),
}));

// ========== Shipping & Invoicing ==========
export const shipments = sqliteTable("shipments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  shipment_no: text("shipment_no").notNull().unique(),
  sales_order_id: integer("sales_order_id").notNull().references(() => sales_orders.id),
  ship_date: text("ship_date").notNull(),
  status: text("status").notNull().default('pending'), // pending -> confirmed -> delivered
  tracking_no: text("tracking_no"),
  notes: text("notes"),
  confirmed_at: text("confirmed_at"),
  confirmed_by: integer("confirmed_by").references(() => employees.id),
  created_at: text("created_at").notNull().default(sql`datetime('now')`),
}, (table) => ({
  shipmentNoIdx: index("idx_shipment_no").on(table.shipment_no),
  salesOrderIdx: index("idx_shipment_so").on(table.sales_order_id),
  shipDateIdx: index("idx_shipment_date").on(table.ship_date),
}));

export const shipment_lines = sqliteTable("shipment_lines", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  shipment_id: integer("shipment_id").notNull().references(() => shipments.id),
  sales_order_line_id: integer("sales_order_line_id").notNull().references(() => sales_order_lines.id),
  quantity: real("quantity").notNull(),
}, (table) => ({
  shipmentIdx: index("idx_ship_lines_shipment").on(table.shipment_id),
}));

export const invoices = sqliteTable("invoices", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  invoice_no: text("invoice_no").notNull().unique(),
  customer_id: integer("customer_id").notNull().references(() => customers.id),
  invoice_date: text("invoice_date").notNull(),
  due_date: text("due_date"),
  status: text("status").notNull().default('draft'), // draft -> sent -> paid -> cancelled
  total_amount: real("total_amount").notNull().default(0),
  paid_amount: real("paid_amount").default(0),
  notes: text("notes"),
  created_at: text("created_at").notNull().default(sql`datetime('now')`),
  updated_at: text("updated_at").notNull().default(sql`datetime('now')`),
}, (table) => ({
  invoiceNoIdx: index("idx_invoice_no").on(table.invoice_no),
  customerIdx: index("idx_invoice_customer").on(table.customer_id),
  invoiceDateIdx: index("idx_invoice_date").on(table.invoice_date),
  statusIdx: index("idx_invoice_status").on(table.status),
}));

export const invoice_lines = sqliteTable("invoice_lines", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  invoice_id: integer("invoice_id").notNull().references(() => invoices.id),
  line_no: integer("line_no").notNull(),
  description: text("description").notNull(),
  quantity: real("quantity").notNull(),
  unit_price: real("unit_price").notNull(),
  amount: real("amount").notNull(),
  sales_order_line_id: integer("sales_order_line_id").references(() => sales_order_lines.id),
}, (table) => ({
  invoiceIdx: index("idx_inv_lines_invoice").on(table.invoice_id),
}));

// ========== Calendar & Support Tables ==========
export const calendars = sqliteTable("calendars", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  date: text("date").notNull().unique(),
  is_working_day: integer("is_working_day", { mode: 'boolean' }).notNull().default(true),
  capacity_adjustment: real("capacity_adjustment").default(1.0), // multiplier for capacity
  notes: text("notes"),
}, (table) => ({
  dateIdx: index("idx_calendar_date").on(table.date),
}));

export const attachments = sqliteTable("attachments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  entity_type: text("entity_type").notNull(), // 'sales_order', 'production_order', etc.
  entity_id: integer("entity_id").notNull(),
  file_name: text("file_name").notNull(),
  file_path: text("file_path").notNull(),
  file_size: integer("file_size"),
  mime_type: text("mime_type"),
  uploaded_by: integer("uploaded_by").notNull().references(() => employees.id),
  uploaded_at: text("uploaded_at").notNull().default(sql`datetime('now')`),
}, (table) => ({
  entityIdx: index("idx_attach_entity").on(table.entity_type, table.entity_id),
}));

export const comments = sqliteTable("comments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  entity_type: text("entity_type").notNull(),
  entity_id: integer("entity_id").notNull(),
  comment: text("comment").notNull(),
  created_by: integer("created_by").notNull().references(() => employees.id),
  created_at: text("created_at").notNull().default(sql`datetime('now')`),
}, (table) => ({
  entityIdx: index("idx_comment_entity").on(table.entity_type, table.entity_id),
}));

export const activity_logs = sqliteTable("activity_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  entity_type: text("entity_type").notNull(),
  entity_id: integer("entity_id").notNull(),
  action: text("action").notNull(), // 'created', 'updated', 'confirmed', 'approved', 'cancelled', etc.
  old_value: text("old_value"), // JSON
  new_value: text("new_value"), // JSON
  user_id: integer("user_id").notNull().references(() => employees.id),
  ip_address: text("ip_address"),
  user_agent: text("user_agent"),
  created_at: text("created_at").notNull().default(sql`datetime('now')`),
}, (table) => ({
  entityIdx: index("idx_log_entity").on(table.entity_type, table.entity_id),
  actionIdx: index("idx_log_action").on(table.action),
  userIdx: index("idx_log_user").on(table.user_id),
  createdAtIdx: index("idx_log_created").on(table.created_at),
}));

// ========== Insert Schemas for Validation ==========
export const insertEmployeeSchema = createInsertSchema(employees).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export const insertCustomerSchema = createInsertSchema(customers).omit({
  id: true,
  created_at: true,
});

export const insertVendorSchema = createInsertSchema(vendors).omit({
  id: true,
  created_at: true,
});

export const insertItemSchema = createInsertSchema(items).omit({
  id: true,
  created_at: true,
});

export const insertSalesOrderSchema = createInsertSchema(sales_orders).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export const insertProductionOrderSchema = createInsertSchema(production_orders).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export const insertWorkOrderSchema = createInsertSchema(work_orders).omit({
  id: true,
  created_at: true,
});

export const insertTimeEntrySchema = createInsertSchema(time_entries).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export const insertPurchaseOrderSchema = createInsertSchema(purchase_orders).omit({
  id: true,
  created_at: true,
  updated_at: true,
});