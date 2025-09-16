// SQLite TimeEntry DAO implementation with approval workflow
import Database from 'better-sqlite3';
import { ITimeEntryDAO } from '../interfaces';
import { TimeEntry, TimeEntryFilters, PaginatedResponse, CreateTimeEntryRequest, UpdateTimeEntryRequest } from '@shared/types';
import { nowUtc, calculateMinutes } from '../../utils/timezone';

export class SqliteTimeEntryDAO implements ITimeEntryDAO {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  async findAll(filters: TimeEntryFilters): Promise<PaginatedResponse<TimeEntry>> {
    const {
      project_id,
      employee_id,
      status,
      from,
      to,
      page = 1,
      page_size = 50
    } = filters;

    // Validate pagination
    const validatedPageSize = Math.min(Math.max(1, page_size), 100);
    const validatedPage = Math.max(1, page);
    const offset = (validatedPage - 1) * validatedPageSize;

    // Build WHERE conditions
    const conditions: string[] = [];
    const params: any[] = [];

    if (employee_id !== undefined) {
      conditions.push('te.employee_id = ?');
      params.push(employee_id);
    }

    if (project_id !== undefined) {
      conditions.push('wo.project_id = ?');
      params.push(project_id);
    }

    if (status) {
      conditions.push('te.status = ?');
      params.push(status);
    }

    if (from) {
      conditions.push('DATE(te.start_at) >= ?');
      params.push(from);
    }

    if (to) {
      conditions.push('DATE(te.start_at) <= ?');
      params.push(to);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count
    const countStmt = this.db.prepare(`
      SELECT COUNT(*) as count 
      FROM time_entries te
      JOIN work_orders wo ON te.work_order_id = wo.id
      JOIN projects p ON wo.project_id = p.id
      ${whereClause}
    `);
    const totalCount = (countStmt.get(...params) as any).count;

    // Get paginated data with joins
    const dataStmt = this.db.prepare(`
      SELECT 
        te.*,
        e.name as employee_name,
        e.role as employee_role,
        e.hourly_cost_rate,
        wo.operation,
        wo.std_minutes,
        p.name as project_name,
        p.segment as project_segment,
        approver.name as approver_name
      FROM time_entries te
      JOIN employees e ON te.employee_id = e.id
      JOIN work_orders wo ON te.work_order_id = wo.id
      JOIN projects p ON wo.project_id = p.id
      LEFT JOIN employees approver ON te.approved_by = approver.id
      ${whereClause}
      ORDER BY te.start_at DESC, te.created_at DESC
      LIMIT ? OFFSET ?
    `);
    
    const rows = dataStmt.all(...params, validatedPageSize, offset) as any[];
    
    const timeEntries: TimeEntry[] = rows.map(row => ({
      id: row.id,
      employee_id: row.employee_id,
      work_order_id: row.work_order_id,
      start_at: row.start_at,
      end_at: row.end_at,
      minutes: row.minutes,
      note: row.note,
      status: row.status,
      approved_at: row.approved_at,
      approved_by: row.approved_by,
      created_at: row.created_at,
      updated_at: row.updated_at,
      employee: {
        id: row.employee_id,
        name: row.employee_name,
        role: row.employee_role,
        hourly_cost_rate: row.hourly_cost_rate,
      },
      work_order: {
        id: row.work_order_id,
        project_id: row.project_id,
        operation: row.operation,
        std_minutes: row.std_minutes,
        project: {
          id: row.project_id,
          name: row.project_name,
          segment: row.project_segment,
        },
      },
      approver: row.approved_by ? {
        id: row.approved_by,
        name: row.approver_name,
      } : undefined,
    }));

    const totalPages = Math.ceil(totalCount / validatedPageSize);

    return {
      data: timeEntries,
      meta: {
        page: validatedPage,
        page_size: validatedPageSize,
        total_count: totalCount,
        total_pages: totalPages,
      },
    };
  }

  async findById(id: number): Promise<TimeEntry | null> {
    const stmt = this.db.prepare(`
      SELECT 
        te.*,
        e.name as employee_name,
        e.role as employee_role,
        wo.operation,
        p.name as project_name,
        p.segment as project_segment,
        approver.name as approver_name
      FROM time_entries te
      JOIN employees e ON te.employee_id = e.id
      JOIN work_orders wo ON te.work_order_id = wo.id
      JOIN projects p ON wo.project_id = p.id
      LEFT JOIN employees approver ON te.approved_by = approver.id
      WHERE te.id = ?
    `);
    const row = stmt.get(id) as any;
    
    if (!row) return null;

    return {
      id: row.id,
      employee_id: row.employee_id,
      work_order_id: row.work_order_id,
      start_at: row.start_at,
      end_at: row.end_at,
      minutes: row.minutes,
      note: row.note,
      status: row.status,
      approved_at: row.approved_at,
      approved_by: row.approved_by,
      created_at: row.created_at,
      updated_at: row.updated_at,
      employee: {
        id: row.employee_id,
        name: row.employee_name,
        role: row.employee_role,
      },
      work_order: {
        id: row.work_order_id,
        operation: row.operation,
        project: {
          name: row.project_name,
          segment: row.project_segment,
        },
      },
      approver: row.approved_by ? {
        id: row.approved_by,
        name: row.approver_name,
      } : undefined,
    };
  }

