// SQLite Vendor DAO implementation with search and pagination
import Database from 'better-sqlite3';
import { IVendorDAO } from '../interfaces';
import { Vendor, VendorFilters, PaginatedResponse, ImportResult, VendorImportRow } from '@shared/types';
import { nowUtc } from '../../utils/timezone';

export class SqliteVendorDAO implements IVendorDAO {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  async findAll(filters: VendorFilters): Promise<PaginatedResponse<Vendor>> {
    const {
      query,
      category,
      pref,
      is_active = true,
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

    if (is_active !== undefined) {
      conditions.push('is_active = ?');
      params.push(is_active ? 1 : 0);
    }

    if (category) {
      conditions.push('category = ?');
      params.push(category);
    }

    if (pref) {
      conditions.push('address_pref = ?');
      params.push(pref);
    }

    if (query && query.trim()) {
      conditions.push(`(
        name LIKE ? OR 
        phone LIKE ? OR 
        email LIKE ?
      )`);
      const searchTerm = `%${query.trim()}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const orderBy = query && query.trim() ? 'ORDER BY name' : 'ORDER BY created_at DESC';

    // Get total count
    const countStmt = this.db.prepare(`
      SELECT COUNT(*) as count FROM vendors ${whereClause}
    `);
    const totalCount = (countStmt.get(...params) as any).count;

    // Get paginated data
    const dataStmt = this.db.prepare(`
      SELECT * FROM vendors 
      ${whereClause}
      ${orderBy}
      LIMIT ? OFFSET ?
    `);
    const vendors = dataStmt.all(...params, validatedPageSize, offset) as Vendor[];

    const totalPages = Math.ceil(totalCount / validatedPageSize);

    return {
      data: vendors,
      meta: {
        page: validatedPage,
        page_size: validatedPageSize,
        total_count: totalCount,
        total_pages: totalPages,
      },
    };
  }

  async findById(id: number): Promise<Vendor | null> {
    const stmt = this.db.prepare('SELECT * FROM vendors WHERE id = ?');
    const result = stmt.get(id) as Vendor | undefined;
    return result || null;
  }

  async search(query: string, filters: VendorFilters): Promise<PaginatedResponse<Vendor>> {
    return this.findAll({ ...filters, query });
  }

  async create(vendor: Omit<Vendor, 'id' | 'created_at'>): Promise<Vendor> {
    const stmt = this.db.prepare(`
      INSERT INTO vendors (name, category, address_pref, phone, email, payment_terms, is_active, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const now = nowUtc();
    const result = stmt.run(
      vendor.name,
      vendor.category || null,
      vendor.address_pref || null,
      vendor.phone || null,
      vendor.email || null,
      vendor.payment_terms || null,
      vendor.is_active ? 1 : 0,
      now
    );

    const newVendor = await this.findById(result.lastInsertRowid as number);
    if (!newVendor) {
      throw new Error('Failed to create vendor');
    }

    return newVendor;
  }

  async update(id: number, updates: Partial<Vendor>): Promise<Vendor> {
    const setParts: string[] = [];
    const values: any[] = [];

    if (updates.name !== undefined) {
      setParts.push('name = ?');
      values.push(updates.name);
    }
    if (updates.category !== undefined) {
      setParts.push('category = ?');
      values.push(updates.category);
    }
    if (updates.address_pref !== undefined) {
      setParts.push('address_pref = ?');
      values.push(updates.address_pref);
    }
    if (updates.phone !== undefined) {
      setParts.push('phone = ?');
      values.push(updates.phone);
    }
    if (updates.email !== undefined) {
      setParts.push('email = ?');
      values.push(updates.email);
    }
    if (updates.payment_terms !== undefined) {
      setParts.push('payment_terms = ?');
      values.push(updates.payment_terms);
    }
    if (updates.is_active !== undefined) {
      setParts.push('is_active = ?');
      values.push(updates.is_active ? 1 : 0);
    }

    if (setParts.length === 0) {
      throw new Error('No fields to update');
    }

    const stmt = this.db.prepare(`
      UPDATE vendors 
      SET ${setParts.join(', ')} 
      WHERE id = ?
    `);

    values.push(id);
    const result = stmt.run(...values);

    if (result.changes === 0) {
      throw new Error('Vendor not found');
    }

    const updatedVendor = await this.findById(id);
    if (!updatedVendor) {
      throw new Error('Failed to update vendor');
    }

    return updatedVendor;
  }

  async delete(id: number): Promise<boolean> {
    // Soft delete - set is_active to false
    const stmt = this.db.prepare('UPDATE vendors SET is_active = 0 WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  async importFromCsv(rows: VendorImportRow[]): Promise<ImportResult> {
    const result: ImportResult = {
      inserted: 0,
      updated: 0,
      failed: [],
    };

    const insertStmt = this.db.prepare(`
      INSERT INTO vendors (name, category, address_pref, phone, email, payment_terms, is_active, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 1, ?)
    `);

    const updateStmt = this.db.prepare(`
      UPDATE vendors 
      SET category = ?, address_pref = ?, phone = ?, email = ?, payment_terms = ?
      WHERE name = ? AND is_active = 1
    `);

    const findByNameStmt = this.db.prepare(`
      SELECT id FROM vendors WHERE name = ? AND is_active = 1
    `);

    const now = nowUtc();

    // Use transaction for atomicity
    const transaction = this.db.transaction(() => {
      rows.forEach((row, index) => {
        try {
          // Basic validation
          if (!row.name || row.name.trim().length === 0) {
            result.failed.push({
              row: index + 1,
              reason: 'Name is required',
              data: row,
            });
            return;
          }

          // Check if vendor exists
          const existing = findByNameStmt.get(row.name.trim());

          if (existing) {
            // Update existing vendor
            updateStmt.run(
              row.category || null,
              row.address_pref || null,
              row.phone || null,
              row.email || null,
              row.payment_terms || null,
              row.name.trim()
            );
            result.updated++;
          } else {
            // Insert new vendor
            insertStmt.run(
              row.name.trim(),
              row.category || null,
              row.address_pref || null,
              row.phone || null,
              row.email || null,
              row.payment_terms || null,
              now
            );
            result.inserted++;
          }
        } catch (error) {
          result.failed.push({
            row: index + 1,
            reason: error instanceof Error ? error.message : 'Unknown error',
            data: row,
          });
        }
      });
    });

    transaction();
    return result;
  }
}