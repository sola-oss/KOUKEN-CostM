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
  order_id: number;
  product_name: string;
  qty: number;
  due_date: string;
  sales: number;
  estimated_material_cost: number;
  std_time_per_unit: number;
  status: 'pending' | 'in_progress' | 'completed';
  customer_name?: string;
  created_at: string;
  updated_at: string;
}

export interface OrderPayload {
  product_name: string;
  qty: number;
  due_date: string;
  sales: number;
  estimated_material_cost: number;
  std_time_per_unit: number;
  status?: 'pending' | 'in_progress' | 'completed';
  customer_name?: string;
}

// Procurement Types  
export interface Procurement {
  id: number;
  order_id: number | null;
  kind: 'purchase' | 'manufacture';
  item_name: string;
  qty: number;
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
  order_id?: number;
  kind: 'purchase' | 'manufacture';
  item_name: string;
  qty: number;
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
  order_id: number | null;
  procurement_id: number | null;
  qty: number;
  act_time_per_unit: number;
  worker: string;
  date: string;
  created_at: string;
}

export interface WorkerLogPayload {
  order_id?: number;
  procurement_id?: number;
  qty: number;
  act_time_per_unit: number;
  worker: string;
  date: string;
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
}): Promise<{ data: Order[]; meta: any }> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.append('page', params.page.toString());
  if (params?.page_size) searchParams.append('page_size', params.page_size.toString());
  
  const queryString = searchParams.toString();
  const endpoint = queryString ? `/api/orders?${queryString}` : '/api/orders';
  
  return apiClient<{ data: Order[]; meta: any }>(endpoint);
}

export async function getOrder(id: number): Promise<Order> {
  return apiClient<Order>(`/api/orders/${id}`);
}

export async function createOrder(data: OrderPayload): Promise<Order> {
  return apiClient<Order>('/api/orders', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateOrder(id: number, data: Partial<OrderPayload>): Promise<{ message: string }> {
  return apiClient<{ message: string }>(`/api/orders/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteOrder(id: number): Promise<{ message: string }> {
  return apiClient<{ message: string }>(`/api/orders/${id}`, {
    method: 'DELETE',
  });
}

// Procurements API
export async function listProcurements(params?: {
  page?: number;
  page_size?: number;
}): Promise<{ data: Procurement[]; meta: any }> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.append('page', params.page.toString());
  if (params?.page_size) searchParams.append('page_size', params.page_size.toString());
  
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