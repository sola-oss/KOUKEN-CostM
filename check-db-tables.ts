import Database from 'better-sqlite3';

const db = new Database('./data/production.db');

const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log('Tables in production.db:');
tables.forEach((t: any) => console.log('  -', t.name));

if (tables.some((t: any) => t.name === 'orders')) {
  const count = db.prepare('SELECT COUNT(*) as count FROM orders').get() as any;
  console.log('\nOrders table exists!');
  console.log('Current rows:', count.count);
} else {
  console.log('\n⚠️ Orders table does NOT exist!');
}

db.close();
