/**
 * API client functions for sales orders and customers
 */

// Customer types
interface Customer {
  id: number;
  code: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  is_active: boolean;
  created_at: string;
}

interface CustomerParams {
  page?: number;
  page_size?: number;
  query?: string;
}

interface CustomersResponse {
  data: Customer[];
  meta: {
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
  };
}

// Type definitions matching the simplified specification
interface SalesOrderParams {
  from?: string;
  to?: string;
  q?: string;
  status?: string;
  page?: number;
  page_size?: number;
}

interface SalesOrderLine {
  id?: number;
  line_no?: number;
  item_code?: string;
  item_name?: string;
  qty: number;
  uom: string;
  line_due_date?: string;
  unit_price?: number;
  amount?: number;
  tax_rate?: number;
  partial_allowed?: boolean;
}

interface SalesOrder {
  id: number;
  so_no?: string;
  customer_name: string; // Direct field, not joined
  order_date: string;
  due_date?: string;
  order_type?: string;
  sales_rep?: string;
  ship_to_name?: string;
  ship_to_address?: string;
  customer_contact?: string;
  customer_email?: string;
  tags?: string | string[];
  note?: string;
  status: 'draft' | 'confirmed' | 'closed';
  created_at: string;
  updated_at: string;
  lines?: SalesOrderLine[];
}

interface SalesOrderPayload {
  customer_name: string;
  order_date: string;
  due_date?: string;
  order_type?: string;
  sales_rep?: string;
  ship_to_name?: string;
  ship_to_address?: string;
  customer_contact?: string;
  customer_email?: string;
  tags?: string[];
  note?: string;
  lines?: SalesOrderLine[];
}

interface SalesOrdersResponse {
  data: SalesOrder[];
  meta: {
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
  };
}

/**
 * List sales orders with optional filtering
 */
export async function listSalesOrders(params: SalesOrderParams = {}): Promise<SalesOrdersResponse> {
  const searchParams = new URLSearchParams();
  
  if (params.from) searchParams.append('from', params.from);
  if (params.to) searchParams.append('to', params.to);
  if (params.q) searchParams.append('q', params.q);
  if (params.status) searchParams.append('status', params.status);
  if (params.page) searchParams.append('page', params.page.toString());
  if (params.page_size) searchParams.append('page_size', params.page_size.toString());
  
  const url = `/api/sales-orders${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
  
  const response = await fetch(url, {
    headers: {
      'x-access-code': import.meta.env.VITE_APP_ACCESS_CODE || '',
    },
    credentials: 'include',
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch sales orders: ${response.status} ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * Create a new sales order
 */
export async function createSalesOrder(payload: SalesOrderPayload): Promise<{ id: number }> {
  const response = await fetch('/api/sales-orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-access-code': import.meta.env.VITE_APP_ACCESS_CODE || '',
    },
    body: JSON.stringify(payload),
    credentials: 'include',
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create sales order: ${response.status} ${errorText}`);
  }
  
  return response.json();
}

/**
 * Get a single sales order by ID
 */
export async function getSalesOrder(id: number): Promise<SalesOrder> {
  const response = await fetch(`/api/sales-orders/${id}`, {
    headers: {
      'x-access-code': import.meta.env.VITE_APP_ACCESS_CODE || '',
    },
    credentials: 'include',
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch sales order: ${response.status} ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * Confirm a sales order (change status from draft to confirmed)
 */
export async function confirmSalesOrder(id: number): Promise<SalesOrder> {
  const response = await fetch(`/api/sales-orders/${id}/confirm`, {
    method: 'POST',
    headers: {
      'x-access-code': import.meta.env.VITE_APP_ACCESS_CODE || '',
    },
    credentials: 'include',
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to confirm sales order: ${response.status} ${errorText}`);
  }
  
  return response.json();
}

/**
 * List customers with optional filtering
 */
export async function listCustomers(params: CustomerParams = {}): Promise<CustomersResponse> {
  const searchParams = new URLSearchParams();
  
  if (params.page) searchParams.append('page', params.page.toString());
  if (params.page_size) searchParams.append('page_size', params.page_size.toString());
  if (params.query) searchParams.append('query', params.query);
  
  const url = `/api/customers${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
  
  const response = await fetch(url, {
    headers: {
      'x-access-code': import.meta.env.VITE_APP_ACCESS_CODE || '',
    },
    credentials: 'include',
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch customers: ${response.status} ${response.statusText}`);
  }
  
  return response.json();
}

// Export types for use in other components
export type { SalesOrder, SalesOrderLine, SalesOrderPayload, SalesOrderParams, SalesOrdersResponse, Customer, CustomerParams, CustomersResponse };