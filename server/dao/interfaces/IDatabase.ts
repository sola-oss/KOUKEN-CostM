// Database Interface for Production Management System
import { 
  Employee, Customer, Vendor, Item, WorkCenter,
  SalesOrder, SalesOrderLine,
  ProductionOrder, WorkOrder, WorkInstruction,
  PurchaseOrder, PurchaseOrderLine, Receipt,
  TimeEntry, ExternalTimeEntry,
  Shipment, ShipmentLine,
  Invoice, InvoiceLine,
  Calendar, Attachment, Comment, ActivityLog
} from '../../../shared/types';

export interface QueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}

export interface FilterOptions extends QueryOptions {
  status?: string;
  startDate?: string;
  endDate?: string;
  customerId?: number;
  vendorId?: number;
  employeeId?: number;
  query?: string;
}

export interface IDatabase {
  // Connection Management
  close(): Promise<void>;
  beginTransaction(): Promise<void>;
  commit(): Promise<void>;
  rollback(): Promise<void>;

  // ========== Employees ==========
  getEmployees(options?: QueryOptions): Promise<Employee[]>;
  getEmployeeById(id: number): Promise<Employee | null>;
  createEmployee(data: Partial<Employee>): Promise<Employee>;
  updateEmployee(id: number, data: Partial<Employee>): Promise<Employee | null>;
  
  // ========== Customers ==========
  getCustomers(options?: FilterOptions): Promise<{ data: Customer[]; total: number }>;
  getCustomerById(id: number): Promise<Customer | null>;
  getCustomerByCode(code: string): Promise<Customer | null>;
  createCustomer(data: Partial<Customer>): Promise<Customer>;
  updateCustomer(id: number, data: Partial<Customer>): Promise<Customer | null>;
  
  // ========== Vendors ==========
  getVendors(options?: FilterOptions): Promise<{ data: Vendor[]; total: number }>;
  getVendorById(id: number): Promise<Vendor | null>;
  getVendorByCode(code: string): Promise<Vendor | null>;
  createVendor(data: Partial<Vendor>): Promise<Vendor>;
  updateVendor(id: number, data: Partial<Vendor>): Promise<Vendor | null>;
  importVendors(vendors: Partial<Vendor>[]): Promise<number>;
  
  // ========== Items ==========
  getItems(options?: FilterOptions): Promise<{ data: Item[]; total: number }>;
  getItemById(id: number): Promise<Item | null>;
  getItemByCode(code: string): Promise<Item | null>;
  createItem(data: Partial<Item>): Promise<Item>;
  updateItem(id: number, data: Partial<Item>): Promise<Item | null>;
  
  // ========== Sales Orders ==========
  getSalesOrders(options?: FilterOptions): Promise<{ data: SalesOrder[]; total: number }>;
  getSalesOrderById(id: number): Promise<SalesOrder | null>;
  getSalesOrderByNo(orderNo: string): Promise<SalesOrder | null>;
  createSalesOrder(data: Partial<SalesOrder>, lines: Partial<SalesOrderLine>[]): Promise<SalesOrder>;
  updateSalesOrder(id: number, data: Partial<SalesOrder>): Promise<SalesOrder | null>;
  confirmSalesOrder(id: number, userId: number): Promise<SalesOrder | null>;
  
  // ========== Production Orders ==========
  getProductionOrders(options?: FilterOptions): Promise<{ data: ProductionOrder[]; total: number }>;
  getProductionOrderById(id: number): Promise<ProductionOrder | null>;
  createProductionOrder(data: Partial<ProductionOrder>): Promise<ProductionOrder>;
  updateProductionOrderSchedule(id: number, startDate: string, endDate: string): Promise<ProductionOrder | null>;
  getProductionCalendar(startDate: string, endDate: string): Promise<any[]>;
  
  // ========== Work Orders ==========
  getWorkOrders(productionOrderId?: number, options?: FilterOptions): Promise<{ data: WorkOrder[]; total: number }>;
  getWorkOrderById(id: number): Promise<WorkOrder | null>;
  createWorkOrder(data: Partial<WorkOrder>): Promise<WorkOrder>;
  updateWorkOrder(id: number, data: Partial<WorkOrder>): Promise<WorkOrder | null>;
  
