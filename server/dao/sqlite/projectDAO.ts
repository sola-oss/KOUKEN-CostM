// SQLite Project DAO implementation
import Database from 'better-sqlite3';
import { IProjectDAO } from '../interfaces';
import { Project } from '@shared/types';
import { nowUtc } from '../../utils/timezone';

export class SqliteProjectDAO implements IProjectDAO {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  async findAll(): Promise<Project[]> {
    const stmt = this.db.prepare(`
      SELECT p.*, v.name as vendor_name
      FROM projects p
      LEFT JOIN vendors v ON p.vendor_id = v.id
      WHERE p.is_active = 1 
      ORDER BY p.created_at DESC
    `);
    const rows = stmt.all() as any[];
    
    return rows.map(row => ({
      id: row.id,
      name: row.name,
      customer: row.customer,
      segment: row.segment,
      start_date: row.start_date,
      end_date: row.end_date,
      vendor_id: row.vendor_id,
      is_active: Boolean(row.is_active),
      created_at: row.created_at,
      vendor: row.vendor_id ? {
        id: row.vendor_id,
        name: row.vendor_name,
      } : undefined,
    } as Project));
  }

  async findById(id: number): Promise<Project | null> {
    const stmt = this.db.prepare(`
      SELECT p.*, v.name as vendor_name, v.category as vendor_category
      FROM projects p
      LEFT JOIN vendors v ON p.vendor_id = v.id
      WHERE p.id = ?
    `);
    const row = stmt.get(id) as any;
    
    if (!row) return null;

    return {
      id: row.id,
      name: row.name,
      customer: row.customer,
      segment: row.segment,
      start_date: row.start_date,
      end_date: row.end_date,
      vendor_id: row.vendor_id,
      is_active: Boolean(row.is_active),
      created_at: row.created_at,
      vendor: row.vendor_id ? {
        id: row.vendor_id,
        name: row.vendor_name,
        category: row.vendor_category,
      } : undefined,
    } as Project;
  }

  async findBySegment(segment: string): Promise<Project[]> {
    const stmt = this.db.prepare(`
      SELECT * FROM projects 
      WHERE segment = ? AND is_active = 1 
      ORDER BY name
    `);
    return stmt.all(segment) as Project[];
  }

  async findActive(): Promise<Project[]> {
    const stmt = this.db.prepare(`
      SELECT * FROM projects 
      WHERE is_active = 1 
      ORDER BY name
    `);
    return stmt.all() as Project[];
  }

  async create(project: Omit<Project, 'id' | 'created_at'>): Promise<Project> {
    const stmt = this.db.prepare(`
      INSERT INTO projects (name, customer, segment, start_date, end_date, vendor_id, is_active, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const now = nowUtc();
    const result = stmt.run(
      project.name,
      project.customer || null,
      project.segment,
      project.start_date || null,
      project.end_date || null,
      project.vendor_id || null,
      project.is_active ? 1 : 0,
      now
    );

    const newProject = await this.findById(result.lastInsertRowid as number);
    if (!newProject) {
      throw new Error('Failed to create project');
    }

    return newProject;
  }

  async update(id: number, updates: Partial<Project>): Promise<Project> {
    const setParts: string[] = [];
    const values: any[] = [];

    if (updates.name !== undefined) {
      setParts.push('name = ?');
      values.push(updates.name);
    }
    if (updates.customer !== undefined) {
      setParts.push('customer = ?');
      values.push(updates.customer);
    }
    if (updates.segment !== undefined) {
      setParts.push('segment = ?');
      values.push(updates.segment);
    }
    if (updates.start_date !== undefined) {
      setParts.push('start_date = ?');
      values.push(updates.start_date);
    }
    if (updates.end_date !== undefined) {
      setParts.push('end_date = ?');
      values.push(updates.end_date);
    }
    if (updates.vendor_id !== undefined) {
      setParts.push('vendor_id = ?');
      values.push(updates.vendor_id);
    }
    if (updates.is_active !== undefined) {
      setParts.push('is_active = ?');
      values.push(updates.is_active ? 1 : 0);
    }

    if (setParts.length === 0) {
      throw new Error('No fields to update');
    }

    const stmt = this.db.prepare(`
      UPDATE projects 
      SET ${setParts.join(', ')} 
      WHERE id = ?
    `);

    values.push(id);
    const result = stmt.run(...values);

    if (result.changes === 0) {
      throw new Error('Project not found');
    }

    const updatedProject = await this.findById(id);
    if (!updatedProject) {
      throw new Error('Failed to update project');
    }

    return updatedProject;
  }

  async delete(id: number): Promise<boolean> {
    // Soft delete - set is_active to false
    const stmt = this.db.prepare('UPDATE projects SET is_active = 0 WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }
}