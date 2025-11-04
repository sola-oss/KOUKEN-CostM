// Production Management Order System - PostgreSQL Schema
import { sql } from "drizzle-orm";
import { pgTable, text, integer, serial, varchar, decimal, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

// ========== Production Order Management Tables (PostgreSQL) ==========
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),                    // 受注番号（自動採番）
  product_name: text("product_name").notNull(),     // 製品名
  qty: decimal("qty", { precision: 10, scale: 3 }).notNull(), // 数量
  due_date: text("due_date").notNull(),             // 納期（ISO文字列）
  sales: decimal("sales", { precision: 12, scale: 2 }).notNull(), // 売上（見込み含む）
  estimated_material_cost: decimal("estimated_material_cost", { precision: 10, scale: 2 }).notNull(), // 見込み材料費（概算）
  std_time_per_unit: decimal("std_time_per_unit", { precision: 8, scale: 2 }).notNull(), // 標準作業時間[h/個]
  status: varchar("status", { length: 20 }).notNull().default('pending'), // ステータス: pending/in_progress/completed
  customer_name: text("customer_name"),             // 顧客名（任意）
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  dueDateIdx: index("idx_orders_due_date").on(table.due_date),
  statusIdx: index("idx_orders_status").on(table.status),
  customerNameIdx: index("idx_orders_customer_name").on(table.customer_name),
}));

// 手配 (Procurements) - 購買と製造の統合テーブル
export const procurements = pgTable("procurements", {
  id: serial("id").primaryKey(),
  order_id: integer("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  kind: varchar("kind", { length: 20 }).notNull(), // 'purchase' または 'manufacture'
  item_name: text("item_name"),
  qty: decimal("qty", { precision: 10, scale: 3 }),
  unit: varchar("unit", { length: 10 }),           // 単位（個、本、kg、m、L など）
  eta: text("eta"),                                // 予定日（ISO文字列）
  status: varchar("status", { length: 20 }),       // 'planned'|'ordered'|'received'|'done'
  vendor: text("vendor"),                          // 仕入先（purchase用）
  unit_price: decimal("unit_price", { precision: 10, scale: 2 }), // 単価（purchase用）
  received_at: text("received_at"),                // 入荷日（purchase用）
  std_time_per_unit: decimal("std_time_per_unit", { precision: 8, scale: 2 }), // 標準時間（manufacture用）
  act_time_per_unit: decimal("act_time_per_unit", { precision: 8, scale: 2 }), // 実績時間（manufacture用）
  worker: text("worker"),                          // 作業者（manufacture用）
  completed_at: text("completed_at"),              // 完了日（manufacture用）
  created_at: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  orderKindStatusIdx: index("idx_procurements_order_kind_status").on(table.order_id, table.kind, table.status),
}));

// 工数入力 (Workers Log) - スタッフ用の簡易打刻
export const workers_log = pgTable("workers_log", {
  id: serial("id").primaryKey(),
  order_id: integer("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  qty: decimal("qty", { precision: 10, scale: 3 }).notNull(),
  act_time_per_unit: decimal("act_time_per_unit", { precision: 8, scale: 2 }).notNull(), // [h/個]
  worker: text("worker").notNull(),
  date: text("date").notNull(),                    // 作業日（ISO文字列）
  created_at: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  orderDateIdx: index("idx_workers_log_order_date").on(table.order_id, table.date),
}));

// ========== Insert Schemas ==========
export const insertOrderSchema = createInsertSchema(orders).omit({
  id: true,
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

// Update schemas
export const updateOrderSchema = insertOrderSchema.partial();
export const updateProcurementSchema = insertProcurementSchema.partial();
export const updateWorkerLogSchema = insertWorkerLogSchema.partial();

// ========== Type Definitions ==========
export type Order = typeof orders.$inferSelect;
export type Procurement = typeof procurements.$inferSelect;
export type WorkerLog = typeof workers_log.$inferSelect;
export type InsertOrder = typeof insertOrderSchema._type;
export type InsertProcurement = typeof insertProcurementSchema._type;
export type InsertWorkerLog = typeof insertWorkerLogSchema._type;

// KPI Types
export interface OrderKPI {
  id: number;
  product_name: string;
  qty: number;
  due_date: string;
  sales: number;
  material_cost: number;      // 計算済み材料費
  labor_cost: number;         // 計算済み労務費
  gross_profit: number;       // 計算済み粗利
  actual_time_per_unit: number; // 実績工数[h/個]
  variance_pct: number;       // 工数差異%
  status: string;             // ステータス
  customer_name?: string;     // 顧客名
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
  type: 'order' | 'procurement' | 'worker_log';
  status?: string;
}