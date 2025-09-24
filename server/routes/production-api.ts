// Production Management MVP - API Routes
import { Router } from 'express';
import { ProductionDAO } from '../dao/production-dao.js';
import { 
  insertOrderSchema, 
  insertProcurementSchema, 
  insertWorkerLogSchema,
  updateOrderSchema,
  updateProcurementSchema
} from '../../shared/production-schema.js';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';

dayjs.extend(utc);
dayjs.extend(timezone);

const router = Router();
let dao: ProductionDAO;

// Initialize DAO
try {
  dao = new ProductionDAO();
  console.log('✓ Production DAO initialized successfully');
} catch (error) {
  console.error('✗ Failed to initialize Production DAO:', error);
}

// UTC/JST conversion helpers
const toUTC = (dateStr: string): string => {
  return dayjs(dateStr).tz('Asia/Tokyo').utc().toISOString();
};

const toJST = (utcStr: string): string => {
  return dayjs(utcStr).utc().tz('Asia/Tokyo').format();
};

// Health check for production API
router.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'production-management-mvp'
  });
});

// Root API info
router.get('/api', (req, res) => {
  res.json({
    message: '生産管理ミニMVP API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      orders: '/api/orders',
      procurements: '/api/procurements',
      'workers-log': '/api/workers-log',
      'kpi-summary': '/api/kpi/summary',
      calendar: '/api/calendar',
      'csv-export': '/api/exports/orders.csv'
    }
  });
});

// ========== Orders API ==========

// GET /api/orders - List orders with KPIs
router.get('/api/orders', async (req, res) => {
  try {
    const { 
      from, 
      to, 
      q, 
      page = '1', 
      page_size = '20' 
    } = req.query as Record<string, string>;

    const options = {
      from: from ? toUTC(from) : undefined,
      to: to ? toUTC(to) : undefined,
      q,
      page: parseInt(page),
      pageSize: parseInt(page_size)
    };

    const result = await dao.getOrders(options);

    // Convert dates to JST for response
    const ordersWithJST = result.orders.map(order => ({
      ...order,
      due_date: toJST(order.due_date)
    }));

    res.json({
      data: ordersWithJST,
      meta: {
        total: result.total,
        page: parseInt(page),
        page_size: parseInt(page_size),
        total_pages: Math.ceil(result.total / parseInt(page_size))
      }
    });

  } catch (error) {
    console.error('Orders list error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to fetch orders'
    });
  }
});

// GET /api/orders/:id - Get order details with KPI
router.get('/api/orders/:id', async (req, res) => {
  try {
    const orderId = parseInt(req.params.id);
    const result = await dao.getOrderById(orderId);

    if (!result.order) {
      return res.status(404).json({ 
        error: 'Not found',
        message: 'Order not found' 
      });
    }

    // Convert dates to JST
    const response = {
      order: {
        ...result.order,
        due_date: toJST(result.order.due_date),
        created_at: toJST(result.order.created_at),
        updated_at: toJST(result.order.updated_at)
      },
      kpi: result.kpi ? {
        ...result.kpi,
        due_date: toJST(result.kpi.due_date)
      } : null,
      procurements: result.procurements.map(p => ({
        ...p,
        eta: p.eta ? toJST(p.eta) : null,
        received_at: p.received_at ? toJST(p.received_at) : null,
        completed_at: p.completed_at ? toJST(p.completed_at) : null,
        created_at: toJST(p.created_at)
      })),
      workerLogs: result.workerLogs.map(w => ({
        ...w,
        date: toJST(w.date),
        created_at: toJST(w.created_at)
      }))
    };

    res.json(response);

  } catch (error) {
    console.error('Order details error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to fetch order details'
    });
  }
});

// POST /api/orders - Create new order
router.post('/api/orders', async (req, res) => {
  try {
    // Validate request body
    const validation = insertOrderSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({ 
        error: 'Validation error',
        message: 'Invalid order data',
        details: validation.error.errors
      });
    }

    const orderData = {
      ...validation.data,
      due_date: toUTC(validation.data.due_date)
    };

    const orderId = await dao.createOrder(orderData);

    res.status(201).json({ 
      order_id: orderId,
      message: 'Order created successfully' 
    });

  } catch (error) {
    console.error('Order creation error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to create order'
    });
  }
});

// PATCH /api/orders/:id - Update order
router.patch('/api/orders/:id', async (req, res) => {
  try {
    const orderId = parseInt(req.params.id);
    if (isNaN(orderId)) {
      return res.status(400).json({ error: 'Invalid order ID' });
    }

    // Validate request body using Zod schema for security
    const validation = updateOrderSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ 
        error: 'Invalid request data',
        details: validation.error.issues
      });
    }

    const updates = validation.data;
    
    // Check if there are any valid updates
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid updates provided' });
    }

    // Convert due_date to UTC if provided
    if (updates.due_date) {
      updates.due_date = toUTC(updates.due_date);
    }

    const success = await dao.updateOrder(orderId, updates);

    if (!success) {
      return res.status(404).json({ 
        error: 'Not found',
        message: 'Order not found or no changes made' 
      });
    }

    res.json({ 
      message: 'Order updated successfully' 
    });

  } catch (error) {
    console.error('Order update error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to update order'
    });
  }
});

