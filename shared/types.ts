// 生産業向け工数管理システム 共通型定義

// 従業員の役割
export type EmployeeRole = 'worker' | 'manager' | 'admin';

// 案件セグメント
export type ProjectSegment = '観光' | '住宅' | 'サウナ';

// 工数実績の状態
export type TimeEntryStatus = 'draft' | 'approved';

// 従業員
export interface Employee {
  id: number;
  name: string;
  role: EmployeeRole;
  email?: string;
  hourly_cost_rate: number;
  is_active: boolean;
  created_at: string;
}

// 業者
export interface Vendor {
  id: number;
  name: string;
  category?: string;
  address_pref?: string;
  phone?: string;
  email?: string;
  payment_terms?: string;
  is_active: boolean;
  created_at: string;
}

// 案件
export interface Project {
  id: number;
  name: string;
  customer?: string;
  segment: ProjectSegment;
  start_date?: string;
  end_date?: string;
  vendor_id?: number;
  is_active: boolean;
  created_at: string;
  // 結合データ
  vendor?: Vendor;
}

// 工程
export interface WorkOrder {
  id: number;
  project_id: number;
  operation: string;
  std_minutes: number;
  // 結合データ
  project?: Project;
}

// 工数実績
export interface TimeEntry {
  id: number;
  employee_id: number;
  work_order_id: number;
  start_at?: string;
  end_at?: string;
  minutes?: number;
  note?: string;
  status: TimeEntryStatus;
  approved_at?: string;
  approved_by?: number;
  created_at: string;
  updated_at: string;
  // 結合データ
  employee?: Employee;
  work_order?: WorkOrder;
  approver?: Employee;
}

// 承認ログ
export interface Approval {
  id: number;
  time_entry_id: number;
  approver_id: number;
  approved_at: string;
  // 結合データ
  time_entry?: TimeEntry;
  approver?: Employee;
}

// API レスポンス用インターフェース
export interface PaginationMeta {
  page: number;
  page_size: number;
  total_count: number;
  total_pages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

// レポート用型定義
export interface ProjectReport {
  project_id: number;
  project_name: string;
  segment: ProjectSegment;
  total_minutes: number;
  labor_cost: number;
}

// API リクエスト用型定義
export interface CreateTimeEntryRequest {
  employee_id: number;
  work_order_id: number;
  start_at?: string;
  end_at?: string;
  minutes?: number;
  note?: string;
}

export interface UpdateTimeEntryRequest {
  start_at?: string;
  end_at?: string;
  minutes?: number;
  note?: string;
}

export interface TimeEntryFilters {
  project_id?: number;
  employee_id?: number;
  status?: TimeEntryStatus;
  from?: string; // YYYY-MM-DD
  to?: string;   // YYYY-MM-DD
  page?: number;
  page_size?: number;
}

export interface VendorFilters {
  query?: string;
  category?: string;
  pref?: string;
  is_active?: boolean;
  page?: number;
  page_size?: number;
}

export interface ReportFilters {
  from?: string;
  to?: string;
  segment?: ProjectSegment;
}

// CSV インポート用型定義
export interface VendorImportRow {
  name: string;
  category?: string;
  address_pref?: string;
  phone?: string;
  email?: string;
  payment_terms?: string;
}

export interface ImportResult {
  inserted: number;
  updated: number;
  failed: Array<{
    row: number;
    reason: string;
    data: VendorImportRow;
  }>;
}

// エラー応答型
export interface ApiError {
  error: string;
  details?: string;
  field?: string;
}