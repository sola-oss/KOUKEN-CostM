// Production Management System - Main Router
import { Router } from 'express';
import { insertSalesOrderSchema } from '../../shared/schema.js';

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

// Access code validation middleware for sales orders
const validateAccessCode = (req: any, res: any, next: any) => {
  const accessCode = req.headers['x-access-code'];
  const expectedCode = process.env.APP_ACCESS_CODE;
  
  
  if (!expectedCode) {
    console.error('Server configuration error: APP_ACCESS_CODE not set');
    return res.status(500).json({ error: 'Server configuration error' });
  }
  
  if (!accessCode || accessCode !== expectedCode) {
    console.error('Access code validation failed');
    return res.status(401).json({ error: 'Invalid access code' });
  }
  
  next();
};

// Sales Orders (Simplified Version)
router.get('/api/sales-orders', validateAccessCode, async (req, res) => {
  try {
    const { 
      page = '1', 
      page_size = '20', 
      status, 
      from,
      to,
      q
    } = req.query;
    
    const limit = Math.min(parseInt(page_size as string), 100);
    const offset = (parseInt(page as string) - 1) * limit;
    
    // Build WHERE clause and parameters (PostgreSQL syntax)
    let whereConditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;
    
    if (status && status !== 'all') {
      whereConditions.push(`status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }
    
    if (from) {
      whereConditions.push(`order_date >= $${paramIndex}`);
      params.push(from);
      paramIndex++;
    }
    
    if (to) {
      whereConditions.push(`order_date <= $${paramIndex}`);
      params.push(to);
      paramIndex++;
    }
    
    if (q) {
      whereConditions.push(`customer_name ILIKE $${paramIndex}`);
      params.push(`%${q}%`);
      paramIndex++;
    }
    
    const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';
    
    // Import PostgreSQL database client
    const { sql } = await import('../lib/database.js');
    
    // Get total count
    const countQuery = `
      SELECT COUNT(*) as count 
      FROM sales_orders_min
      ${whereClause}
    `;
    const countResult = await sql(countQuery, params);
    const total = parseInt(countResult[0].count);
    
    // Get data with pagination
    const dataQuery = `
      SELECT *
      FROM sales_orders_min
      ${whereClause}
      ORDER BY order_date DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    const data = await sql(dataQuery, [...params, limit, offset]);
    
    res.set('X-Total-Count', total.toString());
    res.json({
      data: data,
      meta: {
        total: total,
        page: parseInt(page as string),
        page_size: limit,
        total_pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Sales orders error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new sales order (Simplified Version)
router.post('/api/sales-orders', validateAccessCode, async (req, res) => {
  try {
    // Custom validation according to specification
    const { 
      customer_name, 
      order_date, 
      due_date, 
      order_type, 
      sales_rep,
      ship_to_name, 
      ship_to_address, 
      customer_contact, 
      customer_email,
      tags, 
      note,
      lines = []
    } = req.body;
    
    // Required field validation
    if (!customer_name) {
      return res.status(400).json({ error: 'customer_name is required' });
    }
    
    if (!order_date) {
      return res.status(400).json({ error: 'order_date is required' });
    }
    
    // Date validation
    if (due_date && order_date && new Date(due_date) < new Date(order_date)) {
      return res.status(400).json({ error: 'due_date must be on or after order_date' });
    }
    
    // Lines validation (if provided)
    if (lines.length > 0) {
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Either item_code or item_name required
        if (!line.item_code && !line.item_name) {
          return res.status(400).json({ 
            error: `Line ${i + 1}: Either item_code or item_name is required` 
          });
        }
        
        // qty and uom required
        if (!line.qty || line.qty <= 0) {
          return res.status(400).json({ 
            error: `Line ${i + 1}: qty must be greater than 0` 
          });
        }
        
        if (!line.uom) {
          return res.status(400).json({ 
            error: `Line ${i + 1}: uom is required` 
          });
        }
      }
    }
    
    // Import PostgreSQL database client
    const { sql } = await import('../lib/database.js');
    
    const now = new Date().toISOString();
    
    // Simplified fields for minimal system (remove fields not in our PostgreSQL schema)
    // Insert sales order and get the returned ID
    const insertQuery = `
      INSERT INTO sales_orders_min (
        customer_name, order_date, due_date, note, status, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, 'draft', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING id
    `;
    
    const orderResult = await sql(insertQuery, [
      customer_name, 
      order_date, 
      due_date || null, 
      note || null
    ]);
    
    const salesOrderId = orderResult[0].id;
    
    // Insert order lines if provided
    if (lines.length > 0) {
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lineInsertQuery = `
          INSERT INTO sales_order_lines_min (
            sales_order_id, line_no, item_code, item_name, qty, uom,
            unit_price, line_amount, note, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
        `;
        
        await sql(lineInsertQuery, [
          salesOrderId, 
          i + 1, 
          line.item_code || null, 
          line.item_name || null,
          line.qty, 
          line.uom, 
          line.unit_price || 0, 
          line.line_amount || 0, 
          line.note || null
        ]);
      }
    }
    
    const createdId = salesOrderId;
    
    // Return just the ID as specified
    res.status(201).json({ id: createdId });
  } catch (error) {
    console.error('Create sales order error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single sales order (Simplified Version)
router.get('/api/sales-orders/:id', validateAccessCode, async (req, res) => {
  try {
    const Database = (await import('better-sqlite3')).default;
    const db = new Database('./data/production.db');
    
    const order = db.prepare(`
      SELECT * FROM sales_orders_min WHERE id = ?
    `).get(req.params.id);
    
    if (!order) {
      db.close();
      return res.status(404).json({ error: 'Sales order not found' });
    }
    
    // Get order lines if they exist
    const lines = db.prepare(`
      SELECT * FROM sales_order_lines_min WHERE sales_order_id = ? ORDER BY line_no
    `).all(req.params.id);
    
    db.close();
    
    res.json({
      ...order,
      lines: lines || []
    });
  } catch (error) {
    console.error('Sales order detail error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Confirm sales order (Simplified Version)
router.post('/api/sales-orders/:id/confirm', validateAccessCode, async (req, res) => {
  try {
    const orderId = parseInt(req.params.id);
    
    const Database = (await import('better-sqlite3')).default;
    const db = new Database('./data/production.db');
    
    // Get current order from simplified table
    const currentOrder = db.prepare('SELECT * FROM sales_orders_min WHERE id = ?').get(orderId) as any;
    
    if (!currentOrder) {
      db.close();
      return res.status(404).json({ error: 'Sales order not found' });
    }
    
    if (currentOrder.status !== 'draft') {
      db.close();
      return res.status(409).json({ error: 'Order is already confirmed or closed' });
    }
    
    // Import the nextSoNo function before the transaction
    const { nextSoNo } = await import('../lib/soNumber.js');
    
    const transaction = db.transaction(() => {
      let soNo = currentOrder.so_no;
      
      // Generate order number if not already assigned
      if (!soNo) {
        soNo = nextSoNo(db, new Date(currentOrder.order_date));
      }
      
      // Update order status, order number, and audit fields
      const updateStmt = db.prepare(`
        UPDATE sales_orders_min 
        SET status = 'confirmed', so_no = ?, updated_at = datetime('now')
        WHERE id = ?
      `);
      updateStmt.run(soNo, orderId);
      
      return soNo;
    });
    
    const generatedSoNo = transaction();
    
    // Get updated order (no need for join since customer_name is direct field)
    const updatedOrder = db.prepare(`
      SELECT * FROM sales_orders_min WHERE id = ?
    `).get(orderId);
    db.close();
    
    res.json(updatedOrder);
  } catch (error) {
    console.error('Confirm sales order error:', error);
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