// DELETE /api/orders/:id - Delete order
router.delete('/api/orders/:id', async (req, res) => {
  try {
    const orderId = parseInt(req.params.id);
    const success = await dao.deleteOrder(orderId);

    if (!success) {
      return res.status(404).json({ 
        error: 'Not found',
        message: 'Order not found' 
      });
    }

    res.json({ 
      message: 'Order deleted successfully' 
    });

  } catch (error) {
    console.error('Order deletion error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to delete order'
    });
  }
});

// ========== Procurements API ==========

// GET /api/procurements - List procurements
router.get('/api/procurements', async (req, res) => {
  try {
    const { 
      order_id, 
      kind, 
      status, 
      page = '1', 
      page_size = '50' 
    } = req.query as Record<string, string>;

    const options = {
      orderId: order_id ? parseInt(order_id) : undefined,
      kind: kind as 'purchase' | 'manufacture' | undefined,
      status,
      page: parseInt(page),
      pageSize: parseInt(page_size)
    };

    const result = await dao.getProcurements(options);

    // Convert dates to JST
    const procurementsWithJST = result.procurements.map(p => ({
      ...p,
      eta: p.eta ? toJST(p.eta) : null,
      received_at: p.received_at ? toJST(p.received_at) : null,
      completed_at: p.completed_at ? toJST(p.completed_at) : null,
      created_at: toJST(p.created_at)
    }));

    res.json({
      data: procurementsWithJST,
      meta: {
        total: result.total,
        page: parseInt(page),
        page_size: parseInt(page_size),
        total_pages: Math.ceil(result.total / parseInt(page_size))
      }
    });

  } catch (error) {
    console.error('Procurements list error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to fetch procurements'
    });
  }
});

// POST /api/procurements - Create procurement
router.post('/api/procurements', async (req, res) => {
  try {
    // Validate request body
    const validation = insertProcurementSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({ 
        error: 'Validation error',
        message: 'Invalid procurement data',
        details: validation.error.errors
      });
    }

    const procData = {
      ...validation.data,
      eta: validation.data.eta ? toUTC(validation.data.eta) : null,
      received_at: validation.data.received_at ? toUTC(validation.data.received_at) : null,
      completed_at: validation.data.completed_at ? toUTC(validation.data.completed_at) : null,
    };

    const procId = await dao.createProcurement(procData);

    res.status(201).json({ 
      id: procId,
      message: 'Procurement created successfully' 
    });

  } catch (error) {
    console.error('Procurement creation error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to create procurement'
    });
  }
});

// PATCH /api/procurements/:id - Update procurement
router.patch('/api/procurements/:id', async (req, res) => {
  try {
    const procId = parseInt(req.params.id);
    if (isNaN(procId)) {
      return res.status(400).json({ error: 'Invalid procurement ID' });
    }

    // Validate request body using Zod schema for security
    const validation = updateProcurementSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ 
        error: 'Invalid request data',
        details: validation.error.issues
      });
    }

    const updates = validation.data;
    
    // Check if there are any valid updates
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid updates provided' });
    }

    // Convert dates to UTC if provided
    if (updates.eta) updates.eta = toUTC(updates.eta);
    if (updates.received_at) updates.received_at = toUTC(updates.received_at);
    if (updates.completed_at) updates.completed_at = toUTC(updates.completed_at);

    const success = await dao.updateProcurement(procId, updates);

    if (!success) {
      return res.status(404).json({ 
        error: 'Not found',
        message: 'Procurement not found or no changes made' 
      });
    }

    res.json({ 
      message: 'Procurement updated successfully' 
    });

  } catch (error) {
    console.error('Procurement update error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to update procurement'
    });
  }
});

// DELETE /api/procurements/:id - Delete procurement
router.delete('/api/procurements/:id', async (req, res) => {
  try {
    const procId = parseInt(req.params.id);
    const success = await dao.deleteProcurement(procId);

    if (!success) {
      return res.status(404).json({ 
        error: 'Not found',
        message: 'Procurement not found' 
      });
    }

    res.json({ 
      message: 'Procurement deleted successfully' 
    });

  } catch (error) {
    console.error('Procurement deletion error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to delete procurement'
    });
  }
});

// ========== Worker Logs API ==========

// GET /api/workers-log - List worker logs
router.get('/api/workers-log', async (req, res) => {
  try {
    const { 
      order_id, 
      worker, 
      from, 
      to, 
      page = '1', 
      page_size = '50' 
    } = req.query as Record<string, string>;

    const options = {
      orderId: order_id ? parseInt(order_id) : undefined,
      worker,
      from: from ? toUTC(from) : undefined,
      to: to ? toUTC(to) : undefined,
      page: parseInt(page),
      pageSize: parseInt(page_size)
    };

    const result = await dao.getWorkerLogs(options);

    // Convert dates to JST
    const logsWithJST = result.logs.map(log => ({
      ...log,
      date: toJST(log.date),
      created_at: toJST(log.created_at)
    }));

    res.json({
      data: logsWithJST,
      meta: {
        total: result.total,
        page: parseInt(page),
        page_size: parseInt(page_size),
        total_pages: Math.ceil(result.total / parseInt(page_size))
      }
    });

  } catch (error) {
    console.error('Worker logs list error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to fetch worker logs'
    });
  }
});

// POST /api/workers-log - Create worker log
router.post('/api/workers-log', async (req, res) => {
  try {
    // Validate request body
    const validation = insertWorkerLogSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({ 
        error: 'Validation error',
        message: 'Invalid worker log data',
        details: validation.error.errors
      });
    }

    const logData = {
      ...validation.data,
      date: toUTC(validation.data.date)
    };

    const logId = await dao.createWorkerLog(logData);

    res.status(201).json({ 
      id: logId,
      message: 'Worker log created successfully' 
    });

  } catch (error) {
    console.error('Worker log creation error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to create worker log'
    });
  }
});

// DELETE /api/workers-log/:id - Delete worker log
router.delete('/api/workers-log/:id', async (req, res) => {
  try {
    const logId = parseInt(req.params.id);
    const success = await dao.deleteWorkerLog(logId);

    if (!success) {
      return res.status(404).json({ 
        error: 'Not found',
        message: 'Worker log not found' 
      });
    }

    res.json({ 
      message: 'Worker log deleted successfully' 
    });

  } catch (error) {
    console.error('Worker log deletion error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to delete worker log'
    });
  }
});

// ========== KPI & Analytics API ==========

// GET /api/kpi/summary - Dashboard KPIs
router.get('/api/kpi/summary', async (req, res) => {
  try {
    const { from, to } = req.query as Record<string, string>;

    const options = {
      from: from ? toUTC(from) : undefined,
      to: to ? toUTC(to) : undefined
    };

    const kpi = await dao.getDashboardKPI(options);

    res.json(kpi);

  } catch (error) {
    console.error('Dashboard KPI error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to fetch dashboard KPIs'
    });
  }
});

// GET /api/calendar - Calendar events
router.get('/api/calendar', async (req, res) => {
  try {
    const { from, to } = req.query as Record<string, string>;

    const options = {
      from: from ? toUTC(from) : undefined,
      to: to ? toUTC(to) : undefined
    };

    const events = await dao.getCalendarEvents(options);

    // Convert dates to JST
    const eventsWithJST = events.map(event => ({
      ...event,
      date: toJST(event.date)
    }));

    res.json({
      events: eventsWithJST
    });

  } catch (error) {
    console.error('Calendar events error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to fetch calendar events'
    });
  }
});

// GET /api/exports/orders.csv - CSV export
router.get('/api/exports/orders.csv', async (req, res) => {
  try {
    const { from, to } = req.query as Record<string, string>;

    const options = {
      from: from ? toUTC(from) : undefined,
      to: to ? toUTC(to) : undefined
    };

    const data = await dao.getCSVData(options);

    // Generate CSV
    const headers = [
      'order_id', 'product_name', 'qty', 'due_date', 'sales',
      'material_unit_cost', 'std_time_per_unit', 'wage_rate',
      'material_cost', 'labor_cost', 'gross_profit', 
      'actual_time_per_unit', 'variance_pct'
    ];

    const csvRows = [
      headers.join(','),
      ...data.map(order => [
        order.order_id,
        `"${order.product_name}"`,
        order.qty,
        `"${toJST(order.due_date)}"`,
        order.sales,
        order.material_cost / order.qty, // material_unit_cost approximation
        '', // std_time_per_unit (would need to get from orders table)
        '', // wage_rate (would need to get from orders table)
        order.material_cost,
        order.labor_cost,
        order.gross_profit,
        order.actual_time_per_unit,
        order.variance_pct.toFixed(2)
      ].join(','))
    ];

    const csv = csvRows.join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="orders.csv"');
    res.send(csv);

  } catch (error) {
    console.error('CSV export error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to generate CSV export'
    });
  }
});

// ========== Utility Endpoints ==========

// GET /api/orders-dropdown - Orders for dropdown selection
router.get('/api/orders-dropdown', async (req, res) => {
  try {
    const orders = await dao.getOrdersForDropdown();
    res.json({ data: orders });
  } catch (error) {
    console.error('Orders dropdown error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to fetch orders for dropdown'
    });
  }
});

// GET /api/workers - List of workers
router.get('/api/workers', async (req, res) => {
  try {
    const workers = await dao.getWorkers();
    res.json({ data: workers });
  } catch (error) {
    console.error('Workers list error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to fetch workers'
    });
  }
});

export default router;