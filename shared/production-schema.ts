// Production Management MVP - SQLite Schema
import { sql } from "drizzle-orm";
import { sqliteTable, integer, text, real, index } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ========== Production Management Tables ==========

// 受注 (Orders)
export const orders = sqliteTable("orders", {
  order_id: integer("order_id").primaryKey(),    // 受注番号（自動採番）
  product_name: text("product_name").notNull(),  // 製品名
  qty: real("qty").notNull(),                    // 数量
  start_date: text("start_date").notNull(),      // 開始予定日（UTC ISO）
  due_date: text("due_date").notNull(),          // 納期（UTC ISO）
  sales: real("sales").notNull(),               // 売上（見込み含む）
  estimated_material_cost: real("estimated_material_cost").notNull(), // 見込み材料費（概算）
  std_time_per_unit: real("std_time_per_unit").notNull(),   // 標準作業時間[h/個]
  status: text("status", { enum: ['pending', 'in_progress', 'completed'] }).notNull().default('pending'), // ステータス
  customer_name: text("customer_name"),          // 顧客名（任意）
  created_at: text("created_at").notNull(),
  updated_at: text("updated_at").notNull(),
}, (table) => ({
  dueDateIdx: index("idx_orders_due").on(table.due_date),
  statusIdx: index("idx_orders_status").on(table.status),
  startDateIdx: index("idx_orders_start").on(table.start_date),
}));

// 手配 (Procurements) - 購買(purchase) と 製造(manufacture) を統合
export const procurements = sqliteTable("procurements", {
  id: integer("id").primaryKey(),
  order_id: integer("order_id").notNull().references(() => orders.order_id, { onDelete: "cascade" }),
  kind: text("kind", { enum: ['purchase', 'manufacture'] }).notNull(),
  item_name: text("item_name"),
  qty: real("qty"),
  eta: text("eta"),                              // 予定日(UTC)
  status: text("status"),                        // 'planned'|'ordered'|'received'|'done' など
  vendor: text("vendor"),                        // kind=purchase 用（任意）
  unit_price: real("unit_price"),                // kind=purchase 用（入荷時に金額算出）
  received_at: text("received_at"),              // kind=purchase 用（UTC）
  std_time_per_unit: real("std_time_per_unit"),  // kind=manufacture 用 [h/個]
  act_time_per_unit: real("act_time_per_unit"),  // kind=manufacture 用 [h/個]
  worker: text("worker"),                        // kind=manufacture 用（任意）
  completed_at: text("completed_at"),            // kind=manufacture 用（UTC）
  created_at: text("created_at").notNull(),
}, (table) => ({
  orderKindStatusIdx: index("idx_proc_orders").on(table.order_id, table.kind, table.status),
}));

// 工数入力 (Workers Log) - スタッフ用の簡易打刻
export const workers_log = sqliteTable("workers_log", {
  id: integer("id").primaryKey(),
  order_id: integer("order_id").notNull().references(() => orders.order_id, { onDelete: "cascade" }),
  qty: real("qty").notNull(),
  act_time_per_unit: real("act_time_per_unit").notNull(), // [h/個]
  worker: text("worker").notNull(),
  date: text("date").notNull(),                  // 作業日(UTC)
  created_at: text("created_at").notNull(),
}, (table) => ({
  orderDateIdx: index("idx_wlog_order").on(table.order_id, table.date),
}));

// 作業計画 (Tasks) - 作業分解と担当者決定
export const tasks = sqliteTable("tasks", {
  id: integer("id").primaryKey(),
  order_id: integer("order_id").notNull().references(() => orders.order_id, { onDelete: "cascade" }),
  task_name: text("task_name").notNull(),        // 作業名（例：組立/塗装/検査）
  assignee: text("assignee").notNull(),          // 担当者（必須 - ビジネスルール上必要）
  planned_start: text("planned_start").notNull(), // 予定開始日(UTC)
  planned_end: text("planned_end").notNull(),    // 予定終了日(UTC)
  std_time_per_unit: real("std_time_per_unit").notNull(), // 標準工数[h/個]
  qty: real("qty").notNull(),                    // 数量
  status: text("status", { enum: ['not_started', 'in_progress', 'completed'] }).notNull().default('not_started'), // ステータス
  created_at: text("created_at").notNull(),
}, (table) => ({
  orderTaskIdx: index("idx_tasks_order").on(table.order_id),
  statusIdx: index("idx_tasks_status").on(table.status),
  plannedStartIdx: index("idx_tasks_planned_start").on(table.planned_start),
}));

// 作業実績ログ (Work Logs) - PC用の詳細な作業実績入力
export const work_logs = sqliteTable("work_logs", {
  id: integer("id").primaryKey(),
  date: text("date").notNull(),                  // 作業日(UTC ISO)
  order_id: integer("order_id").notNull().references(() => orders.order_id, { onDelete: "cascade" }),
  task_name: text("task_name").notNull(),        // 作業名
  worker: text("worker").notNull(),              // 作業者
  start_time: text("start_time"),                // 開始時刻 (HH:mm format)
  end_time: text("end_time"),                    // 終了時刻 (HH:mm format)
  duration_hours: real("duration_hours").notNull(), // 実績時間[h]
  quantity: real("quantity").notNull().default(0), // 数量
  memo: text("memo"),                            // メモ
  status: text("status").notNull().default('下書き'), // ステータス
  created_at: text("created_at").notNull(),
}, (table) => ({
  dateWorkerIdx: index("idx_work_logs_date_worker").on(table.date, table.worker),
  orderIdx: index("idx_work_logs_order").on(table.order_id),
}));

