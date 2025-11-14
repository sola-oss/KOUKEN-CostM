import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const db = new Database('./data/production.db');

console.log('📋 Running migration: 001_production_schema.sql');

const migrationSQL = fs.readFileSync('./server/migrations/001_production_schema.sql', 'utf8');

// Split by semicolon and execute each statement
const statements = migrationSQL
  .split(';')
  .map(s => s.trim())
  .filter(s => s.length > 0 && !s.startsWith('--'));

for (const statement of statements) {
  try {
    db.exec(statement);
  } catch (error: any) {
    if (error.message.includes('already exists')) {
      console.log(`⚠️ Table already exists, skipping...`);
    } else {
      console.error('❌ Error executing statement:', error.message);
      console.error('Statement:', statement.substring(0, 100) + '...');
    }
  }
}

console.log('✅ Migration complete!');

// Verify tables
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='orders'").all();
if (tables.length > 0) {
  console.log('✅ Orders table created successfully!');
} else {
  console.log('❌ Orders table was not created');
}

db.close();
