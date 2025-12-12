// Production Management MVP - API Routes
import { Router } from 'express';
import { ProductionDAO } from '../dao/production-dao.js';
import { 
  insertOrderSchema, 
  insertProcurementSchema, 
  insertWorkerLogSchema,
  insertTaskSchema,
  insertWorkLogSchema,
  updateOrderSchema,
  updateProcurementSchema,
  updateTaskSchema,
  updateWorkLogSchema
} from '../../shared/production-schema.js';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';
import multer from 'multer';
import { parse } from 'csv-parse/sync';

dayjs.extend(utc);
dayjs.extend(timezone);

// Configure multer for CSV upload
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

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
const toUTC = (dateStr: string | null | undefined): string | null => {
  // Handle empty/null/undefined values
  if (!dateStr || dateStr === '') return null;
  
  // For YYYY-MM-DD format (from HTML date inputs), treat as JST midnight
  if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return dayjs.tz(dateStr, 'Asia/Tokyo').utc().toISOString();
  }
  // For ISO datetime strings, parse and convert
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

// GET /api/production/orders - List orders with KPIs
router.get('/api/production/orders', async (req, res) => {
  try {
    const { 
      from, 
      to, 
      search, 
      page = '1', 
      page_size = '20' 
    } = req.query as Record<string, string>;

    const options = {
      from: from ? toUTC(from) : undefined,
      to: to ? toUTC(to) : undefined,
      search,
      page: parseInt(page),
      pageSize: parseInt(page_size)
    };

    const result = await dao.getOrders(options);

    // Helper to convert SQLite boolean (0/1/null) to JavaScript boolean (true/false/null)
    const toBool = (val: any): boolean | null => {
      if (val === null || val === undefined) return null;
      return val === 1 || val === true;
    };

    // Convert dates to JST and booleans from SQLite integers for response
    const ordersWithJST = result.orders.map(order => ({
      ...order,
      // Convert date fields to JST
      order_date: order.order_date ? toJST(order.order_date) : null,
      start_date: order.start_date ? toJST(order.start_date) : null,
      due_date: order.due_date ? toJST(order.due_date) : null,
      delivery_date: order.delivery_date ? toJST(order.delivery_date) : null,
      confirmed_date: order.confirmed_date ? toJST(order.confirmed_date) : null,
      created_at: toJST(order.created_at),
      updated_at: toJST(order.updated_at),
      // Convert boolean flags from SQLite integers (0/1/null) to actual booleans, preserving null
      is_delivered: toBool(order.is_delivered),
      has_shipping_fee: toBool(order.has_shipping_fee),
      is_amount_confirmed: toBool(order.is_amount_confirmed),
      is_invoiced: toBool(order.is_invoiced),
      // Convert KPI dates to JST for consistency, guard against empty strings
      kpi: order.kpi ? {
        ...order.kpi,
        start_date: order.kpi.start_date ? toJST(order.kpi.start_date) : undefined,
        due_date: order.kpi.due_date && order.kpi.due_date !== '' ? toJST(order.kpi.due_date) : '',
      } : null,
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

// GET /api/production/orders/gantt - Get orders for Gantt chart
router.get('/api/production/orders/gantt', async (req, res) => {
  try {
    const ganttData = await dao.getOrdersForGantt();
    
    // Convert dates to JST for frontend display
    const convertedData = ganttData.map(item => ({
      id: item.id,
      name: item.name,
      start: item.start ? toJST(item.start) : null,
      end: item.end ? toJST(item.end) : null,
      progress: item.progress
    }));
    
    res.json(convertedData);
  } catch (error) {
    console.error('Gantt data error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to fetch Gantt data'
    });
  }
});

// GET /api/production/gantt/hierarchy - Get hierarchical Gantt data (projects -> tasks)
router.get('/api/production/gantt/hierarchy', async (req, res) => {
  try {
    const hierarchyData = await dao.getGanttHierarchy();
    
    const convertedData = hierarchyData.map(project => ({
      orderId: project.orderId,
      projectName: project.projectName,
      tasks: project.tasks.map(task => ({
        id: task.id,
        taskName: task.taskName,
        startDate: task.startDate ? toJST(task.startDate) : null,
        endDate: task.endDate ? toJST(task.endDate) : null,
        progress: task.progress,
        type: task.type
      }))
    }));
    
    res.json(convertedData);
  } catch (error) {
    console.error('Gantt hierarchy data error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to fetch Gantt hierarchy data'
    });
  }
});

// GET /api/production/orders/:id - Get order details with KPI
router.get('/api/production/orders/:id', async (req, res) => {
  try {
    const orderId = req.params.id;
    const result = await dao.getOrderById(orderId);

    if (!result.order) {
      return res.status(404).json({ 
        error: 'Not found',
        message: 'Order not found' 
      });
    }

    // Helper to convert SQLite boolean (0/1/null) to JavaScript boolean (true/false/null)
    const toBool = (val: any): boolean | null => {
      if (val === null || val === undefined) return null;
      return val === 1 || val === true;
    };

    // Convert dates to JST and booleans for response
    const response = {
      order: {
        ...result.order,
        // Convert date fields to JST
        order_date: result.order.order_date ? toJST(result.order.order_date) : null,
        start_date: result.order.start_date ? toJST(result.order.start_date) : null,
        due_date: result.order.due_date ? toJST(result.order.due_date) : null,
        delivery_date: result.order.delivery_date ? toJST(result.order.delivery_date) : null,
        confirmed_date: result.order.confirmed_date ? toJST(result.order.confirmed_date) : null,
        created_at: toJST(result.order.created_at),
        updated_at: toJST(result.order.updated_at),
        // Convert boolean flags
        is_delivered: toBool(result.order.is_delivered),
        has_shipping_fee: toBool(result.order.has_shipping_fee),
        is_amount_confirmed: toBool(result.order.is_amount_confirmed),
        is_invoiced: toBool(result.order.is_invoiced),
      },
      kpi: result.kpi ? {
        ...result.kpi,
        start_date: result.kpi.start_date ? toJST(result.kpi.start_date) : undefined,
        due_date: result.kpi.due_date && result.kpi.due_date !== '' ? toJST(result.kpi.due_date) : ''
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

// POST /api/production/orders - Create new order
router.post('/api/production/orders', async (req, res) => {
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

    // Convert date fields, handling empty strings
    const orderData = {
      ...validation.data,
      order_date: validation.data.order_date && validation.data.order_date !== '' ? toUTC(validation.data.order_date) : undefined,
      start_date: validation.data.start_date && validation.data.start_date !== '' ? toUTC(validation.data.start_date) : undefined,
      due_date: validation.data.due_date && validation.data.due_date !== '' ? toUTC(validation.data.due_date) : undefined,
      delivery_date: validation.data.delivery_date && validation.data.delivery_date !== '' ? toUTC(validation.data.delivery_date) : undefined,
      confirmed_date: validation.data.confirmed_date && validation.data.confirmed_date !== '' ? toUTC(validation.data.confirmed_date) : undefined,
    };

    const orderId = await dao.createOrder(orderData);
    
    // Fetch the created order to return full object
    const result = await dao.getOrderById(orderId);
    
    if (!result.order) {
      return res.status(500).json({ 
        error: 'Internal server error',
        message: 'Failed to fetch created order'
      });
    }

    // Convert dates to JST for response
    const createdOrder = {
      ...result.order,
      start_date: result.order.start_date ? toJST(result.order.start_date) : result.order.start_date,
      due_date: toJST(result.order.due_date),
      created_at: toJST(result.order.created_at),
      updated_at: toJST(result.order.updated_at)
    };

    res.status(201).json(createdOrder);

  } catch (error) {
    console.error('Order creation error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to create order'
    });
  }
});

// PATCH /api/production/orders/:id - Update order
router.patch('/api/production/orders/:id', async (req, res) => {
  try {
    const orderId = req.params.id;
    if (!orderId || typeof orderId !== 'string') {
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

    // Convert date fields to UTC if provided, handling empty strings
    // Empty strings are converted to null to allow clearing existing dates
    if (updates.order_date && updates.order_date !== '') {
      updates.order_date = toUTC(updates.order_date);
    } else if (updates.order_date === '') {
      updates.order_date = null as any;  // Explicitly set to null to clear the field
    }
    if (updates.start_date && updates.start_date !== '') {
      updates.start_date = toUTC(updates.start_date);
    } else if (updates.start_date === '') {
      updates.start_date = null as any;
    }
    if (updates.due_date && updates.due_date !== '') {
      updates.due_date = toUTC(updates.due_date);
    } else if (updates.due_date === '') {
      updates.due_date = null as any;
    }
    if (updates.delivery_date && updates.delivery_date !== '') {
      updates.delivery_date = toUTC(updates.delivery_date);
    } else if (updates.delivery_date === '') {
      updates.delivery_date = null as any;
    }
    if (updates.confirmed_date && updates.confirmed_date !== '') {
      updates.confirmed_date = toUTC(updates.confirmed_date);
    } else if (updates.confirmed_date === '') {
      updates.confirmed_date = null as any;
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

// DELETE /api/production/orders/:id - Delete order
router.delete('/api/production/orders/:id', async (req, res) => {
  try {
    const orderId = req.params.id;
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
      orderId: order_id || undefined,
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
      orderId: order_id || undefined,
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

// ========== Tasks API (作業計画) ==========

// GET /api/tasks - List tasks
router.get('/api/tasks', async (req, res) => {
  try {
    const { 
      order_id, 
      status, 
      from, 
      to, 
      page = '1', 
      page_size = '20' 
    } = req.query as Record<string, string>;

    const options = {
      order_id: order_id || undefined,
      status,
      from: from ? toUTC(from) : undefined,
      to: to ? toUTC(to) : undefined,
      page: parseInt(page),
      pageSize: parseInt(page_size)
    };

    const result = await dao.getTasks(options);

    // Return dates in ISO 8601 format for consistent parsing
    const tasksWithISO = result.tasks.map(task => ({
      ...task,
      planned_start: task.planned_start,  // Already in ISO format from DB
      planned_end: task.planned_end
    }));

    res.json({
      data: tasksWithISO,
      meta: {
        total: result.total,
        page: parseInt(page),
        page_size: parseInt(page_size),
        total_pages: Math.ceil(result.total / parseInt(page_size))
      }
    });

  } catch (error) {
    console.error('Tasks list error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to fetch tasks'
    });
  }
});

// GET /api/tasks/:id - Get task by ID
router.get('/api/tasks/:id', async (req, res) => {
  try {
    const taskId = parseInt(req.params.id);
    const task = await dao.getTaskById(taskId);

    if (!task) {
      return res.status(404).json({ 
        error: 'Not found',
        message: 'Task not found' 
      });
    }

    // Return dates in ISO format
    const taskWithISO = {
      ...task,
      planned_start: task.planned_start,  // Already in ISO format from DB
      planned_end: task.planned_end
    };

    res.json(taskWithISO);

  } catch (error) {
    console.error('Task get error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to fetch task'
    });
  }
});

// POST /api/tasks - Create new task
router.post('/api/tasks', async (req, res) => {
  try {
    const validatedData = insertTaskSchema.parse(req.body);

    // Convert dates to UTC before storing
    const taskData = {
      ...validatedData,
      planned_start: toUTC(validatedData.planned_start),
      planned_end: toUTC(validatedData.planned_end)
    };

    const taskId = await dao.createTask(taskData);
    const task = await dao.getTaskById(taskId);

    if (task) {
      // Return in ISO format
      const taskWithISO = {
        ...task,
        planned_start: task.planned_start,  // Already in ISO format from DB
        planned_end: task.planned_end
      };
      res.status(201).json(taskWithISO);
    } else {
      throw new Error('Failed to retrieve created task');
    }

  } catch (error: any) {
    console.error('Task creation error:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ 
        error: 'Validation error',
        details: error.errors 
      });
    }
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to create task'
    });
  }
});

// PATCH /api/tasks/:id - Update task
router.patch('/api/tasks/:id', async (req, res) => {
  try {
    const taskId = parseInt(req.params.id);
    const validatedData = updateTaskSchema.parse(req.body);

    // Convert dates to UTC if present
    const updateData: any = { ...validatedData };
    if (updateData.planned_start) {
      updateData.planned_start = toUTC(updateData.planned_start);
    }
    if (updateData.planned_end) {
      updateData.planned_end = toUTC(updateData.planned_end);
    }

    const success = await dao.updateTask(taskId, updateData);

    if (!success) {
      return res.status(404).json({ 
        error: 'Not found',
        message: 'Task not found or no changes made' 
      });
    }

    res.json({ message: 'Task updated successfully' });

  } catch (error: any) {
    console.error('Task update error:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ 
        error: 'Validation error',
        details: error.errors 
      });
    }
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to update task'
    });
  }
});

// DELETE /api/tasks/:id - Delete task
router.delete('/api/tasks/:id', async (req, res) => {
  try {
    const taskId = parseInt(req.params.id);
    const success = await dao.deleteTask(taskId);

    if (!success) {
      return res.status(404).json({ 
        error: 'Not found',
        message: 'Task not found' 
      });
    }

    res.json({ message: 'Task deleted successfully' });

  } catch (error) {
    console.error('Task deletion error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to delete task'
    });
  }
});

// ========== Work Logs API ==========

// GET /api/work-logs - List work logs with filters
router.get('/api/work-logs', async (req, res) => {
  try {
    const { 
      date,
      worker,
      order_id,
      status 
    } = req.query as Record<string, string | undefined>;

    const options = {
      date: date ? toUTC(date) : undefined,
      worker,
      order_id: order_id || undefined,
      status
    };

    const result = await dao.getWorkLogs(options);

    // Convert dates to JST for response
    const workLogsWithJST = result.logs.map(log => ({
      ...log,
      date: toJST(log.date),
      created_at: toJST(log.created_at)
    }));

    res.json({ 
      data: workLogsWithJST,
      total: result.total 
    });

  } catch (error) {
    console.error('Work logs list error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to fetch work logs'
    });
  }
});

// POST /api/work-logs - Create new work log
router.post('/api/work-logs', async (req, res) => {
  try {
    const validatedData = insertWorkLogSchema.parse(req.body);

    // Convert date to UTC
    const workLogData = {
      ...validatedData,
      date: toUTC(validatedData.date)
    };

    // Check for overlap (only if start_time and end_time are provided)
    let overlap: any[] = [];
    if (workLogData.start_time && workLogData.end_time) {
      overlap = await dao.checkWorkLogOverlap(
        workLogData.worker,
        workLogData.date,
        workLogData.start_time,
        workLogData.end_time
      );
    }

    const workLogId = await dao.createWorkLog(workLogData);

    res.status(201).json({ 
      id: workLogId,
      hasOverlap: overlap.length > 0,
      overlappingLogs: overlap,
      message: 'Work log created successfully'
    });

  } catch (error: any) {
    console.error('Work log creation error:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ 
        error: 'Validation error',
        details: error.errors 
      });
    }
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to create work log'
    });
  }
});

