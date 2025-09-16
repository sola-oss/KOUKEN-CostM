// Work Hour Management System - Drizzle Schema Definitions
import { sql } from "drizzle-orm";
import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";

// Employees table
export const employees = sqliteTable("employees", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  role: text("role").notNull(), // 'worker' | 'manager' | 'admin'
  email: text("email"),
  hourly_cost_rate: real("hourly_cost_rate").notNull(),
  is_active: integer("is_active", { mode: 'boolean' }).notNull().default(true),
  created_at: text("created_at").notNull().default(sql`datetime('now')`),
});

// Vendors table
export const vendors = sqliteTable("vendors", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  category: text("category"),
  address_pref: text("address_pref"),
  phone: text("phone"),
  email: text("email"),
  payment_terms: text("payment_terms"),
  is_active: integer("is_active", { mode: 'boolean' }).notNull().default(true),
  created_at: text("created_at").notNull().default(sql`datetime('now')`),
});

// Projects table
export const projects = sqliteTable("projects", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  customer: text("customer"),
  segment: text("segment").notNull(), // '観光' | '住宅' | 'サウナ'
  start_date: text("start_date"),
  end_date: text("end_date"),
  vendor_id: integer("vendor_id").references(() => vendors.id),
  is_active: integer("is_active", { mode: 'boolean' }).notNull().default(true),
  created_at: text("created_at").notNull().default(sql`datetime('now')`),
});

// Work Orders table
export const workOrders = sqliteTable("work_orders", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  project_id: integer("project_id").notNull().references(() => projects.id),
  operation: text("operation").notNull(),
  std_minutes: integer("std_minutes").notNull().default(0),
});

// Time Entries table
export const timeEntries = sqliteTable("time_entries", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  employee_id: integer("employee_id").notNull().references(() => employees.id),
  work_order_id: integer("work_order_id").notNull().references(() => workOrders.id),
  start_at: text("start_at"),
  end_at: text("end_at"),
  minutes: integer("minutes"),
  note: text("note"),
  status: text("status").notNull().default('draft'), // 'draft' | 'approved'
  approved_at: text("approved_at"),
  approved_by: integer("approved_by").references(() => employees.id),
  created_at: text("created_at").notNull().default(sql`datetime('now')`),
  updated_at: text("updated_at").notNull().default(sql`datetime('now')`),
});

// Approvals table (audit log)
export const approvals = sqliteTable("approvals", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  time_entry_id: integer("time_entry_id").notNull().references(() => timeEntries.id),
  approver_id: integer("approver_id").notNull().references(() => employees.id),
  approved_at: text("approved_at").notNull(),
});

// Insert schemas for validation
export const insertEmployeeSchema = createInsertSchema(employees).omit({
  id: true,
  created_at: true,
});

export const insertVendorSchema = createInsertSchema(vendors).omit({
  id: true,
  created_at: true,
});

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  created_at: true,
});

export const insertWorkOrderSchema = createInsertSchema(workOrders).omit({
  id: true,
});

export const insertTimeEntrySchema = createInsertSchema(timeEntries).omit({
  id: true,
  status: true, // Always created as 'draft'
  approved_at: true,
  approved_by: true,
  created_at: true,
  updated_at: true,
});

export const insertApprovalSchema = createInsertSchema(approvals).omit({
  id: true,
});