  async findByEmployeeId(employeeId: number, filters?: TimeEntryFilters): Promise<PaginatedResponse<TimeEntry>> {
    return this.findAll({ ...filters, employee_id: employeeId });
  }

  async findByWorkOrderId(workOrderId: number, filters?: TimeEntryFilters): Promise<PaginatedResponse<TimeEntry>> {
    const stmt = this.db.prepare(`
      SELECT wo.project_id FROM work_orders wo WHERE wo.id = ?
    `);
    const workOrder = stmt.get(workOrderId) as any;
    
    if (!workOrder) {
      return {
        data: [],
        meta: { page: 1, page_size: 50, total_count: 0, total_pages: 0 }
      };
    }

    return this.findAll({ 
      ...filters, 
      project_id: workOrder.project_id 
    });
  }

  async findDraftsByEmployee(employeeId: number): Promise<TimeEntry[]> {
    const result = await this.findAll({ 
      employee_id: employeeId, 
      status: 'draft',
      page_size: 100 
    });
    return result.data;
  }

  async findPendingApprovals(): Promise<TimeEntry[]> {
    const result = await this.findAll({ 
      status: 'draft',
      page_size: 100 
    });
    return result.data;
  }

  async create(timeEntry: CreateTimeEntryRequest): Promise<TimeEntry> {
    const stmt = this.db.prepare(`
      INSERT INTO time_entries (employee_id, work_order_id, start_at, end_at, minutes, note, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 'draft', ?, ?)
    `);

    const now = nowUtc();
    
    // Calculate minutes if not provided
    let minutes = timeEntry.minutes;
    if (!minutes && timeEntry.start_at && timeEntry.end_at) {
      minutes = this.calculateMinutes(timeEntry.start_at, timeEntry.end_at);
    }

    const result = stmt.run(
      timeEntry.employee_id,
      timeEntry.work_order_id,
      timeEntry.start_at || null,
      timeEntry.end_at || null,
      minutes || null,
      timeEntry.note || null,
      now,
      now
    );

    const newTimeEntry = await this.findById(result.lastInsertRowid as number);
    if (!newTimeEntry) {
      throw new Error('Failed to create time entry');
    }

    return newTimeEntry;
  }

  async update(id: number, updates: UpdateTimeEntryRequest): Promise<TimeEntry> {
    const setParts: string[] = ['updated_at = ?'];
    const values: any[] = [nowUtc()];

    if (updates.start_at !== undefined) {
      setParts.push('start_at = ?');
      values.push(updates.start_at);
    }
    if (updates.end_at !== undefined) {
      setParts.push('end_at = ?');
      values.push(updates.end_at);
    }
    if (updates.minutes !== undefined) {
      setParts.push('minutes = ?');
      values.push(updates.minutes);
    }
    if (updates.note !== undefined) {
      setParts.push('note = ?');
      values.push(updates.note);
    }

    const stmt = this.db.prepare(`
      UPDATE time_entries 
      SET ${setParts.join(', ')} 
      WHERE id = ? AND status = 'draft'
    `);

    values.push(id);
    const result = stmt.run(...values);

    if (result.changes === 0) {
      throw new Error('Time entry not found or already approved');
    }

    const updatedTimeEntry = await this.findById(id);
    if (!updatedTimeEntry) {
      throw new Error('Failed to update time entry');
    }

    return updatedTimeEntry;
  }

  async approve(id: number, approverId: number): Promise<TimeEntry> {
    const now = nowUtc();

    const transaction = this.db.transaction(() => {
      // Update time entry status
      const updateStmt = this.db.prepare(`
        UPDATE time_entries 
        SET status = 'approved', approved_at = ?, approved_by = ?, updated_at = ?
        WHERE id = ? AND status = 'draft'
      `);
      const result = updateStmt.run(now, approverId, now, id);

      if (result.changes === 0) {
        throw new Error('Time entry not found or already approved');
      }

      // Create approval audit log
      const auditStmt = this.db.prepare(`
        INSERT INTO approvals (time_entry_id, approver_id, approved_at)
        VALUES (?, ?, ?)
      `);
      auditStmt.run(id, approverId, now);
    });

    transaction();

    const approvedTimeEntry = await this.findById(id);
    if (!approvedTimeEntry) {
      throw new Error('Failed to approve time entry');
    }

    return approvedTimeEntry;
  }

  async delete(id: number): Promise<boolean> {
    // Only allow deletion of draft entries
    const stmt = this.db.prepare(`
      DELETE FROM time_entries 
      WHERE id = ? AND status = 'draft'
    `);
    const result = stmt.run(id);
    return result.changes > 0;
  }

  calculateMinutes(startAt: string, endAt: string): number {
    return calculateMinutes(startAt, endAt);
  }
}