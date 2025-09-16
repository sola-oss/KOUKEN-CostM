// SQLite Database Implementation for Production Management System
import Database from 'better-sqlite3';
import path from 'path';
import { IDatabase, QueryOptions, FilterOptions } from '../interfaces/IDatabase';
import { 
  Employee, Customer, Vendor, Item, WorkCenter,
  SalesOrder, SalesOrderLine,
  ProductionOrder, WorkOrder, WorkInstruction,
  PurchaseOrder, PurchaseOrderLine, Receipt,
  TimeEntry, ExternalTimeEntry,
  Shipment, ShipmentLine,
  Invoice, InvoiceLine,
  Calendar, Attachment, Comment, ActivityLog,
  DashboardMetrics
} from '../../../shared/types';

export class SqliteDatabase implements IDatabase {
  private db: Database.Database;
  
  constructor(dbPath?: string) {
    const defaultPath = process.env.DB_PATH || path.join(process.cwd(), 'data', 'production.db');
    this.db = new Database(dbPath || defaultPath);
    this.db.pragma('foreign_keys = ON');
    this.db.pragma('journal_mode = WAL');
  }

  async close(): Promise<void> {
    this.db.close();
  }

  async beginTransaction(): Promise<void> {
    this.db.exec('BEGIN TRANSACTION');
  }

  async commit(): Promise<void> {
    this.db.exec('COMMIT');
  }

  async rollback(): Promise<void> {
    this.db.exec('ROLLBACK');
  }

  // ========== Employees ==========
  async getEmployees(options: QueryOptions = {}): Promise<Employee[]> {
    const { limit = 100, offset = 0 } = options;
    const stmt = this.db.prepare(`
      SELECT * FROM employees 
      WHERE is_active = 1
      ORDER BY name
      LIMIT ? OFFSET ?
    `);
    return stmt.all(limit, offset) as Employee[];
  }

  async getEmployeeById(id: number): Promise<Employee | null> {
    const stmt = this.db.prepare('SELECT * FROM employees WHERE id = ?');
    return stmt.get(id) as Employee | null;
  }

  async createEmployee(data: Partial<Employee>): Promise<Employee> {
    const columns = Object.keys(data).filter(k => k !== 'id');
    const values = columns.map(k => data[k as keyof Employee]);
    const placeholders = columns.map(() => '?').join(',');
    
    const stmt = this.db.prepare(`
      INSERT INTO employees (${columns.join(',')})
      VALUES (${placeholders})
    `);
    
    const result = stmt.run(...values);
    return this.getEmployeeById(result.lastInsertRowid as number) as Promise<Employee>;
  }

  async updateEmployee(id: number, data: Partial<Employee>): Promise<Employee | null> {
    const columns = Object.keys(data).filter(k => k !== 'id');
    const setClause = columns.map(col => `${col} = ?`).join(', ');
    const values = [...columns.map(k => data[k as keyof Employee]), id];
    
    const stmt = this.db.prepare(`
      UPDATE employees 
      SET ${setClause}, updated_at = datetime('now')
      WHERE id = ?
    `);
    
    const result = stmt.run(...values);
    return result.changes > 0 ? this.getEmployeeById(id) : null;
  }

  // ========== Customers ==========
  async getCustomers(options: FilterOptions = {}): Promise<{ data: Customer[]; total: number }> {
    const { limit = 100, offset = 0, query } = options;
    
    let whereClause = 'WHERE is_active = 1';
    const params: any[] = [];
    
    if (query) {
      whereClause += ' AND (name LIKE ? OR code LIKE ?)';
      params.push(`%${query}%`, `%${query}%`);
    }
    
    const countStmt = this.db.prepare(`SELECT COUNT(*) as count FROM customers ${whereClause}`);
    const total = (countStmt.get(...params) as any).count;
    
    const stmt = this.db.prepare(`
      SELECT * FROM customers 
      ${whereClause}
      ORDER BY code
      LIMIT ? OFFSET ?
    `);
    
    const data = stmt.all(...params, limit, offset) as Customer[];
    
    // Parse JSON fields
    data.forEach(c => {
      if (c.tags && typeof c.tags === 'string') c.tags = JSON.parse(c.tags);
      if (c.custom_fields && typeof c.custom_fields === 'string') c.custom_fields = JSON.parse(c.custom_fields);
    });
    
    return { data, total };
  }

  async getCustomerById(id: number): Promise<Customer | null> {
    const stmt = this.db.prepare('SELECT * FROM customers WHERE id = ?');
    const customer = stmt.get(id) as Customer | null;
    if (customer) {
      if (customer.tags && typeof customer.tags === 'string') customer.tags = JSON.parse(customer.tags);
      if (customer.custom_fields && typeof customer.custom_fields === 'string') customer.custom_fields = JSON.parse(customer.custom_fields);
    }
    return customer;
  }

