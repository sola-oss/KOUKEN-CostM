import Database from 'better-sqlite3';
import fs from 'fs';

const dbPath = process.env.DB_PATH || 'server/db/production.sqlite';
const db = new Database(dbPath);

console.log(`📦 Running migration 005 on: ${dbPath}`);

try {
  const migration = fs.readFileSync('server/migrations/005_add_archive_columns.sql', 'utf8');
  
  const statements = migration.split(';').filter(s => s.trim() && !s.trim().startsWith('--'));
  
  for (const statement of statements) {
    try {
      db.exec(statement);
      console.log('✓ Executed:', statement.trim().substring(0, 60) + '...');
    } catch (error: any) {
      if (error.message.includes('duplicate column name') || 
          error.message.includes('already exists')) {
        console.log('⏭ Skipped (already exists):', statement.trim().substring(0, 40) + '...');
      } else {
        throw error;
      }
    }
  }
  
  console.log('\n✅ Migration 005_add_archive_columns.sql completed successfully');
} catch (error: any) {
  console.error('❌ Migration failed:', error.message);
  process.exit(1);
}

db.close();
