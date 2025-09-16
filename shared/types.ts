// Production Management System - Type Definitions

// ========== User & Auth Types ==========
export type UserRole = 'admin' | 'manager' | 'worker' | 'viewer';

export interface Employee {
  id: number;
  name: string;
  email?: string;
  role: UserRole;
  department?: string;
  hourly_cost_rate: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ========== Master Data Types ==========
export interface Customer {
  id: number;
  code: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  contact_person?: string;
  payment_terms?: string;
  credit_limit?: number;
  tags?: string | string[];
  custom_fields?: string | Record<string, any>;
  is_active: boolean;
  created_at: string;
}

export interface Vendor {
  id: number;
  code: string;
  name: string;
  category?: string;
  address?: string;
  phone?: string;
  email?: string;
  contact_person?: string;
  payment_terms?: string;
  tags?: string | string[];
  custom_fields?: string | Record<string, any>;
  is_active: boolean;
  created_at: string;
}

export interface Item {
  id: number;
  code: string;
  name: string;
  description?: string;
  category?: string;
  uom: string;
  unit_cost: number;
  unit_price: number;
  stock_min?: number;
  stock_max?: number;
  lead_time_days?: number;
  tags?: string | string[];
  custom_fields?: string | Record<string, any>;
  is_active: boolean;
  created_at: string;
}

export interface WorkCenter {
  id: number;
  code: string;
  name: string;
  description?: string;
  capacity_per_day: number;
  cost_per_hour: number;
  is_active: boolean;
  created_at: string;
}

// ========== Sales Types ==========
export type SalesOrderStatus = 'draft' | 'confirmed' | 'shipped' | 'closed';

export interface SalesOrder {
  id: number;
  order_no: string;
  customer_id: number;
  order_date: string;
  delivery_date?: string;
  status: SalesOrderStatus;
  total_amount: number;
  notes?: string;
  tags?: string | string[];
  custom_fields?: string | Record<string, any>;
  confirmed_at?: string;
  confirmed_by?: number;
  created_at: string;
  updated_at: string;
  // Relations
  customer?: Customer;
  lines?: SalesOrderLine[];
  confirmed_by_user?: Employee;
}

export interface SalesOrderLine {
  id: number;
  sales_order_id: number;
  line_no: number;
  item_id: number;
  quantity: number;
  unit_price: number;
  amount: number;
  delivery_date?: string;
  notes?: string;
  // Relations
  item?: Item;
}

// ========== Production Types ==========
export type ProductionOrderStatus = 'draft' | 'planned' | 'released' | 'in_progress' | 'completed';
export type WorkOrderStatus = 'pending' | 'released' | 'in_progress' | 'completed';
export type WorkInstructionStatus = 'pending' | 'confirmed' | 'completed';

export interface ProductionOrder {
  id: number;
  production_no: string;
  sales_order_id?: number;
  item_id: number;
  quantity: number;
  start_date?: string;
  end_date?: string;
  status: ProductionOrderStatus;
  priority?: number;
  notes?: string;
  confirmed_at?: string;
  confirmed_by?: number;
  created_at: string;
  updated_at: string;
  // Relations
  sales_order?: SalesOrder;
  item?: Item;
  work_orders?: WorkOrder[];
}

export interface WorkOrder {
  id: number;
  work_order_no: string;
  production_order_id: number;
  work_center_id: number;
  operation: string;
  sequence: number;
  planned_hours: number;
  actual_hours?: number;
  start_date?: string;
  end_date?: string;
  status: WorkOrderStatus;
  created_at: string;
  // Relations
  production_order?: ProductionOrder;
  work_center?: WorkCenter;
  instructions?: WorkInstruction[];
}

export interface WorkInstruction {
  id: number;
  work_order_id: number;
  instruction_no: string;
  employee_id?: number;
  description: string;
  scheduled_date?: string;
  status: WorkInstructionStatus;
  confirmed_at?: string;
  confirmed_by?: number;
  created_at: string;
  // Relations
  work_order?: WorkOrder;
  employee?: Employee;
}

// ========== Purchase Types ==========
export type PurchaseOrderStatus = 'draft' | 'confirmed' | 'received' | 'closed';
export type ReceiptStatus = 'pending' | 'confirmed';

export interface PurchaseOrder {
  id: number;
  po_no: string;
  vendor_id: number;
  order_date: string;
  delivery_date?: string;
  status: PurchaseOrderStatus;
  total_amount: number;
  notes?: string;
  confirmed_at?: string;
  confirmed_by?: number;
  created_at: string;
  updated_at: string;
  // Relations
  vendor?: Vendor;
  lines?: PurchaseOrderLine[];
}

export interface PurchaseOrderLine {
  id: number;
  purchase_order_id: number;
  line_no: number;
  item_id: number;
  quantity: number;
  unit_price: number;
  amount: number;
  received_quantity?: number;
  notes?: string;
  // Relations
  item?: Item;
}

export interface Receipt {
  id: number;
  receipt_no: string;
  purchase_order_id: number;
  receipt_date: string;
  status: ReceiptStatus;
  notes?: string;
  confirmed_at?: string;
  confirmed_by?: number;
  created_at: string;
  // Relations
  purchase_order?: PurchaseOrder;
}

// ========== Time Management Types ==========
export type TimeEntryStatus = 'draft' | 'submitted' | 'approved' | 'rejected';

export interface TimeEntry {
  id: number;
  employee_id: number;
  work_order_id: number;
  entry_date: string;
  start_time?: string;
  end_time?: string;
  hours: number;
  description?: string;
  status: TimeEntryStatus;
  approved_at?: string;
  approved_by?: number;
  created_at: string;
  updated_at: string;
  // Relations
  employee?: Employee;
  work_order?: WorkOrder;
  approver?: Employee;
}

export interface ExternalTimeEntry {
  id: number;
  vendor_id: number;
  work_order_id: number;
  entry_date: string;
  hours: number;
  amount: number;
  description?: string;
  status: 'draft' | 'approved';
  approved_at?: string;
  approved_by?: number;
  created_at: string;
  // Relations
  vendor?: Vendor;
  work_order?: WorkOrder;
}

// ========== Shipping & Invoice Types ==========
export type ShipmentStatus = 'pending' | 'confirmed' | 'delivered';
export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'cancelled';

export interface Shipment {
  id: number;
  shipment_no: string;
  sales_order_id: number;
  ship_date: string;
  status: ShipmentStatus;
  tracking_no?: string;
  notes?: string;
  confirmed_at?: string;
  confirmed_by?: number;
  created_at: string;
  // Relations
  sales_order?: SalesOrder;
  lines?: ShipmentLine[];
}

export interface ShipmentLine {
  id: number;
  shipment_id: number;
  sales_order_line_id: number;
  quantity: number;
  // Relations
  sales_order_line?: SalesOrderLine;
}

export interface Invoice {
  id: number;
  invoice_no: string;
  customer_id: number;
  invoice_date: string;
  due_date?: string;
  status: InvoiceStatus;
  total_amount: number;
  paid_amount?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
  // Relations
  customer?: Customer;
  lines?: InvoiceLine[];
}

export interface InvoiceLine {
  id: number;
  invoice_id: number;
  line_no: number;
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
  sales_order_line_id?: number;
  // Relations
  sales_order_line?: SalesOrderLine;
}

// ========== Support Types ==========
export interface Calendar {
  id: number;
  date: string;
  is_working_day: boolean;
  capacity_adjustment?: number;
  notes?: string;
}

export interface Attachment {
  id: number;
  entity_type: string;
  entity_id: number;
  file_name: string;
  file_path: string;
  file_size?: number;
  mime_type?: string;
  uploaded_by: number;
  uploaded_at: string;
  // Relations
  uploader?: Employee;
}

export interface Comment {
  id: number;
  entity_type: string;
  entity_id: number;
  comment: string;
  created_by: number;
  created_at: string;
  // Relations
  creator?: Employee;
}

export interface ActivityLog {
  id: number;
  entity_type: string;
  entity_id: number;
  action: string;
  old_value?: string;
  new_value?: string;
  user_id: number;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
  // Relations
  user?: Employee;
}

// ========== Dashboard & Report Types ==========
export interface DashboardMetrics {
  pendingOrders: number;
  inProgressProduction: number;
  pendingTimeApprovals: number;
  delayedOrders: number;
  todayShipments: number;
  monthRevenue: number;
}

export interface ProductionProgress {
  production_order_id: number;
  production_no: string;
  item_name: string;
  status: ProductionOrderStatus;
  progress_percentage: number;
  planned_start: string;
  planned_end: string;
  actual_hours: number;
  planned_hours: number;
}

export interface SalesReport {
  customer_name: string;
  order_count: number;
  total_amount: number;
  shipped_amount: number;
  pending_amount: number;
}

// ========== API Response Types ==========
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface ApiError {
  error: string;
  message: string;
  details?: any;
  timestamp: string;
}

export interface SuccessResponse {
  success: boolean;
  message?: string;
  data?: any;
}

// ========== Validation Types ==========
export interface StateTransition {
  from: string;
  to: string;
  allowed: boolean;
  requiredRole?: UserRole;
}