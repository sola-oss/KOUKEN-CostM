import { Router } from 'express';
import { sqliteInitializer } from '../lib/sqlite-init.js';

const router = Router();

// Access code validation middleware
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

// GET /api/sales-orders - List sales orders with defaults (90 days, status=all)
router.get('/sales-orders', validateAccessCode, async (req, res) => {
  try {
    const db = sqliteInitializer.getDatabase();
    const {
      page = '1',
      page_size = '20',
      status = 'all',
      from,
      to,
      q
    } = req.query;

    const limit = Math.min(parseInt(page_size as string), 100);
    const offset = (parseInt(page as string) - 1) * limit;

    // Default date range: last 90 days if not specified
    const today = new Date();
    const defaultFromDate = new Date(today);
    defaultFromDate.setDate(today.getDate() - 90);
    
    const fromDate = from as string || defaultFromDate.toISOString().split('T')[0];
    const toDate = to as string || today.toISOString().split('T')[0];

    // Build WHERE conditions
    let whereConditions: string[] = ['order_date >= ? AND order_date <= ?'];
    let params: any[] = [fromDate, toDate];
    
    if (status && status !== 'all') {
      whereConditions.push('status = ?');
      params.push(status);
    }
    
    if (q) {
      whereConditions.push('(customer_name LIKE ? OR so_no LIKE ? OR note LIKE ?)');
      const searchTerm = `%${q}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Count total records
    const countQuery = `SELECT COUNT(*) as total FROM sales_orders ${whereClause}`;
    const countResult = db.prepare(countQuery).get(params) as { total: number };
    const total = countResult.total;

    // Get paginated records
    const dataQuery = `
      SELECT 
        id, so_no, customer_name, order_date, due_date, 
        order_type, sales_rep, status, created_at, updated_at
      FROM sales_orders 
      ${whereClause}
      ORDER BY order_date DESC, created_at DESC
      LIMIT ? OFFSET ?
    `;
    
    const records = db.prepare(dataQuery).all([...params, limit, offset]);

    // Set total count header
    res.setHeader('X-Total-Count', total.toString());
    
    res.json({
      items: records,
      total: total,
      page: parseInt(page as string),
      page_size: limit,
      total_pages: Math.ceil(total / limit)
    });

  } catch (error) {
    console.error('Sales orders list error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch sales orders',
      message: 'Database error occurred'
    });
  }
});

// POST /api/sales-orders - Create new sales order
router.post('/sales-orders', validateAccessCode, async (req, res) => {
  try {
    const db = sqliteInitializer.getDatabase();
    const {
      customer_name,
      order_date = new Date().toISOString().split('T')[0],
      due_date,
      order_type = 'normal',
      sales_rep,
      ship_to_name,
      ship_to_address,
      customer_contact,
      customer_email,
      tags,
      note,
      status = 'draft',
      lines = []
    } = req.body;

    // Validation
    if (!customer_name) {
      return res.status(400).json({ error: 'customer_name is required' });
    }

    // Validate lines if provided
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line.item_code && !line.item_name) {
        return res.status(400).json({ 
          error: `Line ${i + 1}: item_code OR item_name is required` 
        });
      }
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

    const now = new Date().toISOString();

    // Insert sales order
    const insertOrder = db.prepare(`
      INSERT INTO sales_orders (
        customer_name, order_date, due_date, order_type, sales_rep,
        ship_to_name, ship_to_address, customer_contact, customer_email,
        tags, note, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const orderResult = insertOrder.run(
      customer_name, order_date, due_date, order_type, sales_rep,
      ship_to_name, ship_to_address, customer_contact, customer_email,
      tags, note, status, now, now
    );

    const salesOrderId = orderResult.lastInsertRowid;

    // Insert lines if provided
    if (lines && lines.length > 0) {
      const insertLine = db.prepare(`
        INSERT INTO sales_order_lines (
          sales_order_id, line_no, item_code, item_name, qty, uom,
          line_due_date, unit_price, amount, tax_rate, partial_allowed, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        insertLine.run(
          salesOrderId,
          i + 1,
          line.item_code || null,
          line.item_name || null,
          line.qty,
          line.uom,
          line.line_due_date || null,
          line.unit_price || null,
          line.amount || null,
          line.tax_rate || null,
          line.partial_allowed || 0,
          now
        );
      }
    }

    res.status(201).json({ id: salesOrderId });

  } catch (error) {
    console.error('Sales order creation error:', error);
    res.status(500).json({ 
      error: 'Failed to create sales order',
      message: 'Database error occurred'
    });
  }
});

export default router;