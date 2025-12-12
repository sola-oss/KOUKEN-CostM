// Production Management MVP - SQLite Schema
import { sql } from "drizzle-orm";
import { sqliteTable, integer, text, real, index } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ========== Production Management Tables ==========

// 受注 (Orders)
export const orders = sqliteTable("orders", {
  order_id: text("order_id").primaryKey(),       // 受注番号（文字列対応）
  
  // 新受注管理項目（2025-01拡張）
  order_date: text("order_date"),                // 受注日（YYYY-MM-DD）
  client_name: text("client_name"),              // 客先
  manager: text("manager"),                      // 担当者
  client_order_no: text("client_order_no"),      // 客先注番
  project_title: text("project_title"),          // 件名
  
  // ステータスフラグ（チェックマーク形式）
  is_delivered: integer("is_delivered", { mode: 'boolean' }).default(false),        // 納品完了 ✱
  has_shipping_fee: integer("has_shipping_fee", { mode: 'boolean' }).default(false), // 送料有り ＃
  is_amount_confirmed: integer("is_amount_confirmed", { mode: 'boolean' }).default(false), // 金額決定済み -
  is_invoiced: integer("is_invoiced", { mode: 'boolean' }).default(false),          // 請求済み +
  
  // 日付情報
  due_date: text("due_date"),                    // 納期（YYYY-MM-DD）
  delivery_date: text("delivery_date"),          // 納品日（YYYY-MM-DD）
  confirmed_date: text("confirmed_date"),        // 確定日（YYYY-MM-DD）
  
  // 金額情報
  estimated_amount: real("estimated_amount"),    // 見積金額
  invoiced_amount: real("invoiced_amount"),      // 請求金額
  invoice_month: text("invoice_month"),          // 請求月（YYYY-MM形式）
  
  // 作業情報
  subcontractor: text("subcontractor"),          // 外注自社
  processing_hours: real("processing_hours"),    // 加工時間
  
  // その他
  note: text("note"),                            // 備考
  
  // レガシー項目（互換性のため残す、将来的に廃止予定）
  product_name: text("product_name"),            // → project_title に移行
  qty: real("qty"),                              // 数量（他テーブルで使用中）
  start_date: text("start_date"),                // 開始予定日（KPI計算で使用中）
  sales: real("sales"),                          // → estimated_amount に移行
  estimated_material_cost: real("estimated_material_cost"), // 見込み材料費（KPI計算で使用中）
  std_time_per_unit: real("std_time_per_unit"),  // 標準工数（KPI計算で使用中）
  status: text("status", { enum: ['pending', 'in_progress', 'completed'] }).default('pending'), // ワークフローステータス
  customer_name: text("customer_name"),          // → client_name に移行
  
  // システム管理
  created_at: text("created_at").notNull(),
  updated_at: text("updated_at").notNull(),
}, (table) => ({
  dueDateIdx: index("idx_orders_due").on(table.due_date),
  statusIdx: index("idx_orders_status").on(table.status),
  startDateIdx: index("idx_orders_start").on(table.start_date),
  orderDateIdx: index("idx_orders_order_date").on(table.order_date),
  invoiceMonthIdx: index("idx_orders_invoice_month").on(table.invoice_month),
}));

