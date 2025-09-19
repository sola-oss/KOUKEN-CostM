// Minimal Sales Order Schema (PostgreSQL)
import { sql } from "drizzle-orm";
import { pgTable, text, integer, serial, varchar, decimal, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

// ========== Simplified Sales Order Tables ==========
export const sales_orders_min = pgTable("sales_orders_min", {
  id: serial("id").primaryKey(),
  so_no: varchar("so_no", { length: 50 }), // Can be null until confirmed
  customer_name: text("customer_name").notNull(), // Simplified: customer name as text field
  order_date: text("order_date").notNull(),
  due_date: text("due_date"),
  note: text("note"),
  status: varchar("status", { length: 20 }).notNull().default('draft'), // draft -> confirmed -> closed
  total_amount: decimal("total_amount", { precision: 10, scale: 2 }).notNull().default('0'),
  confirmed_at: timestamp("confirmed_at"),
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  soNoIdx: index("idx_sales_orders_min_so_no").on(table.so_no),
  customerNameIdx: index("idx_sales_orders_min_customer_name").on(table.customer_name),
  statusIdx: index("idx_sales_orders_min_status").on(table.status),
  orderDateIdx: index("idx_sales_orders_min_order_date").on(table.order_date),
}));

export const sales_order_lines_min = pgTable("sales_order_lines_min", {
  id: serial("id").primaryKey(),
  sales_order_id: integer("sales_order_id").notNull().references(() => sales_orders_min.id),
  line_no: integer("line_no").notNull(),
  item_code: varchar("item_code", { length: 100 }),
  item_name: text("item_name"), // Either item_code OR item_name is required
  qty: decimal("qty", { precision: 10, scale: 3 }).notNull(),
  uom: varchar("uom", { length: 20 }).notNull(), // Unit of measure (required)
  unit_price: decimal("unit_price", { precision: 10, scale: 2 }).notNull().default('0'),
  line_amount: decimal("line_amount", { precision: 10, scale: 2 }).notNull().default('0'),
  note: text("note"),
  created_at: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  salesOrderIdx: index("idx_sales_order_lines_min_order").on(table.sales_order_id),
  itemCodeIdx: index("idx_sales_order_lines_min_item_code").on(table.item_code),
}));

// ========== Zod Validation Schemas ==========
export const insertSalesOrderMinSchema = createInsertSchema(sales_orders_min).omit({
  id: true,
  so_no: true,
  status: true,
  total_amount: true,
  confirmed_at: true,
  created_at: true,
  updated_at: true,
});

export const insertSalesOrderLineMinSchema = createInsertSchema(sales_order_lines_min).omit({
  id: true,
  line_amount: true,
  created_at: true,
});

// ========== Type Definitions ==========
export type SalesOrderMin = typeof sales_orders_min.$inferSelect;
export type SalesOrderLineMin = typeof sales_order_lines_min.$inferSelect;
export type InsertSalesOrderMin = typeof insertSalesOrderMinSchema._type;
export type InsertSalesOrderLineMin = typeof insertSalesOrderLineMinSchema._type;