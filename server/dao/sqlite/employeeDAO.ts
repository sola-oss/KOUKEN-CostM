// SQLite Employee DAO implementation
import Database from 'better-sqlite3';
import { IEmployeeDAO } from '../interfaces';
import { Employee } from '@shared/types';
import { nowUtc } from '../../utils/timezone';

export class SqliteEmployeeDAO implements IEmployeeDAO {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  async findAll(): Promise<Employee[]> {
    const stmt = this.db.prepare(`
      SELECT * FROM employees 
      WHERE is_active = 1 
      ORDER BY name
    `);
    return stmt.all() as Employee[];
  }

  async findById(id: number): Promise<Employee | null> {
    const stmt = this.db.prepare(`
      SELECT * FROM employees WHERE id = ?
    `);
    const result = stmt.get(id) as Employee | undefined;
    return result || null;
  }

  async findByRole(role: string): Promise<Employee[]> {
    const stmt = this.db.prepare(`
      SELECT * FROM employees 
      WHERE role = ? AND is_active = 1 
      ORDER BY name
    `);
    return stmt.all(role) as Employee[];
  }

  async create(employee: Omit<Employee, 'id' | 'created_at'>): Promise<Employee> {
    const stmt = this.db.prepare(`
      INSERT INTO employees (name, role, email, hourly_cost_rate, is_active, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const now = nowUtc();
    const result = stmt.run(
      employee.name,
      employee.role,
      employee.email || null,
      employee.hourly_cost_rate,
      employee.is_active ? 1 : 0,
      now
    );

    const newEmployee = await this.findById(result.lastInsertRowid as number);
    if (!newEmployee) {
      throw new Error('Failed to create employee');
    }

    return newEmployee;
  }

  async update(id: number, updates: Partial<Employee>): Promise<Employee> {
    const setParts: string[] = [];
    const values: any[] = [];

    if (updates.name !== undefined) {
      setParts.push('name = ?');
      values.push(updates.name);
    }
    if (updates.role !== undefined) {
      setParts.push('role = ?');
      values.push(updates.role);
    }
    if (updates.email !== undefined) {
      setParts.push('email = ?');
      values.push(updates.email);
    }
    if (updates.hourly_cost_rate !== undefined) {
      setParts.push('hourly_cost_rate = ?');
      values.push(updates.hourly_cost_rate);
    }
    if (updates.is_active !== undefined) {
      setParts.push('is_active = ?');
      values.push(updates.is_active ? 1 : 0);
    }

    if (setParts.length === 0) {
      throw new Error('No fields to update');
    }

    const stmt = this.db.prepare(`
      UPDATE employees 
      SET ${setParts.join(', ')} 
      WHERE id = ?
    `);

    values.push(id);
    const result = stmt.run(...values);

    if (result.changes === 0) {
      throw new Error('Employee not found');
    }

    const updatedEmployee = await this.findById(id);
    if (!updatedEmployee) {
      throw new Error('Failed to update employee');
    }

    return updatedEmployee;
  }

  async delete(id: number): Promise<boolean> {
    // Soft delete - set is_active to false
    const stmt = this.db.prepare(`
      UPDATE employees SET is_active = 0 WHERE id = ?
    `);
    
    const result = stmt.run(id);
    return result.changes > 0;
  }
}