// PATCH /api/work-logs/:id - Update work log
router.patch('/api/work-logs/:id', async (req, res) => {
  try {
    const workLogId = parseInt(req.params.id);
    const validatedData = updateWorkLogSchema.parse(req.body);

    // Convert date to UTC if present
    const updateData: any = { ...validatedData };
    if (updateData.date) {
      updateData.date = toUTC(updateData.date);
    }

    const success = await dao.updateWorkLog(workLogId, updateData);

    if (!success) {
      return res.status(404).json({ 
        error: 'Not found',
        message: 'Work log not found or no changes made' 
      });
    }

    res.json({ message: 'Work log updated successfully' });

  } catch (error: any) {
    console.error('Work log update error:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ 
        error: 'Validation error',
        details: error.errors 
      });
    }
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to update work log'
    });
  }
});

// DELETE /api/work-logs/:id - Delete work log
router.delete('/api/work-logs/:id', async (req, res) => {
  try {
    const workLogId = parseInt(req.params.id);
    const success = await dao.deleteWorkLog(workLogId);

    if (!success) {
      return res.status(404).json({ 
        error: 'Not found',
        message: 'Work log not found' 
      });
    }

    res.json({ message: 'Work log deleted successfully' });

  } catch (error) {
    console.error('Work log deletion error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to delete work log'
    });
  }
});

