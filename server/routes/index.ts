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
      'simple-time-entries': '/api/simple-time-entries',
      shipments: '/api/shipments',
      invoices: '/api/invoices',
      reports: '/api/reports',
      exports: '/api/exports'
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

// ========== Simple Time Entries (MVP) ==========

// GET /api/simple-time-entries - Get time entries with filtering
router.get('/api/simple-time-entries', async (req, res) => {
  try {
    const { SqliteDatabase } = await import('../dao/sqlite/SqliteDatabase.js');
    const db = new SqliteDatabase();
    const { 
      page = '1', 
      page_size = '50', 
      sales_order_id,
      status = 'all',
      query = '' 
    } = req.query;
    
    const limit = Math.min(parseInt(page_size as string), 100);
    const offset = (parseInt(page as string) - 1) * limit;
    
    const result = await db.getSimpleTimeEntries({
      limit,
      offset,
      query: query as string,
      sales_order_id: sales_order_id ? parseInt(sales_order_id as string) : undefined,
      status: status as string
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
    console.error('Simple time entries error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/simple-time-entries - Create time entry
router.post('/api/simple-time-entries', async (req, res) => {
  try {
    const { SqliteDatabase } = await import('../dao/sqlite/SqliteDatabase.js');
    const db = new SqliteDatabase();
    
    // Basic validation
    if (!req.body.employee_name || !req.body.sales_order_id) {
      return res.status(400).json({ error: 'employee_name and sales_order_id are required' });
    }
    
    // Validate minutes or start_at/end_at
    if (!req.body.minutes && !(req.body.start_at && req.body.end_at)) {
      return res.status(400).json({ error: 'Either minutes or both start_at and end_at are required' });
    }
    
    const entry = await db.createSimpleTimeEntry(req.body);
    await db.close();
    
    res.status(201).json(entry);
  } catch (error) {
    console.error('Create simple time entry error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/simple-time-entries/:id - Get time entry by ID
router.get('/api/simple-time-entries/:id', async (req, res) => {
  try {
    const { SqliteDatabase } = await import('../dao/sqlite/SqliteDatabase.js');
    const db = new SqliteDatabase();
    const entry = await db.getSimpleTimeEntryById(parseInt(req.params.id));
    await db.close();
    
    if (!entry) {
      return res.status(404).json({ error: 'Time entry not found' });
    }
    
    res.json(entry);
  } catch (error) {
    console.error('Get simple time entry error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/simple-time-entries/:id - Update time entry
router.patch('/api/simple-time-entries/:id', async (req, res) => {
  try {
    const { SqliteDatabase } = await import('../dao/sqlite/SqliteDatabase.js');
    const db = new SqliteDatabase();
    
    const entry = await db.updateSimpleTimeEntry(parseInt(req.params.id), req.body);
    await db.close();
    
    if (!entry) {
      return res.status(404).json({ error: 'Time entry not found' });
    }
    
    res.json(entry);
  } catch (error) {
    console.error('Update simple time entry error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/simple-time-entries/:id - Delete time entry
router.delete('/api/simple-time-entries/:id', async (req, res) => {
  try {
    const { SqliteDatabase } = await import('../dao/sqlite/SqliteDatabase.js');
    const db = new SqliteDatabase();
    
    const success = await db.deleteSimpleTimeEntry(parseInt(req.params.id));
    await db.close();
    
    if (!success) {
      return res.status(404).json({ error: 'Time entry not found' });
    }
    
    res.status(204).send();
  } catch (error) {
    console.error('Delete simple time entry error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/simple-time-entries/:id/approve - Approve time entry
router.patch('/api/simple-time-entries/:id/approve', async (req, res) => {
  try {
    const { SqliteDatabase } = await import('../dao/sqlite/SqliteDatabase.js');
    const db = new SqliteDatabase();
    
    const approver = req.body.approver || 'System';
    const entry = await db.approveSimpleTimeEntry(parseInt(req.params.id), approver);
    await db.close();
    
    if (!entry) {
      return res.status(404).json({ error: 'Time entry not found' });
    }
    
    res.json(entry);
  } catch (error) {
    console.error('Approve simple time entry error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ========== CSV Export ==========

// GET /api/exports/monthly.csv - Export monthly time report
router.get('/api/exports/monthly.csv', async (req, res) => {
  try {
    const { yyyymm } = req.query;
    
    if (!yyyymm || typeof yyyymm !== 'string' || !/^\d{4}-\d{2}$/.test(yyyymm)) {
      return res.status(400).json({ error: 'Valid yyyymm parameter (YYYY-MM) is required' });
    }
    
    const { SqliteDatabase } = await import('../dao/sqlite/SqliteDatabase.js');
    const db = new SqliteDatabase();
    
    const reportData = await db.getMonthlyTimeReport(yyyymm);
    await db.close();
    
    // Get hourly cost from environment variable
    const hourlyRate = parseFloat(process.env.HOURLY_COST || '3000');
    
    // Generate CSV content
    let csvContent = 'sales_order_id,so_no,customer_name,total_minutes,labor_cost,yyyymm\n';
    
    reportData.forEach(row => {
      const laborCost = (row.total_minutes / 60) * hourlyRate;
      csvContent += `${row.sales_order_id},"${row.so_no}","${row.customer_name}",${row.total_minutes},${laborCost.toFixed(2)},"${yyyymm}"\n`;
    });
    
    // Set CSV headers
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="monthly_time_report_${yyyymm}.csv"`);
    
    res.send(csvContent);
  } catch (error) {
    console.error('CSV export error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;