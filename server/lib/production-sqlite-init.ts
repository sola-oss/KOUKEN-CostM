// Production Management MVP - SQLite Database Initialization
import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class ProductionSqliteInitializer {
  private dbPath: string;

  constructor(dbPath?: string) {
    this.dbPath = dbPath || process.env.DB_PATH || './server/db/production.sqlite';
  }

  async initialize(): Promise<void> {
    try {
      console.log(`📦 Initializing Production Management SQLite database at: ${this.dbPath}`);
      
      // Create database directory if it doesn't exist
      const dbDir = dirname(this.dbPath);
      const { mkdirSync } = await import('fs');
      try {
        mkdirSync(dbDir, { recursive: true });
      } catch (error) {
        // Directory might already exist
      }

      const db = new Database(this.dbPath);
      
      // Enable foreign keys
      db.pragma('foreign_keys = ON');
      
      // Read and execute migrations
      const migrations = [
        '001_production_schema.sql',
        '003_materials.sql',
        '004_material_usages.sql',
        '005_cost_settings.sql',
        '006_workers_master.sql',
        '007_vendors_outsourcing.sql',
        '008_work_logs_task_id.sql',
        '009_procurements_outsourcing.sql'
      ];
      
      for (const migrationFile of migrations) {
        const migrationPath = join(__dirname, '../migrations', migrationFile);
        try {
          const migrationSQL = readFileSync(migrationPath, 'utf8');
          db.exec(migrationSQL);
          console.log(`✓ Migration ${migrationFile} applied`);
        } catch (error: any) {
          if (!error.message?.includes('already exists') && 
              !error.message?.includes('duplicate column name')) {
            console.log(`Note: ${migrationFile} - ${error.message}`);
          }
        }
      }
      
      // Verify tables exist
      const tables = db.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name IN ('orders', 'procurements', 'workers_log', 'tasks', 'work_logs')
      `).all();
      
      if (tables.length !== 5) {
        throw new Error(`Expected 5 tables, found ${tables.length}`);
      }
      
      console.log('✓ Production Management tables created successfully');
      
      db.close();
      console.log('✓ Production Management SQLite database initialized successfully');
      
    } catch (error) {
      console.error('✗ Failed to initialize Production Management SQLite database:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const productionSqliteInitializer = new ProductionSqliteInitializer();