// POST /api/work-logs/upload-csv - Upload Harmos CSV
router.post('/api/work-logs/upload-csv', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        error: 'Bad request',
        message: 'No file uploaded' 
      });
    }

    const csvContent = req.file.buffer.toString('utf-8');
    
    // Parse CSV (assuming headers: 日付,氏名,取引先,プロジェクト,業務_大_,業務_中_,業務_小_,業務名,業務時間_予定_,業務時間_実績_,総労働時間,備考)
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      bom: true, // Handle BOM in UTF-8 files
      trim: true
    });

    // Helper function to extract order number from work_name (e.g., "k001" from text)
    const extractOrderNo = (workName: string | undefined): string | null => {
      if (!workName) return null;
      const match = workName.match(/k\d{3}/i);
      return match ? match[0].toLowerCase() : null;
    };

    // Process each record
    const insertedCount = {
      total: records.length,
      success: 0,
      failed: 0,
      errors: [] as string[]
    };

    for (const record of records) {
      try {
        const orderNo = extractOrderNo(record['業務名']);
        
        const workLogData = {
          work_date: record['日付'],
          employee_name: record['氏名'],
          client_name: record['取引先'],
          project_name: record['プロジェクト'],
          task_large: record['業務_大_'],
          task_medium: record['業務_中_'],
          task_small: record['業務_小_'],
          work_name: record['業務名'],
          planned_time: record['業務時間_予定_'],
          actual_time: record['業務時間_実績_'],
          total_work_time: record['総労働時間'],
          note: record['備考'],
          order_no: orderNo,
          order_id: null, // Will be linked later
          match_status: orderNo ? 'temp' : 'unlinked',
          source: 'harmos'
        };

        await dao.createWorkLog(workLogData);
        insertedCount.success++;
      } catch (error: any) {
        insertedCount.failed++;
        insertedCount.errors.push(`Row error: ${error.message}`);
      }
    }

    res.status(201).json({
      message: 'CSV upload completed',
      summary: insertedCount
    });

  } catch (error: any) {
    console.error('CSV upload error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to upload CSV',
      details: error.message
    });
  }
});

