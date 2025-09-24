import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

export class SQLiteInitializer {
  private db: Database.Database | null = null;

  async initialize(): Promise<Database.Database> {
    const dbPath = process.env.DB_PATH || './server/db/app.sqlite';
    
    // Ensure directory exists
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    
    // Connect to database
    this.db = new Database(dbPath);
    console.log(`SQLite database initialized at: ${dbPath}`);
    
    // Run migrations
    await this.runMigrations();
    
    return this.db;
  }
  
  private async runMigrations(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    const migrationsDir = path.join(__dirname, '..', 'migrations');
    
    if (!fs.existsSync(migrationsDir)) {
      console.log('No migrations directory found, skipping migrations');
      return;
    }
    
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();
    
    console.log(`Found ${migrationFiles.length} migration files`);
    
    for (const file of migrationFiles) {
      console.log(`Running migration: ${file}`);
      const migrationPath = path.join(migrationsDir, file);
      const migration = fs.readFileSync(migrationPath, 'utf8');
      
      try {
        this.db.exec(migration);
        console.log(`✓ Migration ${file} completed successfully`);
      } catch (error) {
        console.error(`✗ Migration ${file} failed:`, error);
        throw error;
      }
    }
  }
  
  getDatabase(): Database.Database {
    if (!this.db) throw new Error('Database not initialized. Call initialize() first.');
    return this.db;
  }
}

export const sqliteInitializer = new SQLiteInitializer();