  // ========== Work Instructions ==========
  getWorkInstructions(workOrderId?: number, options?: FilterOptions): Promise<{ data: WorkInstruction[]; total: number }>;
  createWorkInstruction(data: Partial<WorkInstruction>): Promise<WorkInstruction>;
  confirmWorkInstruction(id: number, userId: number): Promise<WorkInstruction | null>;
  
  // ========== Purchase Orders ==========
  getPurchaseOrders(options?: FilterOptions): Promise<{ data: PurchaseOrder[]; total: number }>;
  getPurchaseOrderById(id: number): Promise<PurchaseOrder | null>;
  createPurchaseOrder(data: Partial<PurchaseOrder>, lines: Partial<PurchaseOrderLine>[]): Promise<PurchaseOrder>;
  confirmPurchaseOrder(id: number, userId: number): Promise<PurchaseOrder | null>;
  
  // ========== Receipts ==========
  getReceipts(purchaseOrderId?: number, options?: FilterOptions): Promise<{ data: Receipt[]; total: number }>;
  createReceipt(data: Partial<Receipt>): Promise<Receipt>;
  confirmReceipt(id: number, userId: number): Promise<Receipt | null>;
  
  // ========== Time Entries ==========
  getTimeEntries(options?: FilterOptions): Promise<{ data: TimeEntry[]; total: number }>;
  getTimeEntryById(id: number): Promise<TimeEntry | null>;
  createTimeEntry(data: Partial<TimeEntry>): Promise<TimeEntry>;
  updateTimeEntry(id: number, data: Partial<TimeEntry>): Promise<TimeEntry | null>;
  approveTimeEntry(id: number, userId: number): Promise<TimeEntry | null>;
  getTimeEntriesForApproval(managerId: number): Promise<TimeEntry[]>;
  
  // ========== External Time Entries ==========
  getExternalTimeEntries(options?: FilterOptions): Promise<{ data: ExternalTimeEntry[]; total: number }>;
  createExternalTimeEntry(data: Partial<ExternalTimeEntry>): Promise<ExternalTimeEntry>;
  approveExternalTimeEntry(id: number, userId: number): Promise<ExternalTimeEntry | null>;
  
  // ========== Shipments ==========
  getShipments(options?: FilterOptions): Promise<{ data: Shipment[]; total: number }>;
  createShipment(data: Partial<Shipment>, lines: Partial<ShipmentLine>[]): Promise<Shipment>;
  confirmShipment(id: number, userId: number): Promise<Shipment | null>;
  
  // ========== Invoices ==========
  getInvoices(options?: FilterOptions): Promise<{ data: Invoice[]; total: number }>;
  getInvoiceById(id: number): Promise<Invoice | null>;
  createInvoice(data: Partial<Invoice>, lines: Partial<InvoiceLine>[]): Promise<Invoice>;
  updateInvoiceStatus(id: number, status: string): Promise<Invoice | null>;
  
  // ========== Reports ==========
  getDashboardMetrics(): Promise<{
    pendingOrders: number;
    inProgressProduction: number;
    pendingTimeApprovals: number;
    delayedOrders: number;
    todayShipments: number;
    monthRevenue: number;
  }>;
  
  getProductionProgressReport(startDate: string, endDate: string): Promise<any[]>;
  getSalesReport(startDate: string, endDate: string, customerId?: number): Promise<any[]>;
  getMonthlyExportData(yearMonth: string): Promise<any[]>;
  
  // ========== Calendars ==========
  getCalendar(startDate: string, endDate: string): Promise<Calendar[]>;
  updateCalendarDay(date: string, isWorkingDay: boolean, capacityAdjustment: number): Promise<Calendar | null>;
  
  // ========== Attachments & Comments ==========
  getAttachments(entityType: string, entityId: number): Promise<Attachment[]>;
  createAttachment(data: Partial<Attachment>): Promise<Attachment>;
  deleteAttachment(id: number): Promise<boolean>;
  
  getComments(entityType: string, entityId: number): Promise<Comment[]>;
  createComment(data: Partial<Comment>): Promise<Comment>;
  
  // ========== Activity Logs ==========
  getActivityLogs(entityType: string, entityId: number): Promise<ActivityLog[]>;
  createActivityLog(data: Partial<ActivityLog>): Promise<ActivityLog>;
  getUserActivityLogs(userId: number, limit?: number): Promise<ActivityLog[]>;
}