  async getCustomerByCode(code: string): Promise<Customer | null> {
    const stmt = this.db.prepare('SELECT * FROM customers WHERE code = ?');
    const customer = stmt.get(code) as Customer | null;
    if (customer) {
      if (customer.tags && typeof customer.tags === 'string') customer.tags = JSON.parse(customer.tags);
      if (customer.custom_fields && typeof customer.custom_fields === 'string') customer.custom_fields = JSON.parse(customer.custom_fields);
    }
    return customer;
  }

  async createCustomer(data: Partial<Customer>): Promise<Customer> {
    const dataCopy = { ...data };
    if (dataCopy.tags && typeof dataCopy.tags !== 'string') dataCopy.tags = JSON.stringify(dataCopy.tags);
    if (dataCopy.custom_fields && typeof dataCopy.custom_fields !== 'string') dataCopy.custom_fields = JSON.stringify(dataCopy.custom_fields);
    
    const columns = Object.keys(dataCopy).filter(k => k !== 'id');
    const values = columns.map(k => dataCopy[k as keyof Customer]);
    const placeholders = columns.map(() => '?').join(',');
    
    const stmt = this.db.prepare(`
      INSERT INTO customers (${columns.join(',')})
      VALUES (${placeholders})
    `);
    
    const result = stmt.run(...values);
    return this.getCustomerById(result.lastInsertRowid as number) as Promise<Customer>;
  }

  async updateCustomer(id: number, data: Partial<Customer>): Promise<Customer | null> {
    const dataCopy = { ...data };
    if (dataCopy.tags && typeof dataCopy.tags !== 'string') dataCopy.tags = JSON.stringify(dataCopy.tags);
    if (dataCopy.custom_fields && typeof dataCopy.custom_fields !== 'string') dataCopy.custom_fields = JSON.stringify(dataCopy.custom_fields);
    
    const columns = Object.keys(dataCopy).filter(k => k !== 'id');
    const setClause = columns.map(col => `${col} = ?`).join(', ');
    const values = [...columns.map(k => dataCopy[k as keyof Customer]), id];
    
    const stmt = this.db.prepare(`UPDATE customers SET ${setClause} WHERE id = ?`);
    const result = stmt.run(...values);
    return result.changes > 0 ? this.getCustomerById(id) : null;
  }

  // ========== Vendors ==========
  async getVendors(options: FilterOptions = {}): Promise<{ data: Vendor[]; total: number }> {
    const { limit = 100, offset = 0, query } = options;
    
    let whereClause = 'WHERE is_active = 1';
    const params: any[] = [];
    
    if (query) {
      whereClause += ' AND (name LIKE ? OR code LIKE ? OR category LIKE ?)';
      params.push(`%${query}%`, `%${query}%`, `%${query}%`);
    }
    
    const countStmt = this.db.prepare(`SELECT COUNT(*) as count FROM vendors ${whereClause}`);
    const total = (countStmt.get(...params) as any).count;
    
    const stmt = this.db.prepare(`
      SELECT * FROM vendors 
      ${whereClause}
      ORDER BY code
      LIMIT ? OFFSET ?
    `);
    
    const data = stmt.all(...params, limit, offset) as Vendor[];
    
    // Parse JSON fields
    data.forEach(v => {
      if (v.tags && typeof v.tags === 'string') v.tags = JSON.parse(v.tags);
      if (v.custom_fields && typeof v.custom_fields === 'string') v.custom_fields = JSON.parse(v.custom_fields);
    });
    
    return { data, total };
  }

  async getVendorById(id: number): Promise<Vendor | null> {
    const stmt = this.db.prepare('SELECT * FROM vendors WHERE id = ?');
    const vendor = stmt.get(id) as Vendor | null;
    if (vendor) {
      if (vendor.tags && typeof vendor.tags === 'string') vendor.tags = JSON.parse(vendor.tags);
      if (vendor.custom_fields && typeof vendor.custom_fields === 'string') vendor.custom_fields = JSON.parse(vendor.custom_fields);
    }
    return vendor;
  }

  async getVendorByCode(code: string): Promise<Vendor | null> {
    const stmt = this.db.prepare('SELECT * FROM vendors WHERE code = ?');
    const vendor = stmt.get(code) as Vendor | null;
    if (vendor) {
      if (vendor.tags && typeof vendor.tags === 'string') vendor.tags = JSON.parse(vendor.tags);
      if (vendor.custom_fields && typeof vendor.custom_fields === 'string') vendor.custom_fields = JSON.parse(vendor.custom_fields);
    }
    return vendor;
  }

