// SQLite Approval DAO implementation
import Database from 'better-sqlite3';
import { IApprovalDAO } from '../interfaces';
import { Approval } from '@shared/types';

export class SqliteApprovalDAO implements IApprovalDAO {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  async findAll(): Promise<Approval[]> {
    const stmt = this.db.prepare(`
      SELECT 
        a.*,
        te.employee_id,
        te.work_order_id,
        te.minutes,
        te.note,
        e.name as approver_name,
        e.role as approver_role,
        emp.name as employee_name,
        wo.operation,
        p.name as project_name
      FROM approvals a
      JOIN time_entries te ON a.time_entry_id = te.id
      JOIN employees e ON a.approver_id = e.id
      JOIN employees emp ON te.employee_id = emp.id
      JOIN work_orders wo ON te.work_order_id = wo.id
      JOIN projects p ON wo.project_id = p.id
      ORDER BY a.approved_at DESC
    `);
    const rows = stmt.all() as any[];
    
    return rows.map(row => ({
      id: row.id,
      time_entry_id: row.time_entry_id,
      approver_id: row.approver_id,
      approved_at: row.approved_at,
      time_entry: {
        id: row.time_entry_id,
        employee_id: row.employee_id,
        work_order_id: row.work_order_id,
        minutes: row.minutes,
        note: row.note,
        employee: {
          id: row.employee_id,
          name: row.employee_name,
        },
        work_order: {
          id: row.work_order_id,
          operation: row.operation,
          project: {
            name: row.project_name,
          },
        },
      },
      approver: {
        id: row.approver_id,
        name: row.approver_name,
        role: row.approver_role,
      },
    }));
  }

  async findByTimeEntryId(timeEntryId: number): Promise<Approval[]> {
    const stmt = this.db.prepare(`
      SELECT 
        a.*,
        e.name as approver_name,
        e.role as approver_role
      FROM approvals a
      JOIN employees e ON a.approver_id = e.id
      WHERE a.time_entry_id = ?
      ORDER BY a.approved_at DESC
    `);
    const rows = stmt.all(timeEntryId) as any[];
    
    return rows.map(row => ({
      id: row.id,
      time_entry_id: row.time_entry_id,
      approver_id: row.approver_id,
      approved_at: row.approved_at,
      approver: {
        id: row.approver_id,
        name: row.approver_name,
        role: row.approver_role,
      },
    }));
  }

  async findByApproverId(approverId: number): Promise<Approval[]> {
    const stmt = this.db.prepare(`
      SELECT 
        a.*,
        te.employee_id,
        te.minutes,
        te.note,
        emp.name as employee_name,
        wo.operation,
        p.name as project_name
      FROM approvals a
      JOIN time_entries te ON a.time_entry_id = te.id
      JOIN employees emp ON te.employee_id = emp.id
      JOIN work_orders wo ON te.work_order_id = wo.id
      JOIN projects p ON wo.project_id = p.id
      WHERE a.approver_id = ?
      ORDER BY a.approved_at DESC
    `);
    const rows = stmt.all(approverId) as any[];
    
    return rows.map(row => ({
      id: row.id,
      time_entry_id: row.time_entry_id,
      approver_id: row.approver_id,
      approved_at: row.approved_at,
      time_entry: {
        id: row.time_entry_id,
        employee_id: row.employee_id,
        minutes: row.minutes,
        note: row.note,
        employee: {
          id: row.employee_id,
          name: row.employee_name,
        },
        work_order: {
          id: row.work_order_id,
          operation: row.operation,
          project: {
            name: row.project_name,
          },
        },
      },
    }));
  }

  async create(approval: Omit<Approval, 'id'>): Promise<Approval> {
    const stmt = this.db.prepare(`
      INSERT INTO approvals (time_entry_id, approver_id, approved_at)
      VALUES (?, ?, ?)
    `);

    const result = stmt.run(
      approval.time_entry_id,
      approval.approver_id,
      approval.approved_at
    );

    // Return simplified approval record
    return {
      id: result.lastInsertRowid as number,
      time_entry_id: approval.time_entry_id,
      approver_id: approval.approver_id,
      approved_at: approval.approved_at,
    };
  }
}