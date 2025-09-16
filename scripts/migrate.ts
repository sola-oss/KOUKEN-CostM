#!/usr/bin/env tsx
// Database migration script for work hour management system

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { SqliteDatabase } from '../server/dao/sqlite/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigrations() {
  console.log('🚀 Starting database migration...');

  const db = new SqliteDatabase();
  
  try {
    // Read migration file
    const migrationPath = path.join(__dirname, '../server/database/migrations/001_initial_schema.sql');
    
    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found: ${migrationPath}`);
    }

    const migrationSql = fs.readFileSync(migrationPath, 'utf-8');
    console.log(`📄 Reading migration: ${migrationPath}`);

    // Run migration
    await db.runMigration(migrationSql);
    console.log('✅ Migration completed successfully');

    // Check database stats
    const stats = db.getStats();
    console.log('\n📊 Database Statistics:');
    console.log(`  Tables: ${stats.tables.join(', ')}`);
    console.log(`  Size: ${(stats.size / 1024).toFixed(2)} KB`);
    console.log(`  Pages: ${stats.pageCount} (${stats.pageSize} bytes each)`);

    // Verify foreign keys are enabled
    const isConnected = db.isConnected();
    console.log(`🔗 Database connection: ${isConnected ? 'OK' : 'Failed'}`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await db.close();
  }
}

// Run if called directly  
runMigrations().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});