  async createVendor(data: Partial<Vendor>): Promise<Vendor> {
    const dataCopy = { ...data };
    if (dataCopy.tags && typeof dataCopy.tags !== 'string') dataCopy.tags = JSON.stringify(dataCopy.tags);
    if (dataCopy.custom_fields && typeof dataCopy.custom_fields !== 'string') dataCopy.custom_fields = JSON.stringify(dataCopy.custom_fields);
    
    const columns = Object.keys(dataCopy).filter(k => k !== 'id');
    const values = columns.map(k => dataCopy[k as keyof Vendor]);
    const placeholders = columns.map(() => '?').join(',');
    
    const stmt = this.db.prepare(`
      INSERT INTO vendors (${columns.join(',')})
      VALUES (${placeholders})
    `);
    
    const result = stmt.run(...values);
    return this.getVendorById(result.lastInsertRowid as number) as Promise<Vendor>;
  }

  async updateVendor(id: number, data: Partial<Vendor>): Promise<Vendor | null> {
    const dataCopy = { ...data };
    if (dataCopy.tags && typeof dataCopy.tags !== 'string') dataCopy.tags = JSON.stringify(dataCopy.tags);
    if (dataCopy.custom_fields && typeof dataCopy.custom_fields !== 'string') dataCopy.custom_fields = JSON.stringify(dataCopy.custom_fields);
    
    const columns = Object.keys(dataCopy).filter(k => k !== 'id');
    const setClause = columns.map(col => `${col} = ?`).join(', ');
    const values = [...columns.map(k => dataCopy[k as keyof Vendor]), id];
    
    const stmt = this.db.prepare(`UPDATE vendors SET ${setClause} WHERE id = ?`);
    const result = stmt.run(...values);
    return result.changes > 0 ? this.getVendorById(id) : null;
  }

  async importVendors(vendors: Partial<Vendor>[]): Promise<number> {
    let count = 0;
    await this.beginTransaction();
    try {
      for (const vendor of vendors) {
        await this.createVendor(vendor);
        count++;
      }
      await this.commit();
    } catch (error) {
      await this.rollback();
      throw error;
    }
    return count;
  }

  // ========== Items ==========
  async getItems(options: FilterOptions = {}): Promise<{ data: Item[]; total: number }> {
    const { limit = 100, offset = 0, query } = options;
    
    let whereClause = 'WHERE is_active = 1';
    const params: any[] = [];
    
    if (query) {
      whereClause += ' AND (name LIKE ? OR code LIKE ? OR category LIKE ?)';
      params.push(`%${query}%`, `%${query}%`, `%${query}%`);
    }
    
    const countStmt = this.db.prepare(`SELECT COUNT(*) as count FROM items ${whereClause}`);
    const total = (countStmt.get(...params) as any).count;
    
    const stmt = this.db.prepare(`
      SELECT * FROM items 
      ${whereClause}
      ORDER BY code
      LIMIT ? OFFSET ?
    `);
    
    const data = stmt.all(...params, limit, offset) as Item[];
    
    // Parse JSON fields
    data.forEach(i => {
      if (i.tags && typeof i.tags === 'string') i.tags = JSON.parse(i.tags);
      if (i.custom_fields && typeof i.custom_fields === 'string') i.custom_fields = JSON.parse(i.custom_fields);
    });
    
    return { data, total };
  }

  async getItemById(id: number): Promise<Item | null> {
    const stmt = this.db.prepare('SELECT * FROM items WHERE id = ?');
    const item = stmt.get(id) as Item | null;
    if (item) {
      if (item.tags && typeof item.tags === 'string') item.tags = JSON.parse(item.tags);
      if (item.custom_fields && typeof item.custom_fields === 'string') item.custom_fields = JSON.parse(item.custom_fields);
    }
    return item;
  }

  async getItemByCode(code: string): Promise<Item | null> {
    const stmt = this.db.prepare('SELECT * FROM items WHERE code = ?');
    const item = stmt.get(code) as Item | null;
    if (item) {
      if (item.tags && typeof item.tags === 'string') item.tags = JSON.parse(item.tags);
      if (item.custom_fields && typeof item.custom_fields === 'string') item.custom_fields = JSON.parse(item.custom_fields);
    }
    return item;
  }

  async createItem(data: Partial<Item>): Promise<Item> {
    const dataCopy = { ...data };
    if (dataCopy.tags && typeof dataCopy.tags !== 'string') dataCopy.tags = JSON.stringify(dataCopy.tags);
    if (dataCopy.custom_fields && typeof dataCopy.custom_fields !== 'string') dataCopy.custom_fields = JSON.stringify(dataCopy.custom_fields);
    
    const columns = Object.keys(dataCopy).filter(k => k !== 'id');
    const values = columns.map(k => dataCopy[k as keyof Item]);
    const placeholders = columns.map(() => '?').join(',');
    
    const stmt = this.db.prepare(`
      INSERT INTO items (${columns.join(',')})
      VALUES (${placeholders})
    `);
    
    const result = stmt.run(...values);
    return this.getItemById(result.lastInsertRowid as number) as Promise<Item>;
  }

