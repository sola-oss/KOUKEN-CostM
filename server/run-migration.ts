import Database from 'better-sqlite3';
import fs from 'fs';

const db = new Database('server/production.db');
const migration = fs.readFileSync('server/migrations/003_order_id_to_text.sql', 'utf8');

try {
  db.exec(migration);
  console.log('✅ Migration 003_order_id_to_text.sql executed successfully');
} catch (error: any) {
  console.error('❌ Migration failed:', error.message);
  process.exit(1);
}

db.close();
