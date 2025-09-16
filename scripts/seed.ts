#!/usr/bin/env tsx
// Seed Script for Production Management System
import Database from 'better-sqlite3';
import path from 'path';

const dbPath = process.env.DB_PATH || path.join(process.cwd(), 'data', 'production.db');
console.log(`🌱 Seeding database: ${dbPath}`);

const db = new Database(dbPath);
db.pragma('foreign_keys = ON');

try {
  db.exec('BEGIN TRANSACTION');

  // ========== Insert Employees ==========
  console.log('👥 Creating employees...');
  const employees = [
    { name: '田中 太郎', email: 'tanaka@example.com', role: 'admin', department: '管理部', hourly_cost_rate: 5000 },
    { name: '鈴木 花子', email: 'suzuki@example.com', role: 'manager', department: '生産管理部', hourly_cost_rate: 4000 },
    { name: '佐藤 一郎', email: 'sato@example.com', role: 'manager', department: '品質管理部', hourly_cost_rate: 3800 },
    { name: '山田 次郎', email: 'yamada@example.com', role: 'worker', department: '製造一課', hourly_cost_rate: 2800 },
    { name: '中村 三郎', email: 'nakamura@example.com', role: 'worker', department: '製造一課', hourly_cost_rate: 2600 },
    { name: '小林 四郎', email: 'kobayashi@example.com', role: 'worker', department: '製造二課', hourly_cost_rate: 2700 },
    { name: '加藤 五郎', email: 'kato@example.com', role: 'worker', department: '製造二課', hourly_cost_rate: 2500 },
    { name: '吉田 六郎', email: 'yoshida@example.com', role: 'worker', department: '検査課', hourly_cost_rate: 2900 },
    { name: '山本 七子', email: 'yamamoto@example.com', role: 'worker', department: '物流課', hourly_cost_rate: 2400 },
    { name: '木村 八郎', email: 'kimura@example.com', role: 'viewer', department: '経理部', hourly_cost_rate: 3200 },
  ];
  
  const insertEmployee = db.prepare(`
    INSERT INTO employees (name, email, role, department, hourly_cost_rate) 
    VALUES (?, ?, ?, ?, ?)
  `);
  
  employees.forEach(emp => {
    insertEmployee.run(emp.name, emp.email, emp.role, emp.department, emp.hourly_cost_rate);
  });

  // ========== Insert Work Centers ==========
  console.log('🏭 Creating work centers...');
  const workCenters = [
    { code: 'WC001', name: '機械加工センター1', capacity: 8, cost: 5000 },
    { code: 'WC002', name: '機械加工センター2', capacity: 8, cost: 4800 },
    { code: 'WC003', name: '組立センター1', capacity: 10, cost: 3500 },
    { code: 'WC004', name: '検査センター', capacity: 6, cost: 3000 },
    { code: 'WC005', name: '梱包センター', capacity: 12, cost: 2500 },
  ];
  
  const insertWorkCenter = db.prepare(`
    INSERT INTO work_centers (code, name, capacity_per_day, cost_per_hour) 
    VALUES (?, ?, ?, ?)
  `);
  
  workCenters.forEach(wc => {
    insertWorkCenter.run(wc.code, wc.name, wc.capacity, wc.cost);
  });

  // ========== Insert Customers ==========
  console.log('🏢 Creating customers...');
  const insertCustomer = db.prepare(`
    INSERT INTO customers (code, name, address, phone, email, contact_person, payment_terms, credit_limit, tags) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  for (let i = 1; i <= 50; i++) {
    const types = ['製造業', '卸売業', '小売業', '商社'];
    const terms = ['net30', 'net60', 'cod'];
    insertCustomer.run(
      `C${String(i).padStart(4, '0')}`,
      `${types[i % 4]} 顧客${i}株式会社`,
      `東京都千代田区${i}-${i}-${i}`,
      `03-${String(1000 + i).padStart(4, '0')}-${String(1000 + i).padStart(4, '0')}`,
      `customer${i}@example.com`,
      `担当者${i}`,
      terms[i % 3],
      1000000 + (i * 50000),
      JSON.stringify([types[i % 4], i <= 10 ? 'VIP' : 'normal'])
    );
  }

  // ========== Insert Vendors ==========
  console.log('🚚 Creating vendors...');
  const insertVendor = db.prepare(`
    INSERT INTO vendors (code, name, category, address, phone, email, contact_person, payment_terms, tags) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  const vendorCategories = ['原材料', '部品', '消耗品', '設備', '外注加工', 'サービス'];
  for (let i = 1; i <= 300; i++) {
    const category = vendorCategories[i % vendorCategories.length];
    insertVendor.run(
      `V${String(i).padStart(4, '0')}`,
      `${category}業者${i}`,
      category,
      `東京都${['中央', '港', '新宿', '文京', '品川'][i % 5]}区${i}-${(i % 10) + 1}-${(i % 5) + 1}`,
      `03-${String(2000 + (i % 1000)).padStart(4, '0')}-${String(3000 + (i % 1000)).padStart(4, '0')}`,
      `vendor${i}@example.com`,
      `営業担当${i}`,
      i % 2 === 0 ? 'net30' : 'net45',
      JSON.stringify([category, i <= 50 ? 'preferred' : 'standard'])
    );
  }

  // ========== Insert Items ==========
  console.log('📦 Creating items...');
  const insertItem = db.prepare(`
    INSERT INTO items (code, name, description, category, uom, unit_cost, unit_price, stock_min, stock_max, lead_time_days, tags) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  const categories = ['原材料', '部品', '半製品', '製品'];
  const uoms = ['個', 'kg', 'm', 'L', 'セット'];
  
  for (let i = 1; i <= 200; i++) {
    const category = categories[i % categories.length];
    insertItem.run(
      `ITEM${String(i).padStart(5, '0')}`,
      `${category}${i}`,
      `${category}の説明 - 仕様${i}`,
      category,
      uoms[i % uoms.length],
      100 + (i * 10),
      150 + (i * 15),
      10 + (i % 20),
      100 + (i % 50),
      (i % 30) + 1,
      JSON.stringify([category, i <= 20 ? 'high-volume' : 'standard'])
    );
  }

  // ========== Insert Sales Orders ==========
  console.log('📋 Creating sales orders...');
  const insertSalesOrder = db.prepare(`
    INSERT INTO sales_orders (order_no, customer_id, order_date, delivery_date, status, total_amount, notes, confirmed_at, confirmed_by) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  const insertSalesOrderLine = db.prepare(`
    INSERT INTO sales_order_lines (sales_order_id, line_no, item_id, quantity, unit_price, amount, delivery_date) 
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  
  const today = new Date();
  for (let i = 1; i <= 80; i++) {
    const orderDate = new Date(today.getTime() - (90 - i) * 24 * 60 * 60 * 1000);
    const deliveryDate = new Date(orderDate.getTime() + 30 * 24 * 60 * 60 * 1000);
    const status = i <= 20 ? 'confirmed' : i <= 40 ? 'shipped' : i <= 60 ? 'closed' : 'draft';
    const totalAmount = 50000 + (i * 1000);
    
    const result = insertSalesOrder.run(
      `SO${String(2024000 + i).padStart(8, '0')}`,
      (i % 50) + 1, // customer_id
      orderDate.toISOString().split('T')[0],
      deliveryDate.toISOString().split('T')[0],
      status,
      totalAmount,
      `受注メモ ${i}`,
      status !== 'draft' ? orderDate.toISOString() : null,
      status !== 'draft' ? 2 : null // manager id
    );
    
    // Add order lines
    const lineCount = 2 + (i % 3);
    for (let line = 1; line <= lineCount; line++) {
      const itemId = ((i * line) % 200) + 1;
      const qty = 10 + (line * 5);
      const unitPrice = 1000 + (line * 100);
      insertSalesOrderLine.run(
        result.lastInsertRowid,
        line,
        itemId,
        qty,
        unitPrice,
        qty * unitPrice,
        deliveryDate.toISOString().split('T')[0]
      );
    }
  }

  // ========== Insert Production Orders ==========
  console.log('🏭 Creating production orders...');
  const insertProductionOrder = db.prepare(`
    INSERT INTO production_orders (production_no, sales_order_id, item_id, quantity, start_date, end_date, status, priority, notes) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  for (let i = 1; i <= 120; i++) {
    const salesOrderId = i <= 60 ? i : null;
    const startDate = new Date(today.getTime() - (60 - (i % 60)) * 24 * 60 * 60 * 1000);
    const endDate = new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000);
    const status = i <= 30 ? 'completed' : i <= 60 ? 'in_progress' : i <= 90 ? 'released' : 'planned';
    
    insertProductionOrder.run(
      `PO${String(2024000 + i).padStart(8, '0')}`,
      salesOrderId,
      ((i * 2) % 200) + 1, // item_id
      50 + (i * 2),
      startDate.toISOString().split('T')[0],
      endDate.toISOString().split('T')[0],
      status,
      i % 3,
      `製造指示 ${i}`
    );
  }

  // ========== Insert Work Orders ==========
  console.log('⚙️ Creating work orders...');
  const insertWorkOrder = db.prepare(`
    INSERT INTO work_orders (work_order_no, production_order_id, work_center_id, operation, sequence, planned_hours, actual_hours, start_date, end_date, status) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  const operations = ['切削', '研磨', '組立', '検査', '梱包'];
  let woCounter = 1;
  
  for (let poId = 1; poId <= 120; poId++) {
    const opCount = 2 + (poId % 3);
    const startDate = new Date(today.getTime() - (60 - (poId % 60)) * 24 * 60 * 60 * 1000);
    
    for (let seq = 1; seq <= opCount; seq++) {
      const opStartDate = new Date(startDate.getTime() + (seq - 1) * 24 * 60 * 60 * 1000);
      const opEndDate = new Date(opStartDate.getTime() + 24 * 60 * 60 * 1000);
      const status = poId <= 30 ? 'completed' : poId <= 60 ? 'in_progress' : poId <= 90 ? 'released' : 'pending';
      
      insertWorkOrder.run(
        `WO${String(2024000 + woCounter).padStart(8, '0')}`,
        poId,
        ((seq - 1) % 5) + 1, // work_center_id
        operations[(seq - 1) % operations.length],
        seq,
        4 + (seq * 2),
        status === 'completed' ? 4 + (seq * 1.8) : 0,
        opStartDate.toISOString().split('T')[0],
        opEndDate.toISOString().split('T')[0],
        status
      );
      woCounter++;
    }
  }

  // ========== Insert Purchase Orders ==========
  console.log('🛒 Creating purchase orders...');
  const insertPurchaseOrder = db.prepare(`
    INSERT INTO purchase_orders (po_no, vendor_id, order_date, delivery_date, status, total_amount, notes) 
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  
  for (let i = 1; i <= 150; i++) {
    const orderDate = new Date(today.getTime() - (75 - (i % 75)) * 24 * 60 * 60 * 1000);
    const deliveryDate = new Date(orderDate.getTime() + 14 * 24 * 60 * 60 * 1000);
    const status = i <= 40 ? 'closed' : i <= 80 ? 'received' : i <= 120 ? 'confirmed' : 'draft';
    
    insertPurchaseOrder.run(
      `PUR${String(2024000 + i).padStart(8, '0')}`,
      ((i - 1) % 300) + 1, // vendor_id
      orderDate.toISOString().split('T')[0],
      deliveryDate.toISOString().split('T')[0],
      status,
      20000 + (i * 500),
      `発注メモ ${i}`
    );
  }

  // ========== Insert Time Entries ==========
  console.log('⏰ Creating time entries...');
  const insertTimeEntry = db.prepare(`
    INSERT INTO time_entries (employee_id, work_order_id, entry_date, hours, description, status, approved_at, approved_by) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  for (let i = 1; i <= 2000; i++) {
    const employeeId = ((i - 1) % 7) + 4; // workers only (id 4-10)
    const workOrderId = ((i - 1) % 360) + 1;
    const daysAgo = Math.floor((i - 1) / 20);
    const entryDate = new Date(today.getTime() - daysAgo * 24 * 60 * 60 * 1000);
    const hours = 2 + Math.floor(Math.random() * 6);
    const status = i <= 500 ? 'approved' : i <= 1000 ? 'submitted' : i <= 1500 ? 'draft' : 'submitted';
    
    insertTimeEntry.run(
      employeeId,
      workOrderId,
      entryDate.toISOString().split('T')[0],
      hours,
      `作業内容 ${i}`,
      status,
      status === 'approved' ? entryDate.toISOString() : null,
      status === 'approved' ? 2 : null // manager id
    );
  }

  // ========== Insert Initial Calendar Days ==========
  console.log('📅 Creating calendar entries...');
  const insertCalendar = db.prepare(`
    INSERT INTO calendars (date, is_working_day, capacity_adjustment, notes) 
    VALUES (?, ?, ?, ?)
  `);
  
  for (let i = -30; i <= 365; i++) {
    const date = new Date(today.getTime() + i * 24 * 60 * 60 * 1000);
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isHoliday = i === 1 || i === 100 || i === 200; // Some sample holidays
    
    insertCalendar.run(
      date.toISOString().split('T')[0],
      !isWeekend && !isHoliday ? 1 : 0,
      1.0,
      isHoliday ? '祝日' : null
    );
  }

  db.exec('COMMIT');
  
  console.log('\n✅ Seed data created successfully!');
  console.log('📊 Summary:');
  console.log('  - Employees: 10');
  console.log('  - Work Centers: 5');
  console.log('  - Customers: 50');
  console.log('  - Vendors: 300');
  console.log('  - Items: 200');
  console.log('  - Sales Orders: 80');
  console.log('  - Production Orders: 120');
  console.log('  - Work Orders: 360');
  console.log('  - Purchase Orders: 150');
  console.log('  - Time Entries: 2000');
  console.log('  - Calendar Days: 396');
  
} catch (error) {
  db.exec('ROLLBACK');
  console.error('❌ Seed failed:', error);
  process.exit(1);
} finally {
  db.close();
}