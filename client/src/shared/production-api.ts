// Production Management MVP - API Client
export const API_BASE_URL = '';

// Basic API client with error handling
export async function apiClient<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  try {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`API request failed: ${endpoint}`, error);
    throw error;
  }
}

// ========== PRODUCTION MANAGEMENT TYPES ==========

// Order Types
export interface Order {
  order_id: string;
  // 新受注管理フィールド (19 fields)
  order_date: string | null;
  client_name: string | null;
  manager: string | null;
  client_order_no: string | null;
  project_title: string | null;
  is_delivered: boolean | null;
  has_shipping_fee: boolean | null;
  is_amount_confirmed: boolean | null;
  is_invoiced: boolean | null;
  due_date: string | null;
  delivery_date: string | null;
  confirmed_date: string | null;
  estimated_amount: number | null;
  invoiced_amount: number | null;
  invoice_month: string | null;
  subcontractor: string | null;
  processing_hours: number | null;
  note: string | null;
  // レガシーフィールド (KPI計算用)
  product_name: string | null;
  qty: number | null;
  start_date: string | null;
  sales: number | null;
  estimated_material_cost: number | null;
  std_time_per_unit: number | null;
  status: 'pending' | 'in_progress' | 'completed' | null;
  customer_name: string | null;
  // システム管理フィールド
  created_at: string;
  updated_at: string;
  // KPI
  kpi?: {
    order_id: string;
    product_name: string;
    qty: number;
    due_date: string;
    sales: number;
    estimated_material_cost: number;
    std_time_per_unit: number;
    status: 'pending' | 'in_progress' | 'completed';
    customer_name?: string;
    material_cost: number;
    labor_cost: number;
    gross_profit: number;
    actual_time_per_unit: number;
    variance_pct: number;
  } | null;
}

export interface OrderPayload {
  order_id?: string;
  // 新受注管理フィールド
  order_date?: string;
  client_name?: string;
  manager?: string;
  client_order_no?: string;
  project_title?: string;
  is_delivered?: boolean;
  has_shipping_fee?: boolean;
  is_amount_confirmed?: boolean;
  is_invoiced?: boolean;
  due_date?: string;
  delivery_date?: string;
  confirmed_date?: string;
  estimated_amount?: number;
  invoiced_amount?: number;
  invoice_month?: string;
  subcontractor?: string;
  processing_hours?: number;
  note?: string;
  // レガシーフィールド
  product_name?: string;
  qty?: number;
  start_date?: string;
  sales?: number;
  estimated_material_cost?: number;
  std_time_per_unit?: number;
  status?: 'pending' | 'in_progress' | 'completed';
  customer_name?: string;
}

// Procurement Types  
export interface Procurement {
  id: number;
  order_id: string | null;
  kind: 'purchase' | 'manufacture';
  item_name: string;
  qty: number;
  unit: string | null;
  eta: string;
  status: 'planned' | 'ordered' | 'received' | 'completed';
  vendor: string | null;
  unit_price: number;
  received_at: string | null;
  std_time_per_unit: number | null;
  act_time_per_unit: number | null;
  worker: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface ProcurementPayload {
  order_id?: string;
  kind: 'purchase' | 'manufacture';
  item_name: string;
  qty: number;
  unit?: string;
  eta: string;
  status: 'planned' | 'ordered' | 'received' | 'completed';
  vendor?: string;
  unit_price: number;
  received_at?: string;
  std_time_per_unit?: number;
  act_time_per_unit?: number;
  worker?: string;
  completed_at?: string;
}

// Worker Log Types
export interface WorkerLog {
  id: number;
  order_id: string | null;
  procurement_id: number | null;
  qty: number;
  act_time_per_unit: number;
  worker: string;
  date: string;
  created_at: string;
}

export interface WorkerLogPayload {
  order_id?: string;
  procurement_id?: number;
  qty: number;
  act_time_per_unit: number;
  worker: string;
  date: string;
}

// Task Types (作業計画)
export interface Task {
  id: number;
  order_id: string;
  task_name: string;
  assignee: string;  // 必須フィールド - ビジネスルール上必要
  planned_start: string;
  planned_end: string;
  std_time_per_unit: number;
  qty: number;
  status: 'not_started' | 'in_progress' | 'completed';
  created_at: string;
}

export interface TaskPayload {
  order_id: string;
  task_name: string;
  assignee: string;  // 必須フィールド - ビジネスルール上必要
  planned_start: string;
  planned_end: string;
  std_time_per_unit: number;
  qty: number;
  status?: 'not_started' | 'in_progress' | 'completed';
}

// Work Log Types (作業実績ログ - PC用詳細入力)
export interface WorkLog {
  id: number;
  date: string;
  order_id: string;
  task_name: string;
  worker: string;
  start_time?: string;
  end_time?: string;
  duration_hours: number;
  quantity: number;
  memo?: string;
  status: string;
  created_at: string;
  product_name?: string; // From JOIN with orders table
}

export interface WorkLogPayload {
  date: string;
  order_id: string;
  task_name: string;
  worker: string;
  start_time?: string;
  end_time?: string;
  duration_hours: number;
  quantity?: number;
  memo?: string;
  status?: string;
}

// Dashboard KPI Types - Updated to match backend schema
export interface DashboardKPI {
  total_sales: number;
  total_gross_profit: number;
  total_std_hours: number;
  total_actual_hours: number;
  avg_variance_pct: number;
  purchase_completion_rate: number;
  manufacture_completion_rate: number;
}

// ========== API FUNCTIONS ==========

// Orders API
export async function listOrders(params?: {
  page?: number;
  page_size?: number;
  search?: string;
}): Promise<{ data: Order[]; meta: any }> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.append('page', params.page.toString());
  if (params?.page_size) searchParams.append('page_size', params.page_size.toString());
  if (params?.search) searchParams.append('search', params.search);
  
