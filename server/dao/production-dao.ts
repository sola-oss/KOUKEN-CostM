// Production Management MVP - Data Access Object
import Database from 'better-sqlite3';
import { MetricsService } from '../services/metrics.js';
import type { 
  Order, Procurement, WorkerLog, Task, WorkLog,
  InsertOrder, InsertProcurement, InsertWorkerLog, InsertTask, InsertWorkLog,
  OrderKPI, DashboardKPI, CalendarEvent, MaterialCostAnalysis 
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
  
  async createOrder(orderData: InsertOrder): Promise<number> {
    const now = new Date().toISOString();
    
    // If order_id is specified, use it; otherwise, let SQLite auto-increment
    if (orderData.order_id !== undefined && orderData.order_id !== null) {
      const stmt = this.db.prepare(`
        INSERT INTO orders (
          order_id, product_name, qty, start_date, due_date, sales, estimated_material_cost, 
          std_time_per_unit, status, customer_name, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      stmt.run(
        orderData.order_id,
        orderData.product_name,
        orderData.qty,
        orderData.start_date || null,
        orderData.due_date,
        orderData.sales,
        orderData.estimated_material_cost,
        orderData.std_time_per_unit,
        orderData.status || 'pending',
        orderData.customer_name || null,
        now,
        now
      );
      
      return orderData.order_id;
    } else {
      const stmt = this.db.prepare(`
        INSERT INTO orders (
          product_name, qty, start_date, due_date, sales, estimated_material_cost, 
          std_time_per_unit, status, customer_name, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      const result = stmt.run(
        orderData.product_name,
        orderData.qty,
        orderData.start_date || null,
        orderData.due_date,
        orderData.sales,
        orderData.estimated_material_cost,
        orderData.std_time_per_unit,
        orderData.status || 'pending',
        orderData.customer_name || null,
        now,
        now
      );
      
      return result.lastInsertRowid as number;
    }
  }

  async getOrders(options: {
    from?: string;
    to?: string;
    q?: string;
    page?: number;
    pageSize?: number;
  } = {}): Promise<{ orders: OrderKPI[], total: number }> {
    return this.metricsService.calculateOrderKPIs(options);
  }

  async getOrderById(orderId: number): Promise<{
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

  async updateOrder(orderId: number, updates: Partial<InsertOrder>): Promise<boolean> {
    const allowedColumns = ['product_name', 'qty', 'start_date', 'due_date', 'sales', 'estimated_material_cost', 'std_time_per_unit', 'status', 'customer_name'];
    
    // Filter to only allowed columns
    const filteredUpdates: Record<string, any> = {};
    for (const key of Object.keys(updates)) {
      if (allowedColumns.includes(key)) {
        filteredUpdates[key] = updates[key as keyof InsertOrder];
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

  async deleteOrder(orderId: number): Promise<boolean> {
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
    orderId?: number;
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
    orderId?: number;
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
  
  async getOrdersForDropdown(): Promise<{ order_id: number; product_name: string }[]> {
    return this.db.prepare(`
      SELECT order_id, product_name 
      FROM orders 
      ORDER BY created_at DESC
      LIMIT 100
    `).all() as { order_id: number; product_name: string }[];
  }

  async getWorkers(): Promise<{ worker: string }[]> {
    return this.db.prepare(`
      SELECT DISTINCT worker 
      FROM workers_log 
      ORDER BY worker ASC
    `).all() as { worker: string }[];
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
    order_id?: number;
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
    const now = new Date().toISOString();
    
    const stmt = this.db.prepare(`
      INSERT INTO work_logs (
        date, order_id, task_name, worker, start_time, end_time, 
        duration_hours, quantity, memo, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      logData.date,
      logData.order_id,
      logData.task_name,
      logData.worker,
      logData.start_time || null,
      logData.end_time || null,
      logData.duration_hours,
      logData.quantity || 0,
      logData.memo || null,
      logData.status || '下書き',
      now
    );
    
    return result.lastInsertRowid as number;
  }

  async getWorkLogs(options: {
    date?: string;
    worker?: string;
    order_id?: number;
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

  async getTasksByOrderId(orderId: number): Promise<Task[]> {
    return this.db.prepare(`
      SELECT * FROM tasks WHERE order_id = ? ORDER BY planned_start ASC
    `).all(orderId) as Task[];
  }

  // ========== Material Cost Analysis ==========
  
  async getMaterialCostAnalysis(): Promise<MaterialCostAnalysis[]> {
    const query = `
      SELECT 
        o.order_id,
        o.product_name,
        o.customer_name,
        o.estimated_material_cost,
        o.status,
        COALESCE(SUM(CASE WHEN p.kind = 'purchase' THEN p.qty * p.unit_price ELSE 0 END), 0) as actual_material_cost,
        COUNT(CASE WHEN p.kind = 'purchase' THEN 1 END) as purchase_count
      FROM orders o
      LEFT JOIN procurements p ON o.order_id = p.order_id
      GROUP BY o.order_id, o.product_name, o.customer_name, o.estimated_material_cost, o.status
      ORDER BY o.order_id ASC
    `;
    
    const results = this.db.prepare(query).all() as Array<{
      order_id: number;
      product_name: string;
      customer_name: string | null;
      estimated_material_cost: number;
      actual_material_cost: number;
      purchase_count: number;
      status: 'pending' | 'in_progress' | 'completed';
    }>;
    
    return results.map(row => {
      const variance = row.actual_material_cost - row.estimated_material_cost;
      const variance_pct = row.estimated_material_cost > 0 
        ? (variance / row.estimated_material_cost) * 100 
        : 0;
      
      return {
        order_id: row.order_id,
        product_name: row.product_name,
        customer_name: row.customer_name || undefined,
        estimated_material_cost: row.estimated_material_cost,
        actual_material_cost: row.actual_material_cost,
        variance,
        variance_pct,
        purchase_count: row.purchase_count,
        status: row.status
      };
    });
  }

  close(): void {
    this.db.close();
  }
}