  async updateItem(id: number, data: Partial<Item>): Promise<Item | null> {
    const dataCopy = { ...data };
    if (dataCopy.tags && typeof dataCopy.tags !== 'string') dataCopy.tags = JSON.stringify(dataCopy.tags);
    if (dataCopy.custom_fields && typeof dataCopy.custom_fields !== 'string') dataCopy.custom_fields = JSON.stringify(dataCopy.custom_fields);
    
    const columns = Object.keys(dataCopy).filter(k => k !== 'id');
    const setClause = columns.map(col => `${col} = ?`).join(', ');
    const values = [...columns.map(k => dataCopy[k as keyof Item]), id];
    
    const stmt = this.db.prepare(`UPDATE items SET ${setClause} WHERE id = ?`);
    const result = stmt.run(...values);
    return result.changes > 0 ? this.getItemById(id) : null;
  }

  // ========== Sales Orders ==========
  async getSalesOrders(options: FilterOptions = {}): Promise<{ data: SalesOrder[]; total: number }> {
    const { limit = 100, offset = 0, status, startDate, endDate, customerId } = options;
    
    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    
    if (status) {
      whereClause += ' AND status = ?';
      params.push(status);
    }
    if (startDate) {
      whereClause += ' AND order_date >= ?';
      params.push(startDate);
    }
    if (endDate) {
      whereClause += ' AND order_date <= ?';
      params.push(endDate);
    }
    if (customerId) {
      whereClause += ' AND customer_id = ?';
      params.push(customerId);
    }
    
    const countStmt = this.db.prepare(`SELECT COUNT(*) as count FROM sales_orders ${whereClause}`);
    const total = (countStmt.get(...params) as any).count;
    
    const stmt = this.db.prepare(`
      SELECT so.*, c.name as customer_name, c.code as customer_code
      FROM sales_orders so
      LEFT JOIN customers c ON so.customer_id = c.id
      ${whereClause}
      ORDER BY so.order_date DESC
      LIMIT ? OFFSET ?
    `);
    
    const data = stmt.all(...params, limit, offset) as any[];
    
    // Parse and structure data
    return { 
      data: data.map(row => ({
        ...row,
        tags: row.tags ? JSON.parse(row.tags) : null,
        custom_fields: row.custom_fields ? JSON.parse(row.custom_fields) : null,
        customer: row.customer_name ? { id: row.customer_id, name: row.customer_name, code: row.customer_code } : undefined
      })), 
      total 
    };
  }

  async getSalesOrderById(id: number): Promise<SalesOrder | null> {
    const stmt = this.db.prepare(`
      SELECT so.*, c.name as customer_name, c.code as customer_code
      FROM sales_orders so
      LEFT JOIN customers c ON so.customer_id = c.id
      WHERE so.id = ?
    `);
    const order = stmt.get(id) as any;
    
    if (!order) return null;
    
    // Get order lines
    const linesStmt = this.db.prepare(`
      SELECT sol.*, i.code as item_code, i.name as item_name, i.uom
      FROM sales_order_lines sol
      LEFT JOIN items i ON sol.item_id = i.id
      WHERE sol.sales_order_id = ?
      ORDER BY sol.line_no
    `);
    const lines = linesStmt.all(id) as any[];
    
    return {
      ...order,
      tags: order.tags ? JSON.parse(order.tags) : null,
      custom_fields: order.custom_fields ? JSON.parse(order.custom_fields) : null,
      customer: order.customer_name ? { id: order.customer_id, name: order.customer_name, code: order.customer_code } : undefined,
      lines: lines.map(line => ({
        ...line,
        item: { id: line.item_id, code: line.item_code, name: line.item_name, uom: line.uom }
      }))
    };
  }

  async getSalesOrderByNo(orderNo: string): Promise<SalesOrder | null> {
    const stmt = this.db.prepare('SELECT id FROM sales_orders WHERE order_no = ?');
    const result = stmt.get(orderNo) as any;
    return result ? this.getSalesOrderById(result.id) : null;
  }

