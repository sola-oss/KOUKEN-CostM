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

// Type definitions matching the specification
interface SalesOrderParams {
  from?: string;
  to?: string;
  q?: string;
  status?: string;
  page?: number;
  page_size?: number;
}

interface SalesOrder {
  id: number;
  order_no?: string;
  customer_id: number;
  customer_name?: string; // Joined from customers table
  order_date: string;
  delivery_date?: string;
  status: 'draft' | 'confirmed' | 'closed';
  notes?: string;
  created_at: string;
  updated_at: string;
}

interface SalesOrderPayload {
  customer_id: number;
  order_date: string;
  delivery_date?: string;
  notes?: string;
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
export async function createSalesOrder(payload: SalesOrderPayload): Promise<SalesOrder> {
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
export type { SalesOrder, SalesOrderPayload, SalesOrderParams, SalesOrdersResponse, Customer, CustomerParams, CustomersResponse };