// ========== Materials Master API ==========

// GET /api/materials - Get all materials with optional filters
router.get('/api/materials', async (req, res) => {
  try {
    const { material_type, search } = req.query;
    
    const materials = await dao.getMaterials({
      material_type: material_type as string | undefined,
      search: search as string | undefined,
    });
    
    res.json({ data: materials });
  } catch (error) {
    console.error('Get materials error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to fetch materials'
    });
  }
});

// GET /api/materials/types - Get distinct material types
router.get('/api/materials/types', async (req, res) => {
  try {
    const types = await dao.getMaterialTypes();
    res.json({ data: types });
  } catch (error) {
    console.error('Get material types error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to fetch material types'
    });
  }
});

// GET /api/materials/:id - Get material by ID
router.get('/api/materials/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid material ID' });
    }
    
    const material = await dao.getMaterialById(id);
    if (!material) {
      return res.status(404).json({ error: 'Material not found' });
    }
    
    res.json(material);
  } catch (error) {
    console.error('Get material error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to fetch material'
    });
  }
});

// POST /api/materials - Create a new material
router.post('/api/materials', async (req, res) => {
  try {
    const { insertMaterialSchema } = await import('../../shared/production-schema.js');
    const parseResult = insertMaterialSchema.safeParse(req.body);
    
    if (!parseResult.success) {
      return res.status(400).json({ 
        error: 'Validation error',
        details: parseResult.error.flatten().fieldErrors
      });
    }
    
    const id = await dao.createMaterial(parseResult.data);
    const created = await dao.getMaterialById(id);
    
    res.status(201).json(created);
  } catch (error) {
    console.error('Create material error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to create material'
    });
  }
});

