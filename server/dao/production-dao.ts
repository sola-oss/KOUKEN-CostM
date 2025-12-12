// Production Management MVP - Data Access Object
import Database from 'better-sqlite3';
import { MetricsService } from '../services/metrics.js';
import type { 
  Order, Procurement, WorkerLog, Task, WorkLog, Material, MaterialUsage, MaterialUsageWithMaterial,
  InsertOrder, InsertProcurement, InsertWorkerLog, InsertTask, InsertWorkLog, InsertMaterial, InsertMaterialUsage,
  OrderKPI, DashboardKPI, CalendarEvent 
} from '../../shared/production-schema.js';

export class ProductionDAO {
  private db: Database.Database;
  private metricsService: MetricsService;

  constructor(dbPath: string = process.env.DB_PATH || './server/db/production.sqlite') {
    this.db = new Database(dbPath);
    this.metricsService = new MetricsService(this.db);
    
    // Enable foreign keys
    this.db.pragma('foreign_keys = ON');
  }

  // ========== Orders CRUD ==========
  
  async createOrder(orderData: InsertOrder): Promise<string> {
    const now = new Date().toISOString();
    
    // If order_id is specified, use it; otherwise, generate next numeric string ID
    let orderId = orderData.order_id;
    
    if (!orderId) {
      // Generate next ID by finding max numeric order_id and incrementing
      const maxIdRow = this.db.prepare(`
        SELECT order_id FROM orders 
        WHERE order_id GLOB '[0-9]*'
        ORDER BY CAST(order_id AS INTEGER) DESC 
        LIMIT 1
      `).get() as { order_id: string } | undefined;
      
      const nextNumericId = maxIdRow ? parseInt(maxIdRow.order_id, 10) + 1 : 1;
      orderId = String(nextNumericId);
    }
    
    const stmt = this.db.prepare(`
      INSERT INTO orders (
        order_id, order_date, client_name, manager, client_order_no, project_title,
        is_delivered, has_shipping_fee, is_amount_confirmed, is_invoiced,
        due_date, delivery_date, confirmed_date,
        estimated_amount, invoiced_amount, invoice_month,
        subcontractor, processing_hours, note,
        product_name, qty, start_date, sales, estimated_material_cost,
        std_time_per_unit, status, customer_name,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    // Helper to convert boolean to SQLite (true→1, false→0, null/undefined→null)
    const toBoolInt = (val: boolean | null | undefined): number | null => {
      if (val === null || val === undefined) return null;
      return val ? 1 : 0;
    };

    stmt.run(
      orderId,
      // 新受注管理項目
      orderData.order_date ?? null,
      orderData.client_name ?? null,
      orderData.manager ?? null,
      orderData.client_order_no ?? null,
      orderData.project_title ?? null,
      // ステータスフラグ - preserve null
      toBoolInt(orderData.is_delivered),
      toBoolInt(orderData.has_shipping_fee),
      toBoolInt(orderData.is_amount_confirmed),
      toBoolInt(orderData.is_invoiced),
      // 日付情報
      orderData.due_date ?? null,
      orderData.delivery_date ?? null,
      orderData.confirmed_date ?? null,
      // 金額情報
      orderData.estimated_amount ?? null,
      orderData.invoiced_amount ?? null,
      orderData.invoice_month ?? null,
      // 作業情報
      orderData.subcontractor ?? null,
      orderData.processing_hours ?? null,
      orderData.note ?? null,
      // レガシー項目
      orderData.product_name ?? null,
      orderData.qty ?? null,
      orderData.start_date ?? null,
      orderData.sales ?? null,
      orderData.estimated_material_cost ?? null,
      orderData.std_time_per_unit ?? null,
      orderData.status ?? 'pending',
      orderData.customer_name ?? null,
      // システム管理
      now,
      now
    );
    
    return orderId;
  }

  async getOrders(options: {
    from?: string;
    to?: string;
    search?: string;
    page?: number;
    pageSize?: number;
  } = {}): Promise<{ orders: Array<Order & { kpi: OrderKPI | null }>, total: number }> {
    const { from, to, search, page = 1, pageSize = 20 } = options;
    
    // Build WHERE clause
    let whereConditions: string[] = [];
    let params: any[] = [];
    
    if (from) {
      whereConditions.push('order_date >= ?');
      params.push(from);
    }
    
    if (to) {
      whereConditions.push('order_date <= ?');
      params.push(to);
    }
    
    if (search) {
      whereConditions.push('(order_id LIKE ? OR client_name LIKE ? OR project_title LIKE ? OR client_order_no LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    // Get total count
    const totalQuery = `SELECT COUNT(*) as count FROM orders ${whereClause}`;
    const totalResult = this.db.prepare(totalQuery).get(params) as { count: number };
    
    // Get paginated orders
    const offset = (page - 1) * pageSize;
    const ordersQuery = `
      SELECT * FROM orders 
      ${whereClause}
      ORDER BY order_date DESC, order_id DESC
      LIMIT ? OFFSET ?
    `;
    
    const orders = this.db.prepare(ordersQuery).all([...params, pageSize, offset]) as Order[];
    
    // Attach KPI to each order
    const ordersWithKPI = orders.map(order => ({
      ...order,
      kpi: this.metricsService.calculateOrderKPI(order.order_id)
    }));

    return {
      orders: ordersWithKPI,
      total: totalResult.count
    };
  }

  async getOrderById(orderId: string): Promise<{
    order: Order | null;
    kpi: OrderKPI | null;
    procurements: Procurement[];
    workerLogs: WorkerLog[];
  }> {
    const order = this.db.prepare(`
      SELECT * FROM orders WHERE order_id = ?
    `).get(orderId) as Order | undefined;

    if (!order) {
      return {
        order: null,
        kpi: null,
        procurements: [],
        workerLogs: []
      };
    }

    const kpi = this.metricsService.calculateOrderKPI(orderId);
    
    const procurements = this.db.prepare(`
      SELECT * FROM procurements WHERE order_id = ? ORDER BY created_at ASC
    `).all(orderId) as Procurement[];

    const workerLogs = this.db.prepare(`
      SELECT * FROM workers_log WHERE order_id = ? ORDER BY date DESC
    `).all(orderId) as WorkerLog[];

    return {
      order,
      kpi,
      procurements,
      workerLogs
    };
  }

  async updateOrder(orderId: string, updates: Partial<InsertOrder>): Promise<boolean> {
    const allowedColumns = [
      // 新受注管理項目
      'order_date', 'client_name', 'manager', 'client_order_no', 'project_title',
      'is_delivered', 'has_shipping_fee', 'is_amount_confirmed', 'is_invoiced',
      'due_date', 'delivery_date', 'confirmed_date',
      'estimated_amount', 'invoiced_amount', 'invoice_month',
      'subcontractor', 'processing_hours', 'note',
      // レガシー項目
      'product_name', 'qty', 'start_date', 'sales', 'estimated_material_cost',
      'std_time_per_unit', 'status', 'customer_name'
    ];
    
    // Helper to convert boolean to SQLite (true→1, false→0, null/undefined→null)
    const toBoolInt = (val: boolean | null | undefined): number | null => {
      if (val === null || val === undefined) return null;
      return val ? 1 : 0;
    };

    // Filter to only allowed columns and convert boolean values
    const filteredUpdates: Record<string, any> = {};
    for (const key of Object.keys(updates)) {
      if (allowedColumns.includes(key)) {
        const value = updates[key as keyof InsertOrder];
        // Convert boolean fields to integer (0/1/null) for SQLite, preserving null
        if (key === 'is_delivered' || key === 'has_shipping_fee' || 
            key === 'is_amount_confirmed' || key === 'is_invoiced') {
          filteredUpdates[key] = toBoolInt(value as boolean | null | undefined);
        } else {
          filteredUpdates[key] = value;
        }
      }
    }
    
    if (Object.keys(filteredUpdates).length === 0) {
      return false; // No valid updates
    }
    
    const setClause = Object.keys(filteredUpdates).map(key => `${key} = ?`).join(', ');
    const values = Object.values(filteredUpdates);
    
    const stmt = this.db.prepare(`
      UPDATE orders 
      SET ${setClause}, updated_at = ?
      WHERE order_id = ?
    `);
    
    const result = stmt.run(...values, new Date().toISOString(), orderId);
    return result.changes > 0;
  }

  async deleteOrder(orderId: string): Promise<boolean> {
    const stmt = this.db.prepare(`DELETE FROM orders WHERE order_id = ?`);
    const result = stmt.run(orderId);
    return result.changes > 0;
  }

  // ========== Procurements CRUD ==========
  
  async createProcurement(procData: InsertProcurement): Promise<number> {
    const now = new Date().toISOString();
    const stmt = this.db.prepare(`
      INSERT INTO procurements (
        order_id, kind, item_name, qty, unit, eta, status, vendor, 
        unit_price, received_at, std_time_per_unit, act_time_per_unit, 
        worker, completed_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      procData.order_id,
      procData.kind,
      procData.item_name,
      procData.qty,
      procData.unit,
      procData.eta,
      procData.status,
      procData.vendor,
      procData.unit_price,
      procData.received_at,
      procData.std_time_per_unit,
      procData.act_time_per_unit,
      procData.worker,
      procData.completed_at,
      now
    );
    
    return result.lastInsertRowid as number;
  }

  async getProcurements(options: {
    orderId?: string;
    kind?: 'purchase' | 'manufacture';
    status?: string;
    page?: number;
    pageSize?: number;
  } = {}): Promise<{ procurements: Procurement[], total: number }> {
    const { orderId, kind, status, page = 1, pageSize = 50 } = options;
    
    let whereConditions: string[] = [];
    let whereConditionsWithPrefix: string[] = [];
    let params: any[] = [];
    
    if (orderId) {
      whereConditions.push('order_id = ?');
      whereConditionsWithPrefix.push('p.order_id = ?');
      params.push(orderId);
    }
    
    if (kind) {
      whereConditions.push('kind = ?');
      whereConditionsWithPrefix.push('p.kind = ?');
      params.push(kind);
    }
    
    if (status) {
      whereConditions.push('status = ?');
      whereConditionsWithPrefix.push('p.status = ?');
      params.push(status);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    const whereClauseWithPrefix = whereConditionsWithPrefix.length > 0 ? `WHERE ${whereConditionsWithPrefix.join(' AND ')}` : '';
    
    // Get total count
    const totalResult = this.db.prepare(`
      SELECT COUNT(*) as count FROM procurements ${whereClause}
    `).get(params) as { count: number };
    
    // Get paginated results
    const offset = (page - 1) * pageSize;
    const procurements = this.db.prepare(`
      SELECT p.*, o.product_name 
      FROM procurements p
      JOIN orders o ON p.order_id = o.order_id
      ${whereClauseWithPrefix}
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `).all([...params, pageSize, offset]) as (Procurement & { product_name: string })[];

    return {
      procurements,
      total: totalResult.count
    };
  }

  async updateProcurement(procId: number, updates: Partial<InsertProcurement>): Promise<boolean> {
    const allowedColumns = ['kind', 'item_name', 'qty', 'unit', 'eta', 'status', 'vendor', 'unit_price', 'received_at', 'std_time_per_unit', 'act_time_per_unit', 'worker', 'completed_at'];
    
    // Filter to only allowed columns
    const filteredUpdates: Record<string, any> = {};
    for (const key of Object.keys(updates)) {
      if (allowedColumns.includes(key)) {
        filteredUpdates[key] = updates[key as keyof InsertProcurement];
      }
    }
    
    if (Object.keys(filteredUpdates).length === 0) {
      return false; // No valid updates
    }
    
    const setClause = Object.keys(filteredUpdates).map(key => `${key} = ?`).join(', ');
    const values = Object.values(filteredUpdates);
    
    const stmt = this.db.prepare(`
      UPDATE procurements 
      SET ${setClause}
      WHERE id = ?
    `);
    
    const result = stmt.run(...values, procId);
    return result.changes > 0;
  }

  async deleteProcurement(procId: number): Promise<boolean> {
    const stmt = this.db.prepare(`DELETE FROM procurements WHERE id = ?`);
    const result = stmt.run(procId);
    return result.changes > 0;
  }

  // ========== Worker Logs CRUD ==========
  
  async createWorkerLog(logData: InsertWorkerLog): Promise<number> {
    const now = new Date().toISOString();
    const stmt = this.db.prepare(`
      INSERT INTO workers_log (
        order_id, qty, act_time_per_unit, worker, date, created_at
      ) VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      logData.order_id,
      logData.qty,
      logData.act_time_per_unit,
      logData.worker,
      logData.date,
      now
    );
    
    return result.lastInsertRowid as number;
  }

  async getWorkerLogs(options: {
    orderId?: string;
    worker?: string;
    from?: string;
    to?: string;
    page?: number;
    pageSize?: number;
  } = {}): Promise<{ logs: WorkerLog[], total: number }> {
    const { orderId, worker, from, to, page = 1, pageSize = 50 } = options;
    
    let whereConditions: string[] = [];
    let params: any[] = [];
    
    if (orderId) {
      whereConditions.push('order_id = ?');
      params.push(orderId);
    }
    
    if (worker) {
      whereConditions.push('worker = ?');
      params.push(worker);
    }
    
    if (from) {
      whereConditions.push('date >= ?');
      params.push(from);
    }
    
    if (to) {
      whereConditions.push('date <= ?');
      params.push(to);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    // Get total count
    const totalResult = this.db.prepare(`
      SELECT COUNT(*) as count FROM workers_log ${whereClause}
    `).get(params) as { count: number };
    
    // Get paginated results
    const offset = (page - 1) * pageSize;
    const logs = this.db.prepare(`
      SELECT w.*, o.product_name 
      FROM workers_log w
      JOIN orders o ON w.order_id = o.order_id
      ${whereClause}
      ORDER BY w.date DESC
      LIMIT ? OFFSET ?
    `).all([...params, pageSize, offset]) as (WorkerLog & { product_name: string })[];

    return {
      logs,
      total: totalResult.count
    };
  }

  // Worker logs don't have an update method in the original, only create and delete
  // This is appropriate since work logs should be immutable once created
  
  async deleteWorkerLog(logId: number): Promise<boolean> {
    const stmt = this.db.prepare(`DELETE FROM workers_log WHERE id = ?`);
    const result = stmt.run(logId);
    return result.changes > 0;
  }

  // ========== KPI & Analytics ==========
  
  async getDashboardKPI(options: { from?: string; to?: string } = {}): Promise<DashboardKPI> {
    return this.metricsService.calculateDashboardKPI(options);
  }

  async getCalendarEvents(options: { from?: string; to?: string } = {}): Promise<CalendarEvent[]> {
    return this.metricsService.getCalendarEvents(options);
  }

  async getCSVData(options: { from?: string; to?: string } = {}): Promise<OrderKPI[]> {
    return this.metricsService.getCSVData(options);
  }

  // ========== Utility Methods ==========
  
  async getOrdersForDropdown(): Promise<{ order_id: string; product_name: string }[]> {
    return this.db.prepare(`
      SELECT order_id, product_name 
      FROM orders 
      ORDER BY created_at DESC
      LIMIT 100
    `).all() as { order_id: string; product_name: string }[];
  }

  async getWorkers(): Promise<{ worker: string }[]> {
    return this.db.prepare(`
      SELECT DISTINCT worker 
      FROM workers_log 
      ORDER BY worker ASC
    `).all() as { worker: string }[];
  }

  async getOrdersForGantt(): Promise<{
    id: string;
    name: string;
    start: string | null;
    end: string | null;
    progress: number;
    type: 'task' | 'procurement' | 'order';
  }[]> {
    const results: {
      id: string;
      name: string;
      start: string | null;
      end: string | null;
      progress: number;
      type: 'task' | 'procurement' | 'order';
    }[] = [];

    const tasks = this.db.prepare(`
      SELECT 
        t.id,
        t.task_name,
        t.planned_start,
        t.planned_end,
        t.status,
        t.order_id,
        COALESCE(o.project_title, o.product_name, '') as order_name
      FROM tasks t
      LEFT JOIN orders o ON t.order_id = o.order_id
      WHERE t.planned_start IS NOT NULL AND t.planned_end IS NOT NULL
      ORDER BY t.planned_start ASC
    `).all() as {
      id: number;
      task_name: string;
      planned_start: string;
      planned_end: string;
      status: string;
      order_id: string;
      order_name: string;
    }[];

    for (const task of tasks) {
      const progress = task.status === 'completed' ? 100 : 
                       task.status === 'in_progress' ? 50 : 0;
      const displayName = task.order_name 
        ? `[${task.order_id}] ${task.task_name}` 
        : `[${task.order_id}] ${task.task_name}`;
      
      results.push({
        id: `task-${task.id}`,
        name: displayName,
        start: task.planned_start,
        end: task.planned_end,
        progress,
        type: 'task'
      });
    }

    const procurements = this.db.prepare(`
      SELECT 
        p.id,
        p.item_name,
        p.order_id,
        p.kind,
        p.eta,
        p.received_at,
        p.completed_at,
        COALESCE(o.project_title, o.product_name, '') as order_name
      FROM procurements p
      LEFT JOIN orders o ON p.order_id = o.order_id
      WHERE p.eta IS NOT NULL OR p.completed_at IS NOT NULL
      ORDER BY COALESCE(p.eta, p.completed_at) ASC
    `).all() as {
      id: number;
      item_name: string;
      order_id: string | null;
      kind: string;
      eta: string | null;
      received_at: string | null;
      completed_at: string | null;
      order_name: string;
    }[];

    for (const proc of procurements) {
      const endDate = proc.eta || proc.completed_at;
      if (!endDate) continue;
      
      const startDateObj = new Date(endDate);
      startDateObj.setDate(startDateObj.getDate() - 7);
      const startDate = startDateObj.toISOString().split('T')[0];
      
      const isCompleted = proc.received_at !== null || proc.completed_at !== null;
      const displayName = proc.order_id 
        ? `[${proc.order_id}] ${proc.item_name} (調達)` 
        : `${proc.item_name} (調達)`;
      
      results.push({
        id: `proc-${proc.id}`,
        name: displayName,
        start: startDate,
        end: endDate,
        progress: isCompleted ? 100 : 0,
        type: 'procurement'
      });
    }

    results.sort((a, b) => {
      const aStart = a.start || '';
      const bStart = b.start || '';
      return aStart.localeCompare(bStart);
    });

    return results;
  }

  async getGanttHierarchy(): Promise<{
    orderId: string;
    projectName: string;
    tasks: {
      id: string;
      taskName: string;
      startDate: string;
      endDate: string;
      progress: number;
      type: 'task' | 'procurement';
    }[];
  }[]> {
    const projectsMap = new Map<string, {
      orderId: string;
      projectName: string;
      tasks: {
        id: string;
        taskName: string;
        startDate: string;
        endDate: string;
        progress: number;
        type: 'task' | 'procurement';
      }[];
    }>();

    const tasks = this.db.prepare(`
      SELECT 
        t.id,
        t.task_name,
        t.planned_start,
        t.planned_end,
        t.status,
        t.order_id,
        COALESCE(o.project_title, o.product_name, o.order_id) as project_name
      FROM tasks t
      LEFT JOIN orders o ON t.order_id = o.order_id
      WHERE t.planned_start IS NOT NULL AND t.planned_end IS NOT NULL
      ORDER BY t.order_id, t.planned_start ASC
    `).all() as {
      id: number;
      task_name: string;
      planned_start: string;
      planned_end: string;
      status: string;
      order_id: string;
      project_name: string;
    }[];

    for (const task of tasks) {
      const orderId = task.order_id || 'unknown';
      if (!projectsMap.has(orderId)) {
        projectsMap.set(orderId, {
          orderId,
          projectName: task.project_name || orderId,
          tasks: []
        });
      }
      
      const progress = task.status === 'completed' ? 100 : 
                       task.status === 'in_progress' ? 50 : 0;
      
      projectsMap.get(orderId)!.tasks.push({
        id: `task-${task.id}`,
        taskName: task.task_name,
        startDate: task.planned_start,
        endDate: task.planned_end,
        progress,
        type: 'task'
      });
    }

    const procurements = this.db.prepare(`
      SELECT 
        p.id,
        p.item_name,
        p.order_id,
        p.eta,
        p.received_at,
        p.completed_at,
        COALESCE(o.project_title, o.product_name, p.order_id) as project_name
      FROM procurements p
      LEFT JOIN orders o ON p.order_id = o.order_id
      WHERE p.eta IS NOT NULL OR p.completed_at IS NOT NULL
      ORDER BY p.order_id, COALESCE(p.eta, p.completed_at) ASC
    `).all() as {
      id: number;
      item_name: string;
      order_id: string | null;
      eta: string | null;
      received_at: string | null;
      completed_at: string | null;
      project_name: string;
    }[];

    for (const proc of procurements) {
      const orderId = proc.order_id || 'unknown';
      const endDate = proc.eta || proc.completed_at;
      if (!endDate) continue;

      if (!projectsMap.has(orderId)) {
        projectsMap.set(orderId, {
          orderId,
          projectName: proc.project_name || orderId,
          tasks: []
        });
      }

      const startDateObj = new Date(endDate);
      startDateObj.setDate(startDateObj.getDate() - 7);
      const startDate = startDateObj.toISOString().split('T')[0];
      const isCompleted = proc.received_at !== null || proc.completed_at !== null;

      projectsMap.get(orderId)!.tasks.push({
        id: `proc-${proc.id}`,
        taskName: `${proc.item_name} (調達)`,
        startDate,
        endDate,
        progress: isCompleted ? 100 : 0,
        type: 'procurement'
      });
    }

    return Array.from(projectsMap.values()).sort((a, b) => {
      const aMinStart = a.tasks.length > 0 ? Math.min(...a.tasks.map(t => new Date(t.startDate).getTime())) : Infinity;
      const bMinStart = b.tasks.length > 0 ? Math.min(...b.tasks.map(t => new Date(t.startDate).getTime())) : Infinity;
      return aMinStart - bMinStart;
    });
  }

  // ========== Tasks CRUD ==========
  
  async createTask(taskData: InsertTask): Promise<number> {
    const now = new Date().toISOString();
    
    const stmt = this.db.prepare(`
      INSERT INTO tasks (
        order_id, task_name, assignee, planned_start, planned_end, 
        std_time_per_unit, qty, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      taskData.order_id,
      taskData.task_name,
      taskData.assignee || null,
      taskData.planned_start,
      taskData.planned_end,
      taskData.std_time_per_unit,
      taskData.qty,
      taskData.status || 'not_started',
      now
    );
    
    return result.lastInsertRowid as number;
  }

  async getTasks(options: {
    order_id?: string;
    status?: string;
    from?: string;
    to?: string;
    page?: number;
    pageSize?: number;
  } = {}): Promise<{ tasks: Task[], total: number }> {
    let query = `SELECT * FROM tasks WHERE 1=1`;
    const params: any[] = [];
    
    if (options.order_id) {
      query += ` AND order_id = ?`;
      params.push(options.order_id);
    }
    
    if (options.status) {
      query += ` AND status = ?`;
      params.push(options.status);
    }
    
    if (options.from) {
      query += ` AND planned_start >= ?`;
      params.push(options.from);
    }
    
    if (options.to) {
      query += ` AND planned_end <= ?`;
      params.push(options.to);
    }
    
    query += ` ORDER BY planned_start ASC`;
    
    const countStmt = this.db.prepare(query.replace('SELECT *', 'SELECT COUNT(*) as count'));
    const countResult = countStmt.get(...params) as { count: number };
    const total = countResult.count;
    
    const page = options.page || 1;
    const pageSize = options.pageSize || 20;
    const offset = (page - 1) * pageSize;
    
    query += ` LIMIT ? OFFSET ?`;
    params.push(pageSize, offset);
    
    const tasks = this.db.prepare(query).all(...params) as Task[];
    
    return { tasks, total };
  }

  async getTaskById(taskId: number): Promise<Task | null> {
    const task = this.db.prepare(`
      SELECT * FROM tasks WHERE id = ?
    `).get(taskId) as Task | undefined;
    
    return task || null;
  }

  async updateTask(taskId: number, updates: Partial<InsertTask>): Promise<boolean> {
    const allowedColumns = ['task_name', 'assignee', 'planned_start', 'planned_end', 'std_time_per_unit', 'qty', 'status'];
    
    const updateCols = Object.keys(updates).filter(key => allowedColumns.includes(key));
    
    if (updateCols.length === 0) {
      return false;
    }
    
    const setClause = updateCols.map(col => `${col} = ?`).join(', ');
    const values = updateCols.map(col => (updates as any)[col]);
    
    const stmt = this.db.prepare(`
      UPDATE tasks SET ${setClause} WHERE id = ?
    `);
    
    const result = stmt.run(...values, taskId);
    return result.changes > 0;
  }

  async deleteTask(taskId: number): Promise<boolean> {
    const stmt = this.db.prepare(`DELETE FROM tasks WHERE id = ?`);
    const result = stmt.run(taskId);
    return result.changes > 0;
  }

  // ========== Work Logs CRUD ==========
  
  async createWorkLog(logData: InsertWorkLog): Promise<number> {
    // Build dynamic INSERT statement to support both manual and CSV fields
    const fields: string[] = [];
    const placeholders: string[] = [];
    const values: any[] = [];
    
    // Helper to add field if value exists
    const addField = (fieldName: string, value: any) => {
      if (value !== undefined && value !== null) {
        fields.push(fieldName);
        placeholders.push('?');
        values.push(value);
      }
    };
    
    // ハーモスCSVフィールド
    addField('work_date', logData.work_date);
    addField('employee_name', logData.employee_name);
    addField('client_name', logData.client_name);
    addField('project_name', logData.project_name);
    addField('task_large', logData.task_large);
    addField('task_medium', logData.task_medium);
    addField('task_small', logData.task_small);
    addField('work_name', logData.work_name);
    addField('planned_time', logData.planned_time);
    addField('actual_time', logData.actual_time);
    addField('total_work_time', logData.total_work_time);
    addField('note', logData.note);
    
    // 手動入力フィールド
    addField('date', logData.date);
    addField('worker', logData.worker);
    addField('task_name', logData.task_name);
    addField('start_time', logData.start_time);
    addField('end_time', logData.end_time);
    addField('duration_hours', logData.duration_hours);
    addField('quantity', logData.quantity);
    addField('memo', logData.memo);
    addField('status', logData.status);
    
    // 共通フィールド
    addField('order_id', logData.order_id);
    addField('order_no', logData.order_no);
    addField('match_status', logData.match_status || 'unlinked');
    addField('source', logData.source || 'manual');
    
    if (fields.length === 0) {
      throw new Error('No valid fields to insert');
    }
    
    const stmt = this.db.prepare(`
      INSERT INTO work_logs (${fields.join(', ')})
      VALUES (${placeholders.join(', ')})
    `);
    
    const result = stmt.run(...values);
    return result.lastInsertRowid as number;
  }

  async getWorkLogs(options: {
    date?: string;
    worker?: string;
    order_id?: string;
    from?: string;
    to?: string;
    page?: number;
    pageSize?: number;
  } = {}): Promise<{ logs: (WorkLog & { product_name?: string })[], total: number }> {
    let query = `
      SELECT wl.*, o.product_name 
      FROM work_logs wl
      LEFT JOIN orders o ON wl.order_id = o.order_id
      WHERE 1=1
    `;
    const params: any[] = [];
    
    if (options.date) {
      query += ` AND wl.date = ?`;
      params.push(options.date);
    }
    
    if (options.worker) {
      query += ` AND wl.worker = ?`;
      params.push(options.worker);
    }
    
    if (options.order_id) {
      query += ` AND wl.order_id = ?`;
      params.push(options.order_id);
    }
    
    if (options.from) {
      query += ` AND wl.date >= ?`;
      params.push(options.from);
    }
    
    if (options.to) {
      query += ` AND wl.date <= ?`;
      params.push(options.to);
    }
    
    query += ` ORDER BY wl.date DESC, wl.start_time DESC`;
    
    const countQuery = `
      SELECT COUNT(*) as count FROM work_logs wl WHERE 1=1
      ${options.date ? ' AND wl.date = ?' : ''}
      ${options.worker ? ' AND wl.worker = ?' : ''}
      ${options.order_id ? ' AND wl.order_id = ?' : ''}
      ${options.from ? ' AND wl.date >= ?' : ''}
      ${options.to ? ' AND wl.date <= ?' : ''}
    `;
    const countResult = this.db.prepare(countQuery).get(...params) as { count: number };
    const total = countResult.count;
    
    const page = options.page || 1;
    const pageSize = options.pageSize || 50;
    const offset = (page - 1) * pageSize;
    
    query += ` LIMIT ? OFFSET ?`;
    params.push(pageSize, offset);
    
    const logs = this.db.prepare(query).all(...params) as (WorkLog & { product_name?: string })[];
    
    return { logs, total };
  }

  async getWorkLogById(logId: number): Promise<WorkLog | null> {
    const log = this.db.prepare(`
      SELECT * FROM work_logs WHERE id = ?
    `).get(logId) as WorkLog | undefined;
    
    return log || null;
  }

  async updateWorkLog(logId: number, updates: Partial<InsertWorkLog>): Promise<boolean> {
    const allowedColumns = [
      'date', 'order_id', 'task_name', 'worker', 'start_time', 'end_time',
      'duration_hours', 'quantity', 'memo', 'status'
    ];
    
    const updateCols = Object.keys(updates).filter(key => allowedColumns.includes(key));
    
    if (updateCols.length === 0) {
      return false;
    }
    
    const setClause = updateCols.map(col => `${col} = ?`).join(', ');
    const values = updateCols.map(col => (updates as any)[col]);
    
    const stmt = this.db.prepare(`
      UPDATE work_logs SET ${setClause} WHERE id = ?
    `);
    
    const result = stmt.run(...values, logId);
    return result.changes > 0;
  }

  async deleteWorkLog(logId: number): Promise<boolean> {
    const stmt = this.db.prepare(`DELETE FROM work_logs WHERE id = ?`);
    const result = stmt.run(logId);
    return result.changes > 0;
  }

  async checkWorkLogOverlap(
    worker: string, 
    date: string, 
    startTime: string, 
    endTime: string,
    excludeLogId?: number
  ): Promise<WorkLog[]> {
    let query = `
      SELECT * FROM work_logs 
      WHERE worker = ? 
        AND date = ? 
        AND start_time IS NOT NULL 
        AND end_time IS NOT NULL
        AND (
          (start_time <= ? AND end_time > ?) OR
          (start_time < ? AND end_time >= ?) OR
          (start_time >= ? AND end_time <= ?)
        )
    `;
    const params: any[] = [worker, date, startTime, startTime, endTime, endTime, startTime, endTime];
    
    if (excludeLogId) {
      query += ` AND id != ?`;
      params.push(excludeLogId);
    }
    
    return this.db.prepare(query).all(...params) as WorkLog[];
  }

  async getTasksByOrderId(orderId: string): Promise<Task[]> {
    return this.db.prepare(`
      SELECT * FROM tasks WHERE order_id = ? ORDER BY planned_start ASC
    `).all(orderId) as Task[];
  }

  // ========== Materials Master CRUD ==========
  
  async getMaterials(options?: {
    material_type?: string;
    search?: string;
  }): Promise<Material[]> {
    let query = `SELECT * FROM materials WHERE 1=1`;
    const params: any[] = [];
    
    if (options?.material_type) {
      query += ` AND material_type = ?`;
      params.push(options.material_type);
    }
    
    if (options?.search) {
      query += ` AND (name LIKE ? OR size LIKE ? OR remark LIKE ?)`;
      const searchTerm = `%${options.search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }
    
    query += ` ORDER BY material_type, name, size`;
    
    return this.db.prepare(query).all(...params) as Material[];
  }

  async getMaterialById(id: number): Promise<Material | undefined> {
    return this.db.prepare(`
      SELECT * FROM materials WHERE id = ?
    `).get(id) as Material | undefined;
  }

  async createMaterial(data: InsertMaterial): Promise<number> {
    const now = new Date().toISOString();
    
    const stmt = this.db.prepare(`
      INSERT INTO materials (material_type, name, size, unit, unit_weight, remark, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      data.material_type,
      data.name,
      data.size,
      data.unit,
      data.unit_weight ?? null,
      data.remark ?? null,
      now
    );
    
    return result.lastInsertRowid as number;
  }

  async updateMaterial(id: number, data: Partial<InsertMaterial>): Promise<boolean> {
    const updates: string[] = [];
    const params: any[] = [];
    
    if (data.material_type !== undefined) {
      updates.push('material_type = ?');
      params.push(data.material_type);
    }
    if (data.name !== undefined) {
      updates.push('name = ?');
      params.push(data.name);
    }
    if (data.size !== undefined) {
      updates.push('size = ?');
      params.push(data.size);
    }
    if (data.unit !== undefined) {
      updates.push('unit = ?');
      params.push(data.unit);
    }
    if (data.unit_weight !== undefined) {
      updates.push('unit_weight = ?');
      params.push(data.unit_weight);
    }
    if (data.remark !== undefined) {
      updates.push('remark = ?');
      params.push(data.remark);
    }
    
    if (updates.length === 0) return false;
    
    params.push(id);
    const stmt = this.db.prepare(`
      UPDATE materials SET ${updates.join(', ')} WHERE id = ?
    `);
    
    const result = stmt.run(...params);
    return result.changes > 0;
  }

  async deleteMaterial(id: number): Promise<boolean> {
    const result = this.db.prepare(`
      DELETE FROM materials WHERE id = ?
    `).run(id);
    
    return result.changes > 0;
  }

  async getMaterialTypes(): Promise<string[]> {
    const rows = this.db.prepare(`
      SELECT DISTINCT material_type FROM materials ORDER BY material_type
    `).all() as Array<{ material_type: string }>;
    
    return rows.map(r => r.material_type);
  }

  // ========== Material Usages CRUD ==========
  
  async getMaterialUsages(options?: {
    project_id?: string;
    material_id?: number;
    area?: string;
    zone?: string;
  }): Promise<MaterialUsageWithMaterial[]> {
    let query = `
      SELECT 
        mu.*,
        m.material_type,
        m.name AS material_name,
        m.size AS material_size,
        m.unit,
        m.unit_weight,
        CASE 
          WHEN m.unit_weight IS NOT NULL AND mu.length IS NOT NULL 
          THEN m.unit_weight * mu.length * mu.quantity
          ELSE NULL
        END AS total_weight
      FROM material_usages mu
      JOIN materials m ON mu.material_id = m.id
      WHERE 1=1
    `;
    const params: any[] = [];
    
    if (options?.project_id) {
      query += ` AND mu.project_id = ?`;
      params.push(options.project_id);
    }
    if (options?.material_id) {
      query += ` AND mu.material_id = ?`;
      params.push(options.material_id);
    }
    if (options?.area) {
      query += ` AND mu.area = ?`;
      params.push(options.area);
    }
    if (options?.zone) {
      query += ` AND mu.zone = ?`;
      params.push(options.zone);
    }
    
    query += ` ORDER BY mu.project_id, mu.area, mu.zone, m.material_type, m.name`;
    
    return this.db.prepare(query).all(...params) as MaterialUsageWithMaterial[];
  }

  async getMaterialUsageById(id: number): Promise<MaterialUsageWithMaterial | undefined> {
    return this.db.prepare(`
      SELECT 
        mu.*,
        m.material_type,
        m.name AS material_name,
        m.size AS material_size,
        m.unit,
        m.unit_weight,
        CASE 
          WHEN m.unit_weight IS NOT NULL AND mu.length IS NOT NULL 
          THEN m.unit_weight * mu.length * mu.quantity
          ELSE NULL
        END AS total_weight
      FROM material_usages mu
      JOIN materials m ON mu.material_id = m.id
      WHERE mu.id = ?
    `).get(id) as MaterialUsageWithMaterial | undefined;
  }

  async createMaterialUsage(data: InsertMaterialUsage): Promise<number> {
    const now = new Date().toISOString();
    
    const stmt = this.db.prepare(`
      INSERT INTO material_usages (project_id, area, zone, drawing_no, material_id, quantity, length, remark, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      data.project_id,
      data.area ?? null,
      data.zone ?? null,
      data.drawing_no ?? null,
      data.material_id,
      data.quantity ?? 1,
      data.length ?? null,
      data.remark ?? null,
      now
    );
    
    return result.lastInsertRowid as number;
  }

  async updateMaterialUsage(id: number, data: Partial<InsertMaterialUsage>): Promise<boolean> {
    const updates: string[] = [];
    const params: any[] = [];
    
    if (data.project_id !== undefined) {
      updates.push('project_id = ?');
      params.push(data.project_id);
    }
    if (data.area !== undefined) {
      updates.push('area = ?');
      params.push(data.area);
    }
    if (data.zone !== undefined) {
      updates.push('zone = ?');
      params.push(data.zone);
    }
    if (data.drawing_no !== undefined) {
      updates.push('drawing_no = ?');
      params.push(data.drawing_no);
    }
    if (data.material_id !== undefined) {
      updates.push('material_id = ?');
      params.push(data.material_id);
    }
    if (data.quantity !== undefined) {
      updates.push('quantity = ?');
      params.push(data.quantity);
    }
    if (data.length !== undefined) {
      updates.push('length = ?');
      params.push(data.length);
    }
    if (data.remark !== undefined) {
      updates.push('remark = ?');
      params.push(data.remark);
    }
    
    if (updates.length === 0) return false;
    
    params.push(id);
    const stmt = this.db.prepare(`
      UPDATE material_usages SET ${updates.join(', ')} WHERE id = ?
    `);
    
    const result = stmt.run(...params);
    return result.changes > 0;
  }

  async deleteMaterialUsage(id: number): Promise<boolean> {
    const result = this.db.prepare(`
      DELETE FROM material_usages WHERE id = ?
    `).run(id);
    
    return result.changes > 0;
  }

  // Material Usages Summary - Aggregate by project_id, zone, and material_type
  async getMaterialUsageSummary(options?: {
    project_id?: string;
    group_by_material_type?: boolean;
  }): Promise<Array<{
    project_id: string;
    zone: string | null;
    material_type: string | null;
    total_quantity: number;
    total_weight: number | null;
    record_count: number;
  }>> {
    const groupByMaterialType = options?.group_by_material_type ?? true;
    
    let query = `
      SELECT 
        mu.project_id,
        mu.zone,
        ${groupByMaterialType ? 'm.material_type,' : 'NULL AS material_type,'}
        SUM(mu.quantity) AS total_quantity,
        SUM(
          CASE 
            WHEN m.unit_weight IS NOT NULL AND mu.length IS NOT NULL 
            THEN m.unit_weight * mu.length * mu.quantity
            ELSE NULL
          END
        ) AS total_weight,
        COUNT(*) AS record_count
      FROM material_usages mu
      JOIN materials m ON mu.material_id = m.id
      WHERE 1=1
    `;
    const params: any[] = [];
    
    if (options?.project_id) {
      query += ` AND mu.project_id = ?`;
      params.push(options.project_id);
    }
    
    if (groupByMaterialType) {
      query += ` GROUP BY mu.project_id, mu.zone, m.material_type ORDER BY mu.project_id, mu.zone, m.material_type`;
    } else {
      query += ` GROUP BY mu.project_id, mu.zone ORDER BY mu.project_id, mu.zone`;
    }
    
    const rows = this.db.prepare(query).all(...params) as Array<{
      project_id: string;
      zone: string | null;
      material_type: string | null;
      total_quantity: number;
      total_weight: number | null;
      record_count: number;
    }>;
    
    return rows;
  }

  close(): void {
    this.db.close();
  }
}