  async createSalesOrder(data: Partial<SalesOrder>, lines: Partial<SalesOrderLine>[]): Promise<SalesOrder> {
    await this.beginTransaction();
    try {
      const dataCopy = { ...data };
      if (dataCopy.tags && typeof dataCopy.tags !== 'string') dataCopy.tags = JSON.stringify(dataCopy.tags);
      if (dataCopy.custom_fields && typeof dataCopy.custom_fields !== 'string') dataCopy.custom_fields = JSON.stringify(dataCopy.custom_fields);
      
      const columns = Object.keys(dataCopy).filter(k => k !== 'id' && k !== 'lines');
      const values = columns.map(k => dataCopy[k as keyof SalesOrder]);
      const placeholders = columns.map(() => '?').join(',');
      
      const stmt = this.db.prepare(`
        INSERT INTO sales_orders (${columns.join(',')})
        VALUES (${placeholders})
      `);
      
      const result = stmt.run(...values);
      const orderId = result.lastInsertRowid as number;
      
      // Insert order lines
      if (lines && lines.length > 0) {
        const lineStmt = this.db.prepare(`
          INSERT INTO sales_order_lines (sales_order_id, line_no, item_id, quantity, unit_price, amount, delivery_date, notes)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        lines.forEach((line, index) => {
          lineStmt.run(
            orderId,
            line.line_no || index + 1,
            line.item_id,
            line.quantity,
            line.unit_price,
            line.amount || (line.quantity! * line.unit_price!),
            line.delivery_date || null,
            line.notes || null
          );
        });
      }
      
      await this.commit();
      return this.getSalesOrderById(orderId) as Promise<SalesOrder>;
    } catch (error) {
      await this.rollback();
      throw error;
    }
  }

  async updateSalesOrder(id: number, data: Partial<SalesOrder>): Promise<SalesOrder | null> {
    const dataCopy = { ...data };
    if (dataCopy.tags && typeof dataCopy.tags !== 'string') dataCopy.tags = JSON.stringify(dataCopy.tags);
    if (dataCopy.custom_fields && typeof dataCopy.custom_fields !== 'string') dataCopy.custom_fields = JSON.stringify(dataCopy.custom_fields);
    
    const columns = Object.keys(dataCopy).filter(k => k !== 'id' && k !== 'lines');
    const setClause = columns.map(col => `${col} = ?`).join(', ');
    const values = [...columns.map(k => dataCopy[k as keyof SalesOrder]), id];
    
    const stmt = this.db.prepare(`
      UPDATE sales_orders 
      SET ${setClause}, updated_at = datetime('now')
      WHERE id = ?
    `);
    
    const result = stmt.run(...values);
    return result.changes > 0 ? this.getSalesOrderById(id) : null;
  }

  async confirmSalesOrder(id: number, userId: number): Promise<SalesOrder | null> {
    const order = await this.getSalesOrderById(id);
    if (!order) return null;
    if (order.status !== 'draft') throw new Error('Order can only be confirmed from draft status');
    
    const stmt = this.db.prepare(`
      UPDATE sales_orders 
      SET status = 'confirmed', confirmed_at = datetime('now'), confirmed_by = ?, updated_at = datetime('now')
      WHERE id = ?
    `);
    
    stmt.run(userId, id);
    
    // Log activity
    await this.createActivityLog({
      entity_type: 'sales_order',
      entity_id: id,
      action: 'confirmed',
      old_value: JSON.stringify({ status: 'draft' }),
      new_value: JSON.stringify({ status: 'confirmed' }),
      user_id: userId
    });
    
    return this.getSalesOrderById(id);
  }

  // ========== Other methods - Placeholder implementations ==========
  // These would follow similar patterns to the above implementations
  
  async getProductionOrders(options?: FilterOptions): Promise<{ data: ProductionOrder[]; total: number }> {
    // Implementation similar to getSalesOrders
    return { data: [], total: 0 };
  }
  
  async getProductionOrderById(id: number): Promise<ProductionOrder | null> {
    return null;
  }
  
  async createProductionOrder(data: Partial<ProductionOrder>): Promise<ProductionOrder> {
    throw new Error('Not implemented');
  }
  
  async updateProductionOrderSchedule(id: number, startDate: string, endDate: string): Promise<ProductionOrder | null> {
    return null;
  }
  
  async getProductionCalendar(startDate: string, endDate: string): Promise<any[]> {
    return [];
  }
  
  async getWorkOrders(productionOrderId?: number, options?: FilterOptions): Promise<{ data: WorkOrder[]; total: number }> {
    return { data: [], total: 0 };
  }
  
  async getWorkOrderById(id: number): Promise<WorkOrder | null> {
    return null;
  }
  
  async createWorkOrder(data: Partial<WorkOrder>): Promise<WorkOrder> {
    throw new Error('Not implemented');
  }
  
  async updateWorkOrder(id: number, data: Partial<WorkOrder>): Promise<WorkOrder | null> {
    return null;
  }
  
  async getWorkInstructions(workOrderId?: number, options?: FilterOptions): Promise<{ data: WorkInstruction[]; total: number }> {
    return { data: [], total: 0 };
  }
  
  async createWorkInstruction(data: Partial<WorkInstruction>): Promise<WorkInstruction> {
    throw new Error('Not implemented');
  }
  
  async confirmWorkInstruction(id: number, userId: number): Promise<WorkInstruction | null> {
    return null;
  }
  
  async getPurchaseOrders(options?: FilterOptions): Promise<{ data: PurchaseOrder[]; total: number }> {
    return { data: [], total: 0 };
  }
  
  async getPurchaseOrderById(id: number): Promise<PurchaseOrder | null> {
    return null;
  }
  
  async createPurchaseOrder(data: Partial<PurchaseOrder>, lines: Partial<PurchaseOrderLine>[]): Promise<PurchaseOrder> {
    throw new Error('Not implemented');
  }
  
  async confirmPurchaseOrder(id: number, userId: number): Promise<PurchaseOrder | null> {
    return null;
  }
  
  async getReceipts(purchaseOrderId?: number, options?: FilterOptions): Promise<{ data: Receipt[]; total: number }> {
    return { data: [], total: 0 };
  }
  
  async createReceipt(data: Partial<Receipt>): Promise<Receipt> {
    throw new Error('Not implemented');
  }
  
  async confirmReceipt(id: number, userId: number): Promise<Receipt | null> {
    return null;
  }
  
  async getTimeEntries(options?: FilterOptions): Promise<{ data: TimeEntry[]; total: number }> {
    return { data: [], total: 0 };
  }
  
  async getTimeEntryById(id: number): Promise<TimeEntry | null> {
    return null;
  }
  
  async createTimeEntry(data: Partial<TimeEntry>): Promise<TimeEntry> {
    throw new Error('Not implemented');
  }
  
  async updateTimeEntry(id: number, data: Partial<TimeEntry>): Promise<TimeEntry | null> {
    return null;
  }
  
  async approveTimeEntry(id: number, userId: number): Promise<TimeEntry | null> {
    return null;
  }
  
  async getTimeEntriesForApproval(managerId: number): Promise<TimeEntry[]> {
    return [];
  }
  
  async getExternalTimeEntries(options?: FilterOptions): Promise<{ data: ExternalTimeEntry[]; total: number }> {
    return { data: [], total: 0 };
  }
  
  async createExternalTimeEntry(data: Partial<ExternalTimeEntry>): Promise<ExternalTimeEntry> {
    throw new Error('Not implemented');
  }
  
  async approveExternalTimeEntry(id: number, userId: number): Promise<ExternalTimeEntry | null> {
    return null;
  }
  
  async getShipments(options?: FilterOptions): Promise<{ data: Shipment[]; total: number }> {
    return { data: [], total: 0 };
  }
  
  async createShipment(data: Partial<Shipment>, lines: Partial<ShipmentLine>[]): Promise<Shipment> {
    throw new Error('Not implemented');
  }
  
  async confirmShipment(id: number, userId: number): Promise<Shipment | null> {
    return null;
  }
  
  async getInvoices(options?: FilterOptions): Promise<{ data: Invoice[]; total: number }> {
    return { data: [], total: 0 };
  }
  
  async getInvoiceById(id: number): Promise<Invoice | null> {
    return null;
  }
  
  async createInvoice(data: Partial<Invoice>, lines: Partial<InvoiceLine>[]): Promise<Invoice> {
    throw new Error('Not implemented');
  }
  
  async updateInvoiceStatus(id: number, status: string): Promise<Invoice | null> {
    return null;
  }
  
  async getDashboardMetrics(): Promise<DashboardMetrics> {
    const today = new Date().toISOString().split('T')[0];
    const thisMonth = today.substring(0, 7);
    
    const metrics = {
      pendingOrders: (this.db.prepare("SELECT COUNT(*) as count FROM sales_orders WHERE status = 'draft'").get() as any).count,
      inProgressProduction: (this.db.prepare("SELECT COUNT(*) as count FROM production_orders WHERE status IN ('released', 'in_progress')").get() as any).count,
      pendingTimeApprovals: (this.db.prepare("SELECT COUNT(*) as count FROM time_entries WHERE status = 'submitted'").get() as any).count,
      delayedOrders: (this.db.prepare(`SELECT COUNT(*) as count FROM sales_orders WHERE status = 'confirmed' AND delivery_date < ? `, ).get(today) as any).count,
      todayShipments: (this.db.prepare(`SELECT COUNT(*) as count FROM shipments WHERE ship_date = ?`).get(today) as any).count,
      monthRevenue: (this.db.prepare(`SELECT COALESCE(SUM(total_amount), 0) as total FROM invoices WHERE invoice_date LIKE ?`).get(`${thisMonth}%`) as any).total
    };
    
    return metrics;
  }
  
  async getProductionProgressReport(startDate: string, endDate: string): Promise<any[]> {
    return [];
  }
  
  async getSalesReport(startDate: string, endDate: string, customerId?: number): Promise<any[]> {
    return [];
  }
  
  async getMonthlyExportData(yearMonth: string): Promise<any[]> {
    return [];
  }
  
  async getCalendar(startDate: string, endDate: string): Promise<Calendar[]> {
    return [];
  }
  
  async updateCalendarDay(date: string, isWorkingDay: boolean, capacityAdjustment: number): Promise<Calendar | null> {
    return null;
  }
  
  async getAttachments(entityType: string, entityId: number): Promise<Attachment[]> {
    return [];
  }
  
  async createAttachment(data: Partial<Attachment>): Promise<Attachment> {
    throw new Error('Not implemented');
  }
  
  async deleteAttachment(id: number): Promise<boolean> {
    return false;
  }
  
  async getComments(entityType: string, entityId: number): Promise<Comment[]> {
    return [];
  }
  
  async createComment(data: Partial<Comment>): Promise<Comment> {
    throw new Error('Not implemented');
  }
  
  async getActivityLogs(entityType: string, entityId: number): Promise<ActivityLog[]> {
    const stmt = this.db.prepare(`
      SELECT al.*, e.name as user_name
      FROM activity_logs al
      LEFT JOIN employees e ON al.user_id = e.id
      WHERE al.entity_type = ? AND al.entity_id = ?
      ORDER BY al.created_at DESC
      LIMIT 100
    `);
    
    const logs = stmt.all(entityType, entityId) as any[];
    return logs.map(log => ({
      ...log,
      old_value: log.old_value ? JSON.parse(log.old_value) : null,
      new_value: log.new_value ? JSON.parse(log.new_value) : null,
      user: { id: log.user_id, name: log.user_name }
    }));
  }
  
  async createActivityLog(data: Partial<ActivityLog>): Promise<ActivityLog> {
    const dataCopy = { ...data };
    if (dataCopy.old_value && typeof dataCopy.old_value !== 'string') dataCopy.old_value = JSON.stringify(dataCopy.old_value);
    if (dataCopy.new_value && typeof dataCopy.new_value !== 'string') dataCopy.new_value = JSON.stringify(dataCopy.new_value);
    
    const columns = Object.keys(dataCopy).filter(k => k !== 'id');
    const values = columns.map(k => dataCopy[k as keyof ActivityLog]);
    const placeholders = columns.map(() => '?').join(',');
    
    const stmt = this.db.prepare(`
      INSERT INTO activity_logs (${columns.join(',')})
      VALUES (${placeholders})
    `);
    
    const result = stmt.run(...values);
    const id = result.lastInsertRowid as number;
    
    const getStmt = this.db.prepare('SELECT * FROM activity_logs WHERE id = ?');
    return getStmt.get(id) as ActivityLog;
  }
  
  async getUserActivityLogs(userId: number, limit: number = 100): Promise<ActivityLog[]> {
    const stmt = this.db.prepare(`
      SELECT * FROM activity_logs 
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `);
    
    const logs = stmt.all(userId, limit) as ActivityLog[];
    return logs.map(log => ({
      ...log,
      old_value: log.old_value ? JSON.parse(log.old_value) : null,
      new_value: log.new_value ? JSON.parse(log.new_value) : null
    }));
  }

  // ========== Simple Time Entries (MVP) ==========
  async getSimpleTimeEntries(options: FilterOptions & { sales_order_id?: number, status?: string } = {}): Promise<{ data: any[]; total: number }> {
    const { limit = 100, offset = 0, query, sales_order_id, status } = options;
    
    let whereConditions = ['1 = 1'];
    let params: any[] = [];
    
    if (query) {
      whereConditions.push('(ste.employee_name LIKE ? OR ste.note LIKE ?)');
      params.push(`%${query}%`, `%${query}%`);
    }
    
    if (sales_order_id) {
      whereConditions.push('ste.sales_order_id = ?');
      params.push(sales_order_id);
    }
    
    if (status && status !== 'all') {
      whereConditions.push('ste.status = ?');
      params.push(status);
    }
    
    const whereClause = whereConditions.join(' AND ');
    
    // Get total count
    const countStmt = this.db.prepare(`
      SELECT COUNT(*) as total
      FROM simple_time_entries ste
      LEFT JOIN sales_orders so ON ste.sales_order_id = so.id
      LEFT JOIN customers c ON so.customer_id = c.id
      WHERE ${whereClause}
    `);
    const { total } = countStmt.get(...params) as { total: number };
    
    // Get data with pagination
    const dataStmt = this.db.prepare(`
      SELECT 
        ste.*,
        so.order_no,
        c.name as customer_name
      FROM simple_time_entries ste
      LEFT JOIN sales_orders so ON ste.sales_order_id = so.id
      LEFT JOIN customers c ON so.customer_id = c.id
      WHERE ${whereClause}
      ORDER BY ste.created_at DESC
      LIMIT ? OFFSET ?
    `);
    const data = dataStmt.all(...params, limit, offset) as any[];
    
    return { data, total };
  }

  async getSimpleTimeEntryById(id: number): Promise<any | null> {
    const stmt = this.db.prepare(`
      SELECT 
        ste.*,
        so.order_no,
        c.name as customer_name
      FROM simple_time_entries ste
      LEFT JOIN sales_orders so ON ste.sales_order_id = so.id
      LEFT JOIN customers c ON so.customer_id = c.id
      WHERE ste.id = ?
    `);
    return stmt.get(id) as any | null;
  }

  async createSimpleTimeEntry(data: any): Promise<any> {
    // Calculate minutes from start_at/end_at if not provided
    let minutes = data.minutes;
    if (!minutes && data.start_at && data.end_at) {
      const startTime = new Date(data.start_at).getTime();
      const endTime = new Date(data.end_at).getTime();
      minutes = Math.round((endTime - startTime) / (1000 * 60));
    }

    const insertData = {
      employee_name: data.employee_name,
      sales_order_id: data.sales_order_id,
      start_at: data.start_at,
      end_at: data.end_at,
      minutes: minutes,
      note: data.note,
      status: 'draft'
    };

    const columns = Object.keys(insertData);
    const values = columns.map(k => insertData[k as keyof typeof insertData]);
    const placeholders = columns.map(() => '?').join(',');
    
    const stmt = this.db.prepare(`
      INSERT INTO simple_time_entries (${columns.join(',')})
      VALUES (${placeholders})
    `);
    
    const result = stmt.run(...values);
    return this.getSimpleTimeEntryById(result.lastInsertRowid as number);
  }

  async updateSimpleTimeEntry(id: number, data: any): Promise<any | null> {
    // Recalculate minutes if start_at/end_at changed
    let updateData = { ...data };
    if (updateData.start_at && updateData.end_at && !updateData.minutes) {
      const startTime = new Date(updateData.start_at).getTime();
      const endTime = new Date(updateData.end_at).getTime();
      updateData.minutes = Math.round((endTime - startTime) / (1000 * 60));
    }

    const columns = Object.keys(updateData).filter(k => k !== 'id');
    const setClause = columns.map(col => `${col} = ?`).join(', ');
    const values = [...columns.map(k => updateData[k]), id];
    
    const stmt = this.db.prepare(`
      UPDATE simple_time_entries 
      SET ${setClause}, updated_at = datetime('now')
      WHERE id = ?
    `);
    
    const result = stmt.run(...values);
    return result.changes > 0 ? this.getSimpleTimeEntryById(id) : null;
  }

  async deleteSimpleTimeEntry(id: number): Promise<boolean> {
    const stmt = this.db.prepare('DELETE FROM simple_time_entries WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  async approveSimpleTimeEntry(id: number, approver: string): Promise<any | null> {
    const approvedAt = new Date().toISOString();
    
    this.db.exec('BEGIN TRANSACTION');
    try {
      // Update time entry status
      const updateStmt = this.db.prepare(`
        UPDATE simple_time_entries 
        SET status = 'approved', approved_at = ?, approved_by = ?, updated_at = datetime('now')
        WHERE id = ?
      `);
      updateStmt.run(approvedAt, approver, id);
      
      // Create approval record
      const approvalStmt = this.db.prepare(`
        INSERT INTO time_approvals (simple_time_entry_id, approver, approved_at)
        VALUES (?, ?, ?)
      `);
      approvalStmt.run(id, approver, approvedAt);
      
      this.db.exec('COMMIT');
      return this.getSimpleTimeEntryById(id);
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }

  async getMonthlyTimeReport(yyyymm: string): Promise<any[]> {
    const [year, month] = yyyymm.split('-');
    const startDate = `${year}-${month.padStart(2, '0')}-01`;
    const endDate = `${year}-${month.padStart(2, '0')}-31`;
    
    const stmt = this.db.prepare(`
      SELECT 
        so.id as sales_order_id,
        so.order_no as so_no,
        c.name as customer_name,
        SUM(ste.minutes) as total_minutes,
        COUNT(ste.id) as entry_count
      FROM simple_time_entries ste
      JOIN sales_orders so ON ste.sales_order_id = so.id
      JOIN customers c ON so.customer_id = c.id
      WHERE ste.status = 'approved'
        AND date(ste.created_at) >= date(?)
        AND date(ste.created_at) <= date(?)
      GROUP BY so.id, so.order_no, c.name
      ORDER BY so.order_no
    `);
    
    return stmt.all(startDate, endDate) as any[];
  }
}