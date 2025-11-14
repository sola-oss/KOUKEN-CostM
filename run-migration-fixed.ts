import Database from 'better-sqlite3';
import fs from 'fs';

const db = new Database('./data/production.db');

console.log('📋 Running migration: 001_production_schema.sql');

const migrationSQL = fs.readFileSync('./server/migrations/001_production_schema.sql', 'utf8');

try {
  // Execute entire migration file at once
  db.exec(migrationSQL);
  console.log('✅ Migration executed successfully!');
} catch (error: any) {
  console.error('❌ Migration error:', error.message);
}

// Verify tables
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='orders'").all();
if (tables.length > 0) {
  console.log('✅ Orders table created successfully!');
  
  // Count existing rows
  const count = db.prepare('SELECT COUNT(*) as count FROM orders').get() as any;
  console.log(`📊 Current orders count: ${count.count}`);
} else {
  console.log('❌ Orders table was not created');
}

db.close();
