import Database from 'better-sqlite3';

const db = new Database('./server/db/production.sqlite');

const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='orders'").all();
if (tables.length > 0) {
  const count = db.prepare('SELECT COUNT(*) as count FROM orders').get() as any;
  console.log('✅ Orders table exists!');
  console.log(`📊 Current orders count: ${count.count}`);
  
  if (count.count > 0) {
    console.log('\n📋 Sample order_ids:');
    const samples = db.prepare('SELECT order_id FROM orders LIMIT 5').all() as any[];
    samples.forEach((s: any) => console.log('  -', s.order_id));
  }
} else {
  console.log('❌ Orders table does NOT exist in backend database');
}

db.close();
