import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// プロジェクト管理
export const projects = pgTable("projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  status: text("status").notNull().default("planning"), // planning, active, completed, on_hold
  estimatedBudget: decimal("estimated_budget", { precision: 12, scale: 2 }),
  estimatedHours: decimal("estimated_hours", { precision: 8, scale: 2 }),
  clientName: text("client_name"),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  createdAt: timestamp("created_at").defaultNow(),
});

// 作業者管理
export const workers = pgTable("workers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  hourlyRate: decimal("hourly_rate", { precision: 8, scale: 2 }).notNull(),
  role: text("role"), // engineer, operator, supervisor, etc.
  department: text("department"),
  isActive: text("is_active").notNull().default("true"),
  createdAt: timestamp("created_at").defaultNow(),
});

// 工数管理
export const workHours = pgTable("work_hours", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id),
  workerId: varchar("worker_id").notNull().references(() => workers.id),
  workDate: timestamp("work_date").notNull(),
  startTime: timestamp("start_time"),
  endTime: timestamp("end_time"),
  hoursWorked: decimal("hours_worked", { precision: 8, scale: 2 }).notNull(),
  description: text("description"),
  taskType: text("task_type"), // design, manufacturing, assembly, testing, etc.
  createdAt: timestamp("created_at").defaultNow(),
});

// 材料費管理
export const materials = pgTable("materials", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id),
  name: text("name").notNull(),
  quantity: decimal("quantity", { precision: 10, scale: 3 }).notNull(),
  unit: text("unit").notNull(), // kg, pieces, meters, etc.
  unitCost: decimal("unit_cost", { precision: 10, scale: 2 }).notNull(),
  totalCost: decimal("total_cost", { precision: 12, scale: 2 }).notNull(),
  supplier: text("supplier"),
  purchaseDate: timestamp("purchase_date"),
  createdAt: timestamp("created_at").defaultNow(),
});

// その他経費
export const expenses = pgTable("expenses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id),
  category: text("category").notNull(), // equipment, utilities, transport, etc.
  description: text("description").notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  date: timestamp("date").notNull(),
  receipt: text("receipt"), // file path for receipt uploads
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert schemas
export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
});

export const insertWorkerSchema = createInsertSchema(workers).omit({
  id: true,
  createdAt: true,
});

export const insertWorkHoursSchema = createInsertSchema(workHours).omit({
  id: true,
  createdAt: true,
});

export const insertMaterialSchema = createInsertSchema(materials).omit({
  id: true,
  createdAt: true,
});

export const insertExpenseSchema = createInsertSchema(expenses).omit({
  id: true,
  createdAt: true,
});

// Types
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projects.$inferSelect;

export type InsertWorker = z.infer<typeof insertWorkerSchema>;
export type Worker = typeof workers.$inferSelect;

export type InsertWorkHours = z.infer<typeof insertWorkHoursSchema>;
export type WorkHours = typeof workHours.$inferSelect;

export type InsertMaterial = z.infer<typeof insertMaterialSchema>;
export type Material = typeof materials.$inferSelect;

export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type Expense = typeof expenses.$inferSelect;