// ========== Insert Schemas ==========
export const insertOrderSchema = createInsertSchema(orders).omit({
  created_at: true,
  updated_at: true,
}).extend({
  order_id: z.number().optional(),
  start_date: z.string().min(1, "開始予定日は必須です"),
  due_date: z.string().min(1, "納期は必須です"),
  status: z.enum(['pending', 'in_progress', 'completed']).default('pending'),
  customer_name: z.string().optional()
});

export const insertProcurementSchema = createInsertSchema(procurements).omit({
  id: true,
  created_at: true,
});

export const insertWorkerLogSchema = createInsertSchema(workers_log).omit({
  id: true,
  created_at: true,
});

export const insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  created_at: true,
}).extend({
  assignee: z.string().min(1, "担当者は必須です"),
  planned_start: z.string().min(1, "予定開始日は必須です"),
  planned_end: z.string().min(1, "予定終了日は必須です"),
  qty: z.coerce.number().min(1, "数量は1以上である必要があります"),
  std_time_per_unit: z.coerce.number().min(0, "標準工数は0以上である必要があります"),
  status: z.enum(['not_started', 'in_progress', 'completed']).default('not_started'),
});

export const insertWorkLogSchema = createInsertSchema(work_logs).omit({
  id: true,
  created_at: true,
}).extend({
  date: z.string().min(1, "作業日は必須です"),
  order_id: z.number({ required_error: "受注番号は必須です" }),
  task_name: z.string().min(1, "作業名は必須です"),
  worker: z.string().min(1, "作業者は必須です"),
  start_time: z.string().min(1, "開始時刻は必須です"),
  end_time: z.string().min(1, "終了時刻は必須です"),
  duration_hours: z.coerce.number().gt(0, "実績時間は0より大きい値が必要です"),
  quantity: z.coerce.number().min(0, "数量は0以上である必要があります").default(0),
  memo: z.string().optional(),
  status: z.string().default('下書き'),
});

// Update schemas with column whitelisting for security
export const updateOrderSchema = insertOrderSchema.partial();
export const updateProcurementSchema = insertProcurementSchema.partial();
export const updateWorkerLogSchema = insertWorkerLogSchema.partial();
export const updateTaskSchema = insertTaskSchema.partial();
export const updateWorkLogSchema = insertWorkLogSchema.partial();

// Column whitelists for safe updates
export const ALLOWED_ORDER_UPDATE_COLUMNS = [
  'product_name', 'qty', 'start_date', 'due_date', 'sales', 'estimated_material_cost', 
  'std_time_per_unit', 'status', 'customer_name'
] as const;

export const ALLOWED_PROCUREMENT_UPDATE_COLUMNS = [
  'kind', 'item_name', 'qty', 'eta', 'status', 'vendor', 'unit_price',
  'received_at', 'std_time_per_unit', 'act_time_per_unit', 'worker', 'completed_at'
] as const;

export const ALLOWED_WORKER_LOG_UPDATE_COLUMNS = [
  'qty', 'act_time_per_unit', 'worker', 'date'
] as const;

export const ALLOWED_TASK_UPDATE_COLUMNS = [
  'task_name', 'assignee', 'planned_start', 'planned_end', 
  'std_time_per_unit', 'qty', 'status'
] as const;

export const ALLOWED_WORK_LOG_UPDATE_COLUMNS = [
  'date', 'order_id', 'task_name', 'worker', 'start_time', 'end_time',
  'duration_hours', 'quantity', 'memo', 'status'
] as const;

// ========== Type Definitions ==========
export type Order = typeof orders.$inferSelect;
export type Procurement = typeof procurements.$inferSelect;
export type WorkerLog = typeof workers_log.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type WorkLog = typeof work_logs.$inferSelect;

export type InsertOrder = typeof insertOrderSchema._type;
export type InsertProcurement = typeof insertProcurementSchema._type;
export type InsertWorkerLog = typeof insertWorkerLogSchema._type;
export type InsertTask = typeof insertTaskSchema._type;
export type InsertWorkLog = typeof insertWorkLogSchema._type;

// ========== KPI Types ==========
export interface OrderKPI {
  order_id: number;
  product_name: string;
  qty: number;
  start_date?: string;        // 開始予定日（元データ）
  due_date: string;
  sales: number;
  estimated_material_cost: number; // 見込み材料費（元データ）
  std_time_per_unit: number;   // 標準工数（元データ）
  status: 'pending' | 'in_progress' | 'completed'; // ステータス（元データ）
  customer_name?: string;      // 顧客名（元データ）
  material_cost: number;      // 計算済み材料費
  labor_cost: number;         // 計算済み労務費
  gross_profit: number;       // 計算済み粗利
  actual_time_per_unit: number; // 実績工数[h/個]
  variance_pct: number;       // 工数差異%
}

export interface DashboardKPI {
  total_sales: number;
  total_gross_profit: number;
  total_std_hours: number;
  total_actual_hours: number;
  avg_variance_pct: number;
  purchase_completion_rate: number;  // 購買入荷率
  manufacture_completion_rate: number; // 製造完成率
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  type: 'due_date' | 'eta' | 'received' | 'completed';
  status: 'pending' | 'in_progress' | 'completed' | 'overdue';
  order_id?: number;
  procurement_id?: number;
}