// PATCH /api/materials/:id - Update a material
router.patch('/api/materials/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid material ID' });
    }
    
    const { insertMaterialSchema } = await import('../../shared/production-schema.js');
    const updateSchema = insertMaterialSchema.partial();
    const parseResult = updateSchema.safeParse(req.body);
    
    if (!parseResult.success) {
      return res.status(400).json({ 
        error: 'Validation error',
        details: parseResult.error.flatten().fieldErrors
      });
    }
    
    const validData = parseResult.data;
    if (Object.keys(validData).length === 0) {
      return res.status(400).json({ error: 'No valid fields provided for update' });
    }
    
    const updated = await dao.updateMaterial(id, validData);
    if (!updated) {
      return res.status(404).json({ error: 'Material not found' });
    }
    
    res.json({ message: 'Material updated successfully' });
  } catch (error) {
    console.error('Update material error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to update material'
    });
  }
});

// DELETE /api/materials/:id - Delete a material
router.delete('/api/materials/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid material ID' });
    }
    
    const deleted = await dao.deleteMaterial(id);
    if (!deleted) {
      return res.status(404).json({ error: 'Material not found' });
    }
    
    res.json({ message: 'Material deleted successfully' });
  } catch (error) {
    console.error('Delete material error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to delete material'
    });
  }
});

