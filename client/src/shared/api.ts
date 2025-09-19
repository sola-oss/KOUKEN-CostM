/**
 * API client functions for sales orders
 */

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
  so_no?: string;
  customer_name: string;
  order_date: string;
  due_date?: string;
  status: 'draft' | 'confirmed' | 'closed';
  note?: string;
  created_at: string;
  updated_at: string;
}

interface SalesOrderPayload {
  customer_name: string;
  order_date: string;
  due_date?: string;
  note?: string;
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
    credentials: 'include',
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to confirm sales order: ${response.status} ${errorText}`);
  }
  
  return response.json();
}

// Export types for use in other components
export type { SalesOrder, SalesOrderPayload, SalesOrderParams, SalesOrdersResponse };