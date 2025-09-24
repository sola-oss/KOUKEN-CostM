// Production Management MVP - SQLite Schema
import { sql } from "drizzle-orm";
import { sqliteTable, integer, text, real, index } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";

// ========== Production Management Tables ==========

// 受注 (Orders)
export const orders = sqliteTable("orders", {
  order_id: integer("order_id").primaryKey(),
  product_name: text("product_name").notNull(),
  qty: real("qty").notNull(),
  due_date: text("due_date").notNull(),          // UTC ISO
  sales: real("sales").notNull(),                // 売上（合計）
  material_unit_cost: real("material_unit_cost").notNull(), // 材料単価（1個あたり）
  std_time_per_unit: real("std_time_per_unit").notNull(),   // 標準工数[h/個]
  wage_rate: real("wage_rate").notNull(),        // 時給[円/h]
  created_at: text("created_at").notNull(),
  updated_at: text("updated_at").notNull(),
}, (table) => ({
  dueDateIdx: index("idx_orders_due").on(table.due_date),
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

// ========== Insert Schemas ==========
export const insertOrderSchema = createInsertSchema(orders).omit({
  order_id: true,
  created_at: true,
  updated_at: true,
});

export const insertProcurementSchema = createInsertSchema(procurements).omit({
  id: true,
  created_at: true,
});

export const insertWorkerLogSchema = createInsertSchema(workers_log).omit({
  id: true,
  created_at: true,
});

// Update schemas with column whitelisting for security
export const updateOrderSchema = insertOrderSchema.partial();
export const updateProcurementSchema = insertProcurementSchema.partial();
export const updateWorkerLogSchema = insertWorkerLogSchema.partial();

// Column whitelists for safe updates
export const ALLOWED_ORDER_UPDATE_COLUMNS = [
  'product_name', 'qty', 'due_date', 'sales', 'material_unit_cost', 
  'std_time_per_unit', 'wage_rate'
] as const;

export const ALLOWED_PROCUREMENT_UPDATE_COLUMNS = [
  'kind', 'item_name', 'qty', 'eta', 'status', 'vendor', 'unit_price',
  'received_at', 'std_time_per_unit', 'act_time_per_unit', 'worker', 'completed_at'
] as const;

export const ALLOWED_WORKER_LOG_UPDATE_COLUMNS = [
  'qty', 'act_time_per_unit', 'worker', 'date'
] as const;

// ========== Type Definitions ==========
export type Order = typeof orders.$inferSelect;
export type Procurement = typeof procurements.$inferSelect;
export type WorkerLog = typeof workers_log.$inferSelect;

export type InsertOrder = typeof insertOrderSchema._type;
export type InsertProcurement = typeof insertProcurementSchema._type;
export type InsertWorkerLog = typeof insertWorkerLogSchema._type;

// ========== KPI Types ==========
export interface OrderKPI {
  order_id: number;
  product_name: string;
  qty: number;
  due_date: string;
  sales: number;
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