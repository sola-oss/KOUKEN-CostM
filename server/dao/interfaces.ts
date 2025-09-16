// DAO Interface definitions - Database agnostic for PostgreSQL migration
import {
  Employee, Vendor, Project, WorkOrder, TimeEntry, Approval,
  TimeEntryFilters, VendorFilters, ReportFilters, ProjectReport,
  CreateTimeEntryRequest, UpdateTimeEntryRequest, PaginatedResponse,
  ImportResult, VendorImportRow
} from '@shared/types';

export interface IEmployeeDAO {
  findAll(): Promise<Employee[]>;
  findById(id: number): Promise<Employee | null>;
  findByRole(role: string): Promise<Employee[]>;
  create(employee: Omit<Employee, 'id' | 'created_at'>): Promise<Employee>;
  update(id: number, updates: Partial<Employee>): Promise<Employee>;
  delete(id: number): Promise<boolean>;
}

export interface IVendorDAO {
  findAll(filters: VendorFilters): Promise<PaginatedResponse<Vendor>>;
  findById(id: number): Promise<Vendor | null>;
  search(query: string, filters: VendorFilters): Promise<PaginatedResponse<Vendor>>;
  create(vendor: Omit<Vendor, 'id' | 'created_at'>): Promise<Vendor>;
  update(id: number, updates: Partial<Vendor>): Promise<Vendor>;
  delete(id: number): Promise<boolean>;
  importFromCsv(rows: VendorImportRow[]): Promise<ImportResult>;
}

export interface IProjectDAO {
  findAll(): Promise<Project[]>;
  findById(id: number): Promise<Project | null>;
  findBySegment(segment: string): Promise<Project[]>;
  findActive(): Promise<Project[]>;
  create(project: Omit<Project, 'id' | 'created_at'>): Promise<Project>;
  update(id: number, updates: Partial<Project>): Promise<Project>;
  delete(id: number): Promise<boolean>;
}

export interface IWorkOrderDAO {
  findAll(): Promise<WorkOrder[]>;
  findById(id: number): Promise<WorkOrder | null>;
  findByProjectId(projectId: number): Promise<WorkOrder[]>;
  create(workOrder: Omit<WorkOrder, 'id'>): Promise<WorkOrder>;
  update(id: number, updates: Partial<WorkOrder>): Promise<WorkOrder>;
  delete(id: number): Promise<boolean>;
}

export interface ITimeEntryDAO {
  findAll(filters: TimeEntryFilters): Promise<PaginatedResponse<TimeEntry>>;
  findById(id: number): Promise<TimeEntry | null>;
  findByEmployeeId(employeeId: number, filters?: TimeEntryFilters): Promise<PaginatedResponse<TimeEntry>>;
  findByWorkOrderId(workOrderId: number, filters?: TimeEntryFilters): Promise<PaginatedResponse<TimeEntry>>;
  findDraftsByEmployee(employeeId: number): Promise<TimeEntry[]>;
  findPendingApprovals(): Promise<TimeEntry[]>;
  create(timeEntry: CreateTimeEntryRequest): Promise<TimeEntry>;
  update(id: number, updates: UpdateTimeEntryRequest): Promise<TimeEntry>;
  approve(id: number, approverId: number): Promise<TimeEntry>;
  delete(id: number): Promise<boolean>;
  calculateMinutes(startAt: string, endAt: string): number;
}

export interface IApprovalDAO {
  findAll(): Promise<Approval[]>;
  findByTimeEntryId(timeEntryId: number): Promise<Approval[]>;
  findByApproverId(approverId: number): Promise<Approval[]>;
  create(approval: Omit<Approval, 'id'>): Promise<Approval>;
}

export interface IReportDAO {
  getProjectReports(filters: ReportFilters): Promise<ProjectReport[]>;
  getMonthlyReport(yearMonth: string): Promise<ProjectReport[]>;
  getDashboardStats(employeeId?: number): Promise<{
    todayHours: number;
    pendingApprovals: number;
    activeProjects: number;
  }>;
}

export interface IDatabase {
  employees: IEmployeeDAO;
  vendors: IVendorDAO;
  projects: IProjectDAO;
  workOrders: IWorkOrderDAO;
  timeEntries: ITimeEntryDAO;
  approvals: IApprovalDAO;
  reports: IReportDAO;
  close(): Promise<void>;
  runMigration(sql: string): Promise<void>;
}