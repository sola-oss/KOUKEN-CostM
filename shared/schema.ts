// Production Management - Shared Schema (Zod版: Drizzle依存なし)
import { z } from 'zod';

// ========== Material Costs ==========
export const insertMaterialCostSchema = z.object({
  order_id: z.string().min(1),
  description: z.string().nullable().optional(),
  total_amount: z.union([z.string(), z.number()]).transform(v => String(v)),
  vendor_id: z.number().int().nullable().optional(),
});
export const updateMaterialCostSchema = insertMaterialCostSchema.partial();
export type InsertMaterialCost = z.infer<typeof insertMaterialCostSchema>;
export type MaterialCost = {
  id: number;
  order_id: string;
  description: string | null;
  total_amount: string;
  vendor_id: number | null;
  created_at: string;
};

// ========== Purchased Items ==========
export const insertPurchasedItemSchema = z.object({
  order_id: z.string().min(1),
  description: z.string().nullable().optional(),
  total_amount: z.union([z.string(), z.number()]).transform(v => String(v)),
  vendor_id: z.number().int().nullable().optional(),
});
export const updatePurchasedItemSchema = insertPurchasedItemSchema.partial();
export type InsertPurchasedItem = z.infer<typeof insertPurchasedItemSchema>;
export type PurchasedItem = {
  id: number;
  order_id: string;
  description: string | null;
  total_amount: string;
  vendor_id: number | null;
  created_at: string;
};

// ========== Legacy types (旧Drizzle pgTable由来 — クライアント互換のため残す) ==========
export type Order = {
  id: number;
  product_name: string;
  qty: string;
  due_date: string;
  sales: string;
  estimated_material_cost: string;
  std_time_per_unit: string;
  status: string;
  customer_name: string | null;
  created_at: Date;
  updated_at: Date;
};

export type Procurement = {
  id: number;
  order_id: number;
  kind: string;
  item_name: string | null;
  qty: string | null;
  unit: string | null;
  eta: string | null;
  status: string | null;
  vendor: string | null;
  unit_price: string | null;
  received_at: string | null;
  std_time_per_unit: string | null;
  act_time_per_unit: string | null;
  worker: string | null;
  completed_at: string | null;
  created_at: Date;
};

export type WorkerLog = {
  id: number;
  order_id: number;
  qty: string;
  act_time_per_unit: string;
  worker: string;
  date: string;
  created_at: Date;
};

// ========== KPI Types ==========
export interface OrderKPI {
  id: number;
  product_name: string;
  qty: number;
  due_date: string;
  sales: number;
  material_cost: number;
  labor_cost: number;
  gross_profit: number;
  actual_time_per_unit: number;
  variance_pct: number;
  status: string;
  customer_name?: string;
}

export interface DashboardKPI {
  total_sales: number;
  total_gross_profit: number;
  total_std_hours: number;
  total_actual_hours: number;
  avg_variance_pct: number;
  purchase_completion_rate: number;
  manufacture_completion_rate: number;
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  type: 'order' | 'procurement' | 'worker_log';
  status?: string;
}
