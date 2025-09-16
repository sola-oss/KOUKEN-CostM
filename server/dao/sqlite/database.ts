// SQLite Database implementation with DAO repositories
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { IDatabase } from '../interfaces';
import { SqliteEmployeeDAO } from './employeeDAO';
import { SqliteVendorDAO } from './vendorDAO';
import { SqliteProjectDAO } from './projectDAO';
import { SqliteWorkOrderDAO } from './workOrderDAO';
import { SqliteTimeEntryDAO } from './timeEntryDAO';
import { SqliteApprovalDAO } from './approvalDAO';
import { SqliteReportDAO } from './reportDAO';

export class SqliteDatabase implements IDatabase {
  private db: Database.Database;
  
  public employees: SqliteEmployeeDAO;
  public vendors: SqliteVendorDAO;
  public projects: SqliteProjectDAO;
  public workOrders: SqliteWorkOrderDAO;
  public timeEntries: SqliteTimeEntryDAO;
  public approvals: SqliteApprovalDAO;
  public reports: SqliteReportDAO;

  constructor(dbPath: string = process.env.DB_PATH || './data/worktime.db') {
    // Ensure data directory exists
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Initialize SQLite database with performance optimizations
    this.db = new Database(dbPath);
    
    // Enable foreign key constraints and performance optimizations
    this.db.pragma('foreign_keys = ON');
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('synchronous = NORMAL');
    this.db.pragma('temp_store = memory');
    this.db.pragma('mmap_size = 268435456'); // 256MB

    // Initialize DAO repositories
    this.employees = new SqliteEmployeeDAO(this.db);
    this.vendors = new SqliteVendorDAO(this.db);
    this.projects = new SqliteProjectDAO(this.db);
    this.workOrders = new SqliteWorkOrderDAO(this.db);
    this.timeEntries = new SqliteTimeEntryDAO(this.db);
    this.approvals = new SqliteApprovalDAO(this.db);
    this.reports = new SqliteReportDAO(this.db);

    console.log(`SQLite database initialized: ${dbPath}`);
  }

  async runMigration(sql: string): Promise<void> {
    try {
      this.db.exec(sql);
      console.log('Migration executed successfully');
    } catch (error) {
      console.error('Migration failed:', error);
      throw error;
    }
  }

  async close(): Promise<void> {
    this.db.close();
    console.log('Database connection closed');
  }

  // Get raw database instance for complex queries
  getRawDb(): Database.Database {
    return this.db;
  }

  // Database health check
  isConnected(): boolean {
    try {
      this.db.prepare('SELECT 1').get();
      return true;
    } catch {
      return false;
    }
  }

  // Get database statistics
  getStats(): {
    tables: string[];
    size: number;
    pageSize: number;
    pageCount: number;
  } {
    const tables = this.db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `).all().map((row: any) => row.name);

    const pragmaInfo = this.db.pragma('page_size');
    const pragmaCount = this.db.pragma('page_count');
    const pageSize = Array.isArray(pragmaInfo) ? pragmaInfo[0] : pragmaInfo;
    const pageCount = Array.isArray(pragmaCount) ? pragmaCount[0] : pragmaCount;

    return {
      tables,
      size: pageSize * pageCount,
      pageSize,
      pageCount,
    };
  }
}

// Create singleton database instance
let dbInstance: SqliteDatabase | null = null;

export function getDatabase(): SqliteDatabase {
  if (!dbInstance) {
    dbInstance = new SqliteDatabase();
  }
  return dbInstance;
}

export async function closeDatabase(): Promise<void> {
  if (dbInstance) {
    await dbInstance.close();
    dbInstance = null;
  }
}