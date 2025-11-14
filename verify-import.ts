import Database from 'better-sqlite3';

const db = new Database('./server/db/production.sqlite');

const count = db.prepare('SELECT COUNT(*) as count FROM orders').get() as any;
console.log(`📊 Total orders in database: ${count.count}`);

// Check for imported orders (starting with "ko")
const koOrders = db.prepare("SELECT COUNT(*) as count FROM orders WHERE order_id LIKE 'ko%'").get() as any;
console.log(`✅ Imported orders (ko*): ${koOrders.count}`);

// Show some sample imported orders
console.log('\n📋 Sample imported orders:');
const samples = db.prepare("SELECT order_id, client_name, manager, project_title FROM orders WHERE order_id LIKE 'ko%' LIMIT 5").all() as any[];
samples.forEach((s: any) => {
  console.log(`  - ${s.order_id}: ${s.client_name} / ${s.project_title} (担当: ${s.manager || '-'})`);
});

db.close();
