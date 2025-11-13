import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = process.env.DB_PATH || './server/db/production.sqlite';
const migrationPath = path.join(__dirname, '../migrations/004_add_order_metadata.sql');

console.log('Running migration 004_add_order_metadata.sql...');
console.log('Database path:', dbPath);

const db = new Database(dbPath);

try {
  const sql = fs.readFileSync(migrationPath, 'utf8');
  
  // Split by semicolon and execute each statement
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));
  
  db.exec('BEGIN TRANSACTION');
  
  for (const stmt of statements) {
    console.log('Executing:', stmt.substring(0, 80) + '...');
    db.exec(stmt);
  }
  
  db.exec('COMMIT');
  
  console.log('Migration completed successfully!');
} catch (error) {
  db.exec('ROLLBACK');
  console.error('Migration failed:', error);
  process.exit(1);
} finally {
  db.close();
}
