import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class SQLiteInitializer {
  private db: Database.Database | null = null;

  async initialize(): Promise<Database.Database> {
    const dbPath = process.env.DB_PATH || './server/db/app.sqlite';
    
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    
    this.db = new Database(dbPath);
    console.log(`SQLite database initialized at: ${dbPath}`);
    
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
      
      const statements = migration
        .split(';')
        .map(s => s.split('\n').filter(line => !line.trimStart().startsWith('--')).join('\n').trim())
        .filter(s => s.length > 0);

      let hasError = false;
      for (const stmt of statements) {
        try {
          this.db.exec(stmt + ';');
        } catch (error: any) {
          const msg: string = error?.message ?? '';
          const isAlterDuplicate =
            stmt.toUpperCase().includes('ALTER TABLE') &&
            (msg.includes('duplicate column') || msg.includes('already exists'));
          if (isAlterDuplicate) {
            console.log(`  (skipped: column already exists)`);
          } else {
            console.error(`✗ Migration ${file} failed on statement:`, stmt);
            console.error(error);
            hasError = true;
            break;
          }
        }
      }
      if (hasError) {
        throw new Error(`Migration ${file} failed`);
      }
      console.log(`✓ Migration ${file} completed successfully`);
    }
  }
  
  getDatabase(): Database.Database {
    if (!this.db) throw new Error('Database not initialized. Call initialize() first.');
    return this.db;
  }
}

export const sqliteInitializer = new SQLiteInitializer();
