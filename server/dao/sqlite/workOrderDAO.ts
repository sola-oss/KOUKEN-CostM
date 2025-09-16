// SQLite WorkOrder DAO implementation
import Database from 'better-sqlite3';
import { IWorkOrderDAO } from '../interfaces';
import { WorkOrder } from '@shared/types';

export class SqliteWorkOrderDAO implements IWorkOrderDAO {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  async findAll(): Promise<WorkOrder[]> {
    const stmt = this.db.prepare(`
      SELECT wo.*, p.name as project_name, p.segment as project_segment
      FROM work_orders wo
      JOIN projects p ON wo.project_id = p.id
      WHERE p.is_active = 1
      ORDER BY p.name, wo.operation
    `);
    const rows = stmt.all() as any[];
    
    return rows.map(row => ({
      id: row.id,
      project_id: row.project_id,
      operation: row.operation,
      std_minutes: row.std_minutes,
      project: {
        id: row.project_id,
        name: row.project_name,
        segment: row.project_segment,
      },
    } as WorkOrder));
  }

  async findById(id: number): Promise<WorkOrder | null> {
    const stmt = this.db.prepare(`
      SELECT wo.*, p.name as project_name, p.segment as project_segment, p.customer
      FROM work_orders wo
      JOIN projects p ON wo.project_id = p.id
      WHERE wo.id = ?
    `);
    const row = stmt.get(id) as any;
    
    if (!row) return null;

    return {
      id: row.id,
      project_id: row.project_id,
      operation: row.operation,
      std_minutes: row.std_minutes,
      project: {
        id: row.project_id,
        name: row.project_name,
        segment: row.project_segment,
        customer: row.customer,
      },
    } as WorkOrder;
  }

  async findByProjectId(projectId: number): Promise<WorkOrder[]> {
    const stmt = this.db.prepare(`
      SELECT wo.*, p.name as project_name
      FROM work_orders wo
      JOIN projects p ON wo.project_id = p.id
      WHERE wo.project_id = ?
      ORDER BY wo.operation
    `);
    const rows = stmt.all(projectId) as any[];
    
    return rows.map(row => ({
      id: row.id,
      project_id: row.project_id,
      operation: row.operation,
      std_minutes: row.std_minutes,
      project: {
        id: row.project_id,
        name: row.project_name,
      },
    } as WorkOrder));
  }

  async create(workOrder: Omit<WorkOrder, 'id'>): Promise<WorkOrder> {
    const stmt = this.db.prepare(`
      INSERT INTO work_orders (project_id, operation, std_minutes)
      VALUES (?, ?, ?)
    `);

    const result = stmt.run(
      workOrder.project_id,
      workOrder.operation,
      workOrder.std_minutes || 0
    );

    const newWorkOrder = await this.findById(result.lastInsertRowid as number);
    if (!newWorkOrder) {
      throw new Error('Failed to create work order');
    }

    return newWorkOrder;
  }

  async update(id: number, updates: Partial<WorkOrder>): Promise<WorkOrder> {
    const setParts: string[] = [];
    const values: any[] = [];

    if (updates.project_id !== undefined) {
      setParts.push('project_id = ?');
      values.push(updates.project_id);
    }
    if (updates.operation !== undefined) {
      setParts.push('operation = ?');
      values.push(updates.operation);
    }
    if (updates.std_minutes !== undefined) {
      setParts.push('std_minutes = ?');
      values.push(updates.std_minutes);
    }

    if (setParts.length === 0) {
      throw new Error('No fields to update');
    }

    const stmt = this.db.prepare(`
      UPDATE work_orders 
      SET ${setParts.join(', ')} 
      WHERE id = ?
    `);

    values.push(id);
    const result = stmt.run(...values);

    if (result.changes === 0) {
      throw new Error('Work order not found');
    }

    const updatedWorkOrder = await this.findById(id);
    if (!updatedWorkOrder) {
      throw new Error('Failed to update work order');
    }

    return updatedWorkOrder;
  }

  async delete(id: number): Promise<boolean> {
    // Hard delete for work orders (but check for time entries first)
    const checkStmt = this.db.prepare(`
      SELECT COUNT(*) as count FROM time_entries WHERE work_order_id = ?
    `);
    const timeEntriesCount = (checkStmt.get(id) as any).count;

    if (timeEntriesCount > 0) {
      throw new Error('Cannot delete work order with existing time entries');
    }

    const deleteStmt = this.db.prepare('DELETE FROM work_orders WHERE id = ?');
    const result = deleteStmt.run(id);
    return result.changes > 0;
  }
}