// 手配 (Procurements) - 購買(purchase) と 製造(manufacture) を統合
export const procurements = sqliteTable("procurements", {
  id: integer("id").primaryKey(),
  order_id: text("order_id").notNull().references(() => orders.order_id, { onDelete: "cascade" }),
  kind: text("kind", { enum: ['purchase', 'manufacture'] }).notNull(),
  item_name: text("item_name"),
  qty: real("qty"),
  unit: text("unit"),                            // 単位（個、本、kg、m、L など）
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
  order_id: text("order_id").notNull().references(() => orders.order_id, { onDelete: "cascade" }),
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
  order_id: text("order_id").notNull().references(() => orders.order_id, { onDelete: "cascade" }),
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

// 作業実績ログ (Work Logs) - ハーモスCSV取込 + 手動入力対応
export const work_logs = sqliteTable("work_logs", {
  id: integer("id").primaryKey(),
  
  // ハーモスCSVフィールド
  work_date: text("work_date"),                  // 日付 (YYYY-MM-DD)
  employee_name: text("employee_name"),          // 氏名
  client_name: text("client_name"),              // 取引先
  project_name: text("project_name"),            // プロジェクト
  task_large: text("task_large"),                // 業務_大_
  task_medium: text("task_medium"),              // 業務_中_
  task_small: text("task_small"),                // 業務_小_
  work_name: text("work_name"),                  // 業務名（受注番号を入れる列）
  planned_time: text("planned_time"),            // 業務時間_予定_
  actual_time: text("actual_time"),              // 業務時間_実績_
  total_work_time: text("total_work_time"),      // 総労働時間
  note: text("note"),                            // 備考
  
  // 手動入力専用フィールド
  date: text("date"),                            // 作業日（手動入力用）
  worker: text("worker"),                        // 作業者（手動入力用）
  task_name: text("task_name"),                  // 作業名（手動入力用）
  start_time: text("start_time"),                // 開始時刻（HH:MM形式）
  end_time: text("end_time"),                    // 終了時刻（HH:MM形式）
  duration_hours: real("duration_hours"),        // 実績時間（小数）
  quantity: real("quantity").default(0),         // 数量
  memo: text("memo"),                            // メモ（手動入力用）
  status: text("status").default('下書き'),      // ステータス
  
  // 紐付け関連
  order_id: text("order_id"),                    // 受注番号 (orders.order_id) - 文字列対応
  order_no: text("order_no"),                    // 受注番号 (k001など) - 廃止予定（order_idと統合）
  match_status: text("match_status").default('unlinked'), // linked / temp / unlinked
  
  // 取込管理
  source: text("source").default('manual'),      // データ由来: manual / harmos
  imported_at: text("imported_at").default(sql`(datetime('now', 'localtime'))`),
}, (table) => ({
  dateIdx: index("idx_work_logs_date").on(table.work_date),
  orderIdx: index("idx_work_logs_order").on(table.order_id),
  orderNoIdx: index("idx_work_logs_order_no").on(table.order_no),
}));

// ========== Insert Schemas ==========
export const insertOrderSchema = createInsertSchema(orders).omit({
  created_at: true,
  updated_at: true,
}).extend({
  order_id: z.string().optional(),
  
  // 新受注管理項目
  order_date: z.string().optional(),
  client_name: z.string().optional(),
  manager: z.string().optional(),
  client_order_no: z.string().optional(),
  project_title: z.string().optional(),
  
  // ステータスフラグ
  is_delivered: z.boolean().default(false),
  has_shipping_fee: z.boolean().default(false),
  is_amount_confirmed: z.boolean().default(false),
  is_invoiced: z.boolean().default(false),
  
  // 日付情報
  due_date: z.string().optional(),
  delivery_date: z.string().optional(),
  confirmed_date: z.string().optional(),
  
  // 金額情報
  estimated_amount: z.coerce.number().optional(),
  invoiced_amount: z.coerce.number().optional(),
  invoice_month: z.string().optional(),
  
  // 作業情報
  subcontractor: z.string().optional(),
  processing_hours: z.coerce.number().optional(),
  
  // その他
  note: z.string().optional(),
  
  // レガシー項目（互換性）
  product_name: z.string().optional(),
  qty: z.coerce.number().optional(),
  start_date: z.string().optional(),
  sales: z.coerce.number().optional(),
  estimated_material_cost: z.coerce.number().optional(),
  std_time_per_unit: z.coerce.number().optional(),
  status: z.enum(['pending', 'in_progress', 'completed']).default('pending'),
  customer_name: z.string().optional(),
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
  imported_at: true,
}).extend({
  // ハーモスCSVフィールド（全てoptional）
  work_date: z.string().optional(),
  employee_name: z.string().optional(),
  client_name: z.string().optional(),
  project_name: z.string().optional(),
  task_large: z.string().optional(),
  task_medium: z.string().optional(),
  task_small: z.string().optional(),
  work_name: z.string().optional(),
  planned_time: z.string().optional(),
  actual_time: z.string().optional(),
  total_work_time: z.string().optional(),
  note: z.string().optional(),
  
  // 手動入力フィールド（全てoptional）
  date: z.string().optional(),
  worker: z.string().optional(),
  task_name: z.string().optional(),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  duration_hours: z.number().optional(),
  quantity: z.number().optional(),
  memo: z.string().optional(),
  status: z.string().optional(),
  
  // 共通フィールド
  order_id: z.string().optional(),
  order_no: z.string().optional(),
  match_status: z.enum(['linked', 'temp', 'unlinked']).default('unlinked'),
  source: z.enum(['manual', 'harmos']).default('manual'),
});

// Update schemas with column whitelisting for security
export const updateOrderSchema = insertOrderSchema.partial();
export const updateProcurementSchema = insertProcurementSchema.partial();
export const updateWorkerLogSchema = insertWorkerLogSchema.partial();
export const updateTaskSchema = insertTaskSchema.partial();
export const updateWorkLogSchema = insertWorkLogSchema.partial();

// Column whitelists for safe updates
export const ALLOWED_ORDER_UPDATE_COLUMNS = [
  // 新受注管理項目
  'order_date', 'client_name', 'manager', 'client_order_no', 'project_title',
  'is_delivered', 'has_shipping_fee', 'is_amount_confirmed', 'is_invoiced',
  'due_date', 'delivery_date', 'confirmed_date',
  'estimated_amount', 'invoiced_amount', 'invoice_month',
  'subcontractor', 'processing_hours', 'note',
  // レガシー項目（互換性のため残す）
  'product_name', 'qty', 'start_date', 'sales', 'estimated_material_cost', 
  'std_time_per_unit', 'status', 'customer_name'
] as const;

export const ALLOWED_PROCUREMENT_UPDATE_COLUMNS = [
  'kind', 'item_name', 'qty', 'unit', 'eta', 'status', 'vendor', 'unit_price',
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
  // ハーモスCSVフィールド
  'work_date', 'employee_name', 'client_name', 'project_name',
  'task_large', 'task_medium', 'task_small', 'work_name',
  'planned_time', 'actual_time', 'total_work_time', 'note',
  // 手動入力フィールド
  'date', 'worker', 'task_name', 'start_time', 'end_time', 
  'duration_hours', 'quantity', 'memo', 'status',
  // 共通フィールド
  'order_id', 'order_no', 'match_status'
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
  order_id: string;
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
  order_id?: string;
  procurement_id?: number;
}

// ========== Materials Master (材料マスタ) ==========
// 共通の材料マスタ - プロジェクト非依存
export const materials = sqliteTable("materials", {
  id: integer("id").primaryKey(),
  material_type: text("material_type").notNull(),    // 材料種別（鋼材、配管、など）
  name: text("name").notNull(),                       // 材料名（C鋼、H鋼、など）
  size: text("size").notNull(),                       // サイズ（C100×50×5×7.5）
  unit: text("unit").notNull(),                       // 単位（m、本、kg）
  unit_weight: real("unit_weight"),                   // 単位重量（kg/m など）
  remark: text("remark"),                             // 備考
  created_at: text("created_at").notNull(),
}, (table) => ({
  typeNameIdx: index("idx_materials_type_name").on(table.material_type, table.name),
}));

// Insert Schema for Materials
export const insertMaterialSchema = createInsertSchema(materials).omit({
  id: true,
  created_at: true,
}).extend({
  material_type: z.string().min(1, "材料種別は必須です"),
  name: z.string().min(1, "材料名は必須です"),
  size: z.string().min(1, "サイズは必須です"),
  unit: z.string().min(1, "単位は必須です"),
  unit_weight: z.coerce.number().optional(),
  remark: z.string().optional(),
});

export type InsertMaterial = z.infer<typeof insertMaterialSchema>;
export type Material = typeof materials.$inferSelect;

// ========== Material Usages (材料使用) ==========
// プロジェクト別・工区別の材料使用管理
export const materialUsages = sqliteTable("material_usages", {
  id: integer("id").primaryKey(),
  project_id: text("project_id").notNull().references(() => orders.order_id, { onDelete: "cascade" }),
  area: text("area"),                                 // エリア（2F など）
  zone: text("zone"),                                 // 工区（N工区 / S工区）
  drawing_no: text("drawing_no"),                     // 図面番号
  material_id: integer("material_id").notNull().references(() => materials.id, { onDelete: "restrict" }),
  quantity: real("quantity").notNull().default(1),    // 数量
  length: real("length"),                             // 長さ（m）
  remark: text("remark"),                             // 備考
  created_at: text("created_at").notNull(),
}, (table) => ({
  projectIdx: index("idx_material_usages_project").on(table.project_id),
  materialIdx: index("idx_material_usages_material").on(table.material_id),
}));

// Insert Schema for Material Usages
export const insertMaterialUsageSchema = createInsertSchema(materialUsages).omit({
  id: true,
  created_at: true,
}).extend({
  project_id: z.string().min(1, "案件IDは必須です"),
  area: z.string().optional(),
  zone: z.string().optional(),
  drawing_no: z.string().optional(),
  material_id: z.coerce.number().int().positive("材料IDは必須です"),
  quantity: z.coerce.number().positive("数量は1以上にしてください").default(1),
  length: z.coerce.number().positive().optional(),
  remark: z.string().optional(),
});

export type InsertMaterialUsage = z.infer<typeof insertMaterialUsageSchema>;
export type MaterialUsage = typeof materialUsages.$inferSelect;

// Material Usage with joined material info (for API response)
export interface MaterialUsageWithMaterial extends MaterialUsage {
  material_type: string;
  material_name: string;
  material_size: string;
  unit: string;
  unit_weight: number | null;
  total_weight: number | null;  // Calculated: unit_weight × length × quantity
}