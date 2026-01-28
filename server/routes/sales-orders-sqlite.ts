import { Router } from 'express';
import { sqliteInitializer } from '../lib/sqlite-init.js';

const router = Router();

// Access code validation middleware - disabled for development
const validateAccessCode = (req: any, res: any, next: any) => {
  // Skip validation in development mode
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
      data: records,
      meta: {
        total: total,
        page: parseInt(page as string),
        page_size: limit,
        total_pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Sales orders list error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch sales orders',
      message: 'Database error occurred'
    });
  }
});

// GET /api/sales-orders/:id - Get single sales order by ID
router.get('/sales-orders/:id', validateAccessCode, async (req, res) => {
  try {
    const db = sqliteInitializer.getDatabase();
    const { id } = req.params;

    const order = db.prepare(`
      SELECT 
        id, so_no, customer_name, order_date, due_date,
        order_type, sales_rep, ship_to_name, ship_to_address,
        customer_contact, customer_email, tags, note, status,
        created_at, updated_at
      FROM sales_orders 
      WHERE id = ?
    `).get(id);

    if (!order) {
      return res.status(404).json({ error: 'Sales order not found' });
    }

    // Get order lines
    const lines = db.prepare(`
      SELECT 
        id, line_no, item_code, item_name, qty, uom,
        line_due_date, unit_price, amount, tax_rate, partial_allowed
      FROM sales_order_lines 
      WHERE sales_order_id = ?
      ORDER BY line_no
    `).all(id);

    res.json({ ...(order as object), lines });

  } catch (error) {
    console.error('Sales order fetch error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch sales order',
      message: 'Database error occurred'
    });
  }
});

// POST /api/sales-orders/:id/confirm - Confirm a sales order
router.post('/sales-orders/:id/confirm', validateAccessCode, async (req, res) => {
  try {
    const db = sqliteInitializer.getDatabase();
    const { id } = req.params;

    // Get current order
    const order = db.prepare('SELECT * FROM sales_orders WHERE id = ?').get(id) as any;

    if (!order) {
      return res.status(404).json({ error: 'Sales order not found' });
    }

    if (order.status !== 'draft') {
      return res.status(409).json({ error: 'Order is already confirmed or closed' });
    }

    // Generate so_no if not exists
    let soNo = order.so_no;
    if (!soNo) {
      const count = db.prepare('SELECT COUNT(*) as count FROM sales_orders WHERE so_no IS NOT NULL').get() as { count: number };
      soNo = `SO-${String(count.count + 1).padStart(6, '0')}`;
    }

    const now = new Date().toISOString();

    // Update to confirmed status
    db.prepare(`
      UPDATE sales_orders 
      SET status = 'confirmed', so_no = ?, updated_at = ?
      WHERE id = ?
    `).run(soNo, now, id);

    // Return updated order
    const updatedOrder = db.prepare('SELECT * FROM sales_orders WHERE id = ?').get(id);

    res.json(updatedOrder);

  } catch (error) {
    console.error('Sales order confirm error:', error);
    res.status(500).json({ 
      error: 'Failed to confirm sales order',
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