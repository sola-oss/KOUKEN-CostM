// Production Management System - Main Router
import { Router } from 'express';

const router = Router();

// Health check
router.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'production-management-api'
  });
});

// API Routes - Basic implementation for initial setup
router.get('/api', (req, res) => {
  res.json({
    message: '生産管理システム API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      dashboard: '/api/dashboard',
      customers: '/api/customers',
      vendors: '/api/vendors',
      items: '/api/items',
      employees: '/api/employees',
      'sales-orders': '/api/sales-orders',
      'production-orders': '/api/production-orders',
      'work-orders': '/api/work-orders',
      'purchase-orders': '/api/purchase-orders',
      'time-entries': '/api/time-entries',
      shipments: '/api/shipments',
      invoices: '/api/invoices',
      reports: '/api/reports'
    }
  });
});

// Dashboard metrics
router.get('/api/dashboard', async (req, res) => {
  try {
    const { SqliteDatabase } = await import('../dao/sqlite/SqliteDatabase.js');
    const db = new SqliteDatabase();
    const metrics = await db.getDashboardMetrics();
    await db.close();
    res.json(metrics);
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Customers
router.get('/api/customers', async (req, res) => {
  try {
    const { SqliteDatabase } = await import('../dao/sqlite/SqliteDatabase.js');
    const db = new SqliteDatabase();
    const { page = '1', page_size = '100', query = '' } = req.query;
    const limit = Math.min(parseInt(page_size as string), 100);
    const offset = (parseInt(page as string) - 1) * limit;
    
    const result = await db.getCustomers({ limit, offset, query: query as string });
    await db.close();
    
    res.json({
      data: result.data,
      meta: {
        total: result.total,
        page: parseInt(page as string),
        page_size: limit,
        total_pages: Math.ceil(result.total / limit)
      }
    });
  } catch (error) {
    console.error('Customers error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Vendors
router.get('/api/vendors', async (req, res) => {
  try {
    const { SqliteDatabase } = await import('../dao/sqlite/SqliteDatabase.js');
    const db = new SqliteDatabase();
    const { page = '1', page_size = '100', query = '' } = req.query;
    const limit = Math.min(parseInt(page_size as string), 100);
    const offset = (parseInt(page as string) - 1) * limit;
    
    const result = await db.getVendors({ limit, offset, query: query as string });
    await db.close();
    
    res.set('X-Total-Count', result.total.toString());
    res.json({
      data: result.data,
      meta: {
        total: result.total,
        page: parseInt(page as string),
        page_size: limit,
        total_pages: Math.ceil(result.total / limit)
      }
    });
  } catch (error) {
    console.error('Vendors error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Items
router.get('/api/items', async (req, res) => {
  try {
    const { SqliteDatabase } = await import('../dao/sqlite/SqliteDatabase.js');
    const db = new SqliteDatabase();
    const { page = '1', page_size = '100', query = '' } = req.query;
    const limit = Math.min(parseInt(page_size as string), 100);
    const offset = (parseInt(page as string) - 1) * limit;
    
    const result = await db.getItems({ limit, offset, query: query as string });
    await db.close();
    
    res.json({
      data: result.data,
      meta: {
        total: result.total,
        page: parseInt(page as string),
        page_size: limit,
        total_pages: Math.ceil(result.total / limit)
      }
    });
  } catch (error) {
    console.error('Items error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Employees
router.get('/api/employees', async (req, res) => {
  try {
    const { SqliteDatabase } = await import('../dao/sqlite/SqliteDatabase.js');
    const db = new SqliteDatabase();
    const employees = await db.getEmployees();
    await db.close();
    res.json({ data: employees });
  } catch (error) {
    console.error('Employees error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Sales Orders
router.get('/api/sales-orders', async (req, res) => {
  try {
    const { SqliteDatabase } = await import('../dao/sqlite/SqliteDatabase.js');
    const db = new SqliteDatabase();
    const { page = '1', page_size = '50', status, customer_id } = req.query;
    const limit = Math.min(parseInt(page_size as string), 100);
    const offset = (parseInt(page as string) - 1) * limit;
    
    const result = await db.getSalesOrders({ 
      limit, 
      offset, 
      status: status as string,
      customerId: customer_id ? parseInt(customer_id as string) : undefined
    });
    await db.close();
    
    res.json({
      data: result.data,
      meta: {
        total: result.total,
        page: parseInt(page as string),
        page_size: limit,
        total_pages: Math.ceil(result.total / limit)
      }
    });
  } catch (error) {
    console.error('Sales orders error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/api/sales-orders/:id', async (req, res) => {
  try {
    const { SqliteDatabase } = await import('../dao/sqlite/SqliteDatabase.js');
    const db = new SqliteDatabase();
    const order = await db.getSalesOrderById(parseInt(req.params.id));
    await db.close();
    
    if (!order) {
      return res.status(404).json({ error: 'Sales order not found' });
    }
    
    res.json(order);
  } catch (error) {
    console.error('Sales order detail error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;