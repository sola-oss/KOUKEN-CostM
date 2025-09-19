#!/usr/bin/env node
// Check database schema

import Database from 'better-sqlite3';

const dbPath = '/home/runner/workspace/scripts/data/production.db';

try {
  const db = new Database(dbPath);
  
  // Check all tables
  const tables = db.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' 
    ORDER BY name
  `).all();
  
  console.log('📊 All tables:');
  tables.forEach(t => console.log(`  - ${t.name}`));
  
  // Check sales_order_lines schema
  const schema = db.prepare(`PRAGMA table_info(sales_order_lines)`).all();
  console.log('\n🔍 sales_order_lines schema:');
  schema.forEach(col => console.log(`  - ${col.name} (${col.type})`));
  
  db.close();
} catch (error) {
  console.error('❌ Schema check failed:', error);
}