  const queryString = searchParams.toString();
  const endpoint = queryString ? `/api/production/orders?${queryString}` : '/api/production/orders';
  
  return apiClient<{ data: Order[]; meta: any }>(endpoint);
}

export async function getOrder(id: string): Promise<Order> {
  return apiClient<Order>(`/api/production/orders/${id}`);
}

export async function createOrder(data: OrderPayload): Promise<Order> {
  return apiClient<Order>('/api/production/orders', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateOrder(id: string, data: Partial<OrderPayload>): Promise<{ message: string }> {
  return apiClient<{ message: string }>(`/api/production/orders/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteOrder(id: string): Promise<{ message: string }> {
  return apiClient<{ message: string }>(`/api/production/orders/${id}`, {
    method: 'DELETE',
  });
}

// Procurements API
export async function listProcurements(params?: {
  page?: number;
  page_size?: number;
  order_id?: string;
  kind?: 'purchase' | 'manufacture';
}): Promise<{ data: Procurement[]; meta: any }> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.append('page', params.page.toString());
  if (params?.page_size) searchParams.append('page_size', params.page_size.toString());
  if (params?.order_id) searchParams.append('order_id', params.order_id.toString());
  if (params?.kind) searchParams.append('kind', params.kind);
  
  const queryString = searchParams.toString();
  const endpoint = queryString ? `/api/procurements?${queryString}` : '/api/procurements';
  
  return apiClient<{ data: Procurement[]; meta: any }>(endpoint);
}

export async function createProcurement(data: ProcurementPayload): Promise<Procurement> {
  return apiClient<Procurement>('/api/procurements', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateProcurement(id: number, data: Partial<ProcurementPayload>): Promise<{ message: string }> {
  return apiClient<{ message: string }>(`/api/procurements/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteProcurement(id: number): Promise<{ message: string }> {
  return apiClient<{ message: string }>(`/api/procurements/${id}`, {
    method: 'DELETE',
  });
}

// Worker Logs API
export async function listWorkerLogs(params?: {
  page?: number;
  page_size?: number;
}): Promise<{ data: WorkerLog[]; meta: any }> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.append('page', params.page.toString());
  if (params?.page_size) searchParams.append('page_size', params.page_size.toString());
  
  const queryString = searchParams.toString();
  const endpoint = queryString ? `/api/workers-log?${queryString}` : '/api/workers-log';
  
  return apiClient<{ data: WorkerLog[]; meta: any }>(endpoint);
}

export async function createWorkerLog(data: WorkerLogPayload): Promise<WorkerLog> {
  return apiClient<WorkerLog>('/api/workers-log', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function deleteWorkerLog(id: number): Promise<{ message: string }> {
  return apiClient<{ message: string }>(`/api/workers-log/${id}`, {
    method: 'DELETE',
  });
}

// Tasks API (作業計画)
export async function listTasks(params?: {
  page?: number;
  page_size?: number;
  order_id?: string;
  status?: string;
  from?: string;
  to?: string;
}): Promise<{ data: Task[]; meta: any }> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.append('page', params.page.toString());
  if (params?.page_size) searchParams.append('page_size', params.page_size.toString());
  if (params?.order_id) searchParams.append('order_id', params.order_id.toString());
  if (params?.status) searchParams.append('status', params.status);
  if (params?.from) searchParams.append('from', params.from);
  if (params?.to) searchParams.append('to', params.to);
  
  const queryString = searchParams.toString();
  const endpoint = queryString ? `/api/tasks?${queryString}` : '/api/tasks';
  
  return apiClient<{ data: Task[]; meta: any }>(endpoint);
}

export async function getTask(id: number): Promise<Task> {
  return apiClient<Task>(`/api/tasks/${id}`);
}

export async function createTask(data: TaskPayload): Promise<Task> {
  return apiClient<Task>('/api/tasks', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateTask(id: number, data: Partial<TaskPayload>): Promise<{ message: string }> {
  return apiClient<{ message: string }>(`/api/tasks/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteTask(id: number): Promise<{ message: string }> {
  return apiClient<{ message: string }>(`/api/tasks/${id}`, {
    method: 'DELETE',
  });
}

// Work Logs API (作業実績ログ)
export async function listWorkLogs(params?: {
  date?: string;
  worker?: string;
  order_id?: string;
  status?: string;
}): Promise<{ data: WorkLog[]; total: number }> {
  const searchParams = new URLSearchParams();
  if (params?.date) searchParams.append('date', params.date);
  if (params?.worker) searchParams.append('worker', params.worker);
  if (params?.order_id) searchParams.append('order_id', params.order_id.toString());
  if (params?.status) searchParams.append('status', params.status);
  
  const queryString = searchParams.toString();
  const endpoint = queryString ? `/api/work-logs?${queryString}` : '/api/work-logs';
  
  return apiClient<{ data: WorkLog[]; total: number }>(endpoint);
}

export async function createWorkLog(data: WorkLogPayload): Promise<{ 
  id: number; 
  hasOverlap: boolean;
  overlappingLogs: WorkLog[];
  message: string 
}> {
  return apiClient<{ 
    id: number; 
    hasOverlap: boolean;
    overlappingLogs: WorkLog[];
    message: string 
  }>('/api/work-logs', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateWorkLog(id: number, data: Partial<WorkLogPayload>): Promise<{ message: string }> {
  return apiClient<{ message: string }>(`/api/work-logs/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteWorkLog(id: number): Promise<{ message: string }> {
  return apiClient<{ message: string }>(`/api/work-logs/${id}`, {
    method: 'DELETE',
  });
}

// Dashboard & KPI API
export async function getDashboardKPI(params?: {
  from?: string;
  to?: string;
}): Promise<DashboardKPI> {
  const searchParams = new URLSearchParams();
  if (params?.from) searchParams.append('from', params.from);
  if (params?.to) searchParams.append('to', params.to);
  
  const queryString = searchParams.toString();
  const endpoint = queryString ? `/api/kpi/summary?${queryString}` : '/api/kpi/summary';
  
  return apiClient<DashboardKPI>(endpoint);
}

// Calendar API
export async function getCalendarData(params?: {
  year?: number;
  month?: number;
}): Promise<any> {
  const searchParams = new URLSearchParams();
  if (params?.year) searchParams.append('year', params.year.toString());
  if (params?.month) searchParams.append('month', params.month.toString());
  
  const queryString = searchParams.toString();
  const endpoint = queryString ? `/api/calendar?${queryString}` : '/api/calendar';
  
  return apiClient(endpoint);
}

// CSV Export API
export async function exportCSV(params?: {
  from?: string;
  to?: string;
  type?: 'orders' | 'procurements' | 'workers_log';
}): Promise<Blob> {
  const searchParams = new URLSearchParams();
  if (params?.from) searchParams.append('from', params.from);
  if (params?.to) searchParams.append('to', params.to);
  if (params?.type) searchParams.append('type', params.type);
  
  const queryString = searchParams.toString();
  const endpoint = queryString ? `/api/export/csv?${queryString}` : '/api/export/csv';
  
  const response = await fetch(`${API_BASE_URL}${endpoint}`);
  if (!response.ok) {
    throw new Error(`CSV export failed: ${response.status}`);
  }
  
  return response.blob();
}

