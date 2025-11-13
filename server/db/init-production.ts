import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = process.env.DB_PATH || './server/db/production.sqlite';
const migrationsDir = path.join(__dirname, '../migrations');

console.log('Initializing production database...');
console.log('Database path:', dbPath);
console.log('Migrations directory:', migrationsDir);

// Ensure db directory exists
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath);
db.pragma('foreign_keys = ON');

try {
  // Get all migration files in order
  const migrationFiles = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();
  
  console.log('Found migrations:', migrationFiles);
  
  for (const file of migrationFiles) {
    console.log(`\nRunning migration: ${file}`);
    const migrationPath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    // Execute the entire migration file as-is
    // This allows in-file transaction control (BEGIN/COMMIT/PRAGMA)
    try {
      db.exec(sql);
      console.log(`✓ ${file} completed successfully`);
    } catch (error) {
      console.error(`✗ ${file} failed:`, error);
      throw error;
    }
  }
  
  console.log('\n✓ All migrations completed successfully!');
} catch (error) {
  console.error('\n✗ Migration failed:', error);
  process.exit(1);
} finally {
  db.close();
}
