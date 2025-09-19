#!/usr/bin/env node
// Apply simplified sales order migration

import Database from 'better-sqlite3';
import fs from 'fs';

const dbPath = '/home/runner/workspace/scripts/data/production.db';
const migrationPath = 'server/database/migrations/002_sales_min.sql';

console.log('📦 Applying simplified sales order migration...');

try {
  const db = new Database(dbPath);
  const migration = fs.readFileSync(migrationPath, 'utf8');
  
  db.exec(migration);
  
  console.log('✅ Simplified migration applied successfully');
  
  // Verify tables
  const tables = db.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name LIKE '%sales%'
    ORDER BY name
  `).all();
  
  console.log('\n📊 Sales tables:');
  tables.forEach(t => console.log(`  - ${t.name}`));
  
  db.close();
} catch (error) {
  console.error('❌ Migration failed:', error);
  process.exit(1);
}