// ========== Material Usages API ==========

// GET /api/material-usages/summary - Get aggregated weight summary by project_id, zone, and material_type
// Query params:
//   project_id: filter by project
//   group_by_material_type: 'true' (default) or 'false'
router.get('/api/material-usages/summary', async (req, res) => {
  try {
    const { project_id, group_by_material_type } = req.query;
    
    const summary = await dao.getMaterialUsageSummary({
      project_id: project_id as string | undefined,
      group_by_material_type: group_by_material_type !== 'false',
    });
    
    res.json({ data: summary });
  } catch (error) {
    console.error('Get material usages summary error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to fetch material usages summary'
    });
  }
});

// GET /api/material-usages - Get material usages with filters
router.get('/api/material-usages', async (req, res) => {
  try {
    const { project_id, material_id, area, zone } = req.query;
    
    const usages = await dao.getMaterialUsages({
      project_id: project_id as string | undefined,
      material_id: material_id ? parseInt(material_id as string, 10) : undefined,
      area: area as string | undefined,
      zone: zone as string | undefined,
    });
    
    res.json({ data: usages });
  } catch (error) {
    console.error('Get material usages error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to fetch material usages'
    });
  }
});

// GET /api/material-usages/:id - Get a single material usage
router.get('/api/material-usages/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid material usage ID' });
    }
    
    const usage = await dao.getMaterialUsageById(id);
    if (!usage) {
      return res.status(404).json({ error: 'Material usage not found' });
    }
    
    res.json(usage);
  } catch (error) {
    console.error('Get material usage error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to fetch material usage'
    });
  }
});

// POST /api/material-usages - Create a new material usage
router.post('/api/material-usages', async (req, res) => {
  try {
    const { insertMaterialUsageSchema } = await import('../../shared/production-schema.js');
    const parseResult = insertMaterialUsageSchema.safeParse(req.body);
    
    if (!parseResult.success) {
      return res.status(400).json({ 
        error: 'Validation error',
        details: parseResult.error.flatten().fieldErrors
      });
    }
    
    const id = await dao.createMaterialUsage(parseResult.data);
    const created = await dao.getMaterialUsageById(id);
    
    res.status(201).json(created);
  } catch (error: any) {
    console.error('Create material usage error:', error);
    
    // Handle foreign key constraint errors
    if (error.code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
      return res.status(400).json({ 
        error: 'Invalid reference',
        message: 'Project ID or Material ID does not exist'
      });
    }
    
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to create material usage'
    });
  }
});

// PATCH /api/material-usages/:id - Update a material usage
router.patch('/api/material-usages/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid material usage ID' });
    }
    
    const { insertMaterialUsageSchema } = await import('../../shared/production-schema.js');
    const updateSchema = insertMaterialUsageSchema.partial();
    const parseResult = updateSchema.safeParse(req.body);
    
    if (!parseResult.success) {
      return res.status(400).json({ 
        error: 'Validation error',
        details: parseResult.error.flatten().fieldErrors
      });
    }
    
    const validData = parseResult.data;
    if (Object.keys(validData).length === 0) {
      return res.status(400).json({ error: 'No valid fields provided for update' });
    }
    
    const updated = await dao.updateMaterialUsage(id, validData);
    if (!updated) {
      return res.status(404).json({ error: 'Material usage not found' });
    }
    
    const result = await dao.getMaterialUsageById(id);
    res.json(result);
  } catch (error: any) {
    console.error('Update material usage error:', error);
    
    if (error.code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
      return res.status(400).json({ 
        error: 'Invalid reference',
        message: 'Project ID or Material ID does not exist'
      });
    }
    
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to update material usage'
    });
  }
});

// DELETE /api/material-usages/:id - Delete a material usage
router.delete('/api/material-usages/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid material usage ID' });
    }
    
    const deleted = await dao.deleteMaterialUsage(id);
    if (!deleted) {
      return res.status(404).json({ error: 'Material usage not found' });
    }
    
    res.json({ message: 'Material usage deleted successfully' });
  } catch (error) {
    console.error('Delete material usage error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to delete material usage'
    });
  }
});

export default router;