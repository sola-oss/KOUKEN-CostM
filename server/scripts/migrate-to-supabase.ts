/**
 * SQLite → Supabase データ移行スクリプト
 * 
 * 使用方法:
 *   npx tsx server/scripts/migrate-to-supabase.ts
 * 
 * 注意:
 * 1. supabase-setup.sql をSupabaseダッシュボードで先に実行してください
 * 2. SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY が環境変数に設定されていること
 * 3. このスクリプトは冪等(何度実行してもよい)ではありません。
 *    重複実行するとデータが重複します。
 */

import Database from 'better-sqlite3';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SQLITE_PATH = process.env.DB_PATH || './server/db/production.sqlite';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY を設定してください');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const sqlite = new Database(SQLITE_PATH, { readonly: true });

// ============================================================
// ユーティリティ
// ============================================================

function boolToPostgres(val: any): boolean | null {
  if (val === null || val === undefined) return null;
  return val === 1 || val === true || val === '1' || val === 'true';
}

async function upsertBatch(tableName: string, rows: any[], conflictCol: string, batchSize = 100): Promise<void> {
  if (rows.length === 0) {
    console.log(`  ${tableName}: スキップ (0件)`);
    return;
  }

  let inserted = 0;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const { error } = await supabase.from(tableName).upsert(batch, { onConflict: conflictCol });
    if (error) {
      console.error(`  ✗ ${tableName} バッチ ${i}-${i + batchSize} エラー:`, error.message);
      // Try one by one
      for (const row of batch) {
        const { error: rowError } = await supabase.from(tableName).upsert(row, { onConflict: conflictCol });
        if (rowError) console.error(`    行エラー ${JSON.stringify(row).substring(0, 100)}:`, rowError.message);
        else inserted++;
      }
    } else {
      inserted += batch.length;
    }
  }
  console.log(`  ✓ ${tableName}: ${inserted}/${rows.length}件 移行完了`);
}

// ============================================================
// 各テーブル移行関数
// ============================================================

async function migrateOrders(): Promise<void> {
  console.log('\n📋 受注 (orders) 移行中...');
  const rows = sqlite.prepare('SELECT * FROM orders').all() as any[];
  
  const converted = rows.map(r => ({
    order_id: r.order_id,
    order_date: r.order_date || null,
    client_name: r.client_name || null,
    manager: r.manager || null,
    client_order_no: r.client_order_no || null,
    project_title: r.project_title || null,
    is_delivered: boolToPostgres(r.is_delivered) ?? false,
    has_shipping_fee: boolToPostgres(r.has_shipping_fee) ?? false,
    is_amount_confirmed: boolToPostgres(r.is_amount_confirmed) ?? false,
    is_invoiced: boolToPostgres(r.is_invoiced) ?? false,
    due_date: r.due_date || null,
    delivery_date: r.delivery_date || null,
    confirmed_date: r.confirmed_date || null,
    estimated_amount: r.estimated_amount ?? null,
    invoiced_amount: r.invoiced_amount ?? null,
    invoice_month: r.invoice_month || null,
    subcontractor: r.subcontractor || null,
    processing_hours: r.processing_hours ?? null,
    note: r.note || null,
    product_name: r.product_name || null,
    qty: r.qty ?? null,
    start_date: r.start_date || null,
    sales: r.sales ?? null,
    estimated_material_cost: r.estimated_material_cost ?? null,
    std_time_per_unit: r.std_time_per_unit ?? null,
    status: r.status || 'pending',
    customer_name: r.customer_name || null,
    customer_code: r.customer_code || null,
    customer_zip: r.customer_zip || null,
    customer_address1: r.customer_address1 || null,
    customer_address2: r.customer_address2 || null,
    created_at: r.created_at || new Date().toISOString(),
    updated_at: r.updated_at || new Date().toISOString()
  }));

  await upsertBatch('orders', converted, 'order_id');
}

async function migrateProcurements(): Promise<void> {
  console.log('\n🔧 調達 (procurements) 移行中...');
  
  // 先に既存データを削除（idがSERIALなので重複するため）
  const { error: delError } = await supabase.from('procurements').delete().neq('id', 0);
  if (delError) console.warn('  削除警告:', delError.message);

  const rows = sqlite.prepare('SELECT * FROM procurements').all() as any[];
  const converted = rows.map(r => ({
    id: r.id,
    order_id: r.order_id || null,
    kind: r.kind || null,
    item_name: r.item_name || null,
    qty: r.qty ?? null,
    unit: r.unit || null,
    eta: r.eta || null,
    status: r.status || null,
    vendor: r.vendor || null,
    unit_price: r.unit_price ?? null,
    received_at: r.received_at || null,
    std_time_per_unit: r.std_time_per_unit ?? null,
    act_time_per_unit: r.act_time_per_unit ?? null,
    worker: r.worker || null,
    completed_at: r.completed_at || null,
    vendor_id: r.vendor_id ?? null,
    total_amount: r.total_amount ?? null,
    is_approved: boolToPostgres(r.is_approved) ?? false,
    created_at: r.created_at || new Date().toISOString()
  }));

  await upsertBatch('procurements', converted, 'id');
}

async function migrateWorkersLog(): Promise<void> {
  console.log('\n👷 作業者ログ (workers_log) 移行中...');
  
  const { error: delError } = await supabase.from('workers_log').delete().neq('id', 0);
  if (delError) console.warn('  削除警告:', delError.message);

  const rows = sqlite.prepare('SELECT * FROM workers_log').all() as any[];
  const converted = rows.map(r => ({
    id: r.id,
    order_id: r.order_id || null,
    qty: r.qty ?? null,
    act_time_per_unit: r.act_time_per_unit ?? null,
    worker: r.worker || null,
    date: r.date || null,
    created_at: r.created_at || new Date().toISOString()
  }));

  await upsertBatch('workers_log', converted, 'id');
}

async function migrateTasks(): Promise<void> {
  console.log('\n📌 タスク (tasks) 移行中...');
  
  const { error: delError } = await supabase.from('tasks').delete().neq('id', 0);
  if (delError) console.warn('  削除警告:', delError.message);

  const rows = sqlite.prepare('SELECT * FROM tasks').all() as any[];
  const converted = rows.map(r => ({
    id: r.id,
    order_id: r.order_id || null,
    task_name: r.task_name || null,
    assignee: r.assignee || null,
    planned_start: r.planned_start || null,
    planned_end: r.planned_end || null,
    std_time_per_unit: r.std_time_per_unit ?? null,
    qty: r.qty ?? null,
    status: r.status || 'not_started',
    created_at: r.created_at || new Date().toISOString()
  }));

  await upsertBatch('tasks', converted, 'id');
}

async function migrateWorkLogs(): Promise<void> {
  console.log('\n⏱️  作業実績 (work_logs) 移行中...');
  
  const { error: delError } = await supabase.from('work_logs').delete().neq('id', 0);
  if (delError) console.warn('  削除警告:', delError.message);

  const rows = sqlite.prepare('SELECT * FROM work_logs').all() as any[];
  const converted = rows.map(r => ({
    id: r.id,
    work_date: r.work_date || null,
    employee_name: r.employee_name || null,
    client_name: r.client_name || null,
    project_name: r.project_name || null,
    task_large: r.task_large || null,
    task_medium: r.task_medium || null,
    task_small: r.task_small || null,
    work_name: r.work_name || null,
    planned_time: r.planned_time || null,
    actual_time: r.actual_time || null,
    total_work_time: r.total_work_time || null,
    note: r.note || null,
    date: r.date || null,
    worker: r.worker || null,
    task_name: r.task_name || null,
    task_id: r.task_id ?? null,
    start_time: r.start_time || null,
    end_time: r.end_time || null,
    duration_hours: r.duration_hours ?? null,
    quantity: r.quantity ?? null,
    memo: r.memo || null,
    status: r.status || null,
    order_id: r.order_id || null,
    order_no: r.order_no || null,
    match_status: r.match_status || 'unlinked',
    source: r.source || 'manual',
    imported_at: r.imported_at || null
  }));

  await upsertBatch('work_logs', converted, 'id');
}

async function migrateMaterials(): Promise<void> {
  console.log('\n🧱 材料マスタ (materials) 移行中...');

  const { error: delError } = await supabase.from('materials').delete().neq('id', 0);
  if (delError) console.warn('  削除警告:', delError.message);

  const rows = sqlite.prepare('SELECT * FROM materials').all() as any[];
  const converted = rows.map(r => ({
    id: r.id,
    material_type: r.material_type,
    name: r.name,
    size: r.size,
    unit: r.unit,
    unit_weight: r.unit_weight ?? null,
    unit_price: r.unit_price ?? null,
    remark: r.remark || null,
    created_at: r.created_at || new Date().toISOString()
  }));

  await upsertBatch('materials', converted, 'id');
}

async function migrateMaterialUsages(): Promise<void> {
  console.log('\n📐 材料使用実績 (material_usages) 移行中...');

  const { error: delError } = await supabase.from('material_usages').delete().neq('id', 0);
  if (delError) console.warn('  削除警告:', delError.message);

  const rows = sqlite.prepare('SELECT * FROM material_usages').all() as any[];
  const converted = rows.map(r => ({
    id: r.id,
    project_id: r.project_id || null,
    area: r.area || null,
    zone: r.zone || null,
    drawing_no: r.drawing_no || null,
    material_id: r.material_id ?? null,
    quantity: r.quantity ?? 1,
    length: r.length ?? null,
    remark: r.remark || null,
    created_at: r.created_at || new Date().toISOString()
  }));

  await upsertBatch('material_usages', converted, 'id');
}

async function migrateWorkersMaster(): Promise<void> {
  console.log('\n👤 作業者マスタ (workers_master) 移行中...');

  const { error: delError } = await supabase.from('workers_master').delete().neq('id', 0);
  if (delError) console.warn('  削除警告:', delError.message);

  const rows = sqlite.prepare('SELECT * FROM workers_master').all() as any[];
  const converted = rows.map(r => ({
    id: r.id,
    name: r.name,
    hourly_rate: r.hourly_rate,
    is_active: boolToPostgres(r.is_active) ?? true,
    created_at: r.created_at || new Date().toISOString(),
    updated_at: r.updated_at || new Date().toISOString()
  }));

  await upsertBatch('workers_master', converted, 'id');
}

async function migrateVendorsMaster(): Promise<void> {
  console.log('\n🏭 業者マスタ (vendors_master) 移行中...');

  const { error: delError } = await supabase.from('vendors_master').delete().neq('id', 0);
  if (delError) console.warn('  削除警告:', delError.message);

  const rows = sqlite.prepare('SELECT * FROM vendors_master').all() as any[];
  const converted = rows.map(r => ({
    id: r.id,
    name: r.name,
    contact_person: r.contact_person || null,
    phone: r.phone || null,
    email: r.email || null,
    address: r.address || null,
    note: r.note || null,
    is_active: boolToPostgres(r.is_active) ?? true,
    created_at: r.created_at || new Date().toISOString(),
    updated_at: r.updated_at || new Date().toISOString()
  }));

  await upsertBatch('vendors_master', converted, 'id');
}

async function migrateCostSettings(): Promise<void> {
  console.log('\n💰 原価設定 (cost_settings) 移行中...');
  const row = sqlite.prepare('SELECT * FROM cost_settings WHERE id = 1').get() as any;
  if (row) {
    const { error } = await supabase.from('cost_settings').upsert({
      id: 1,
      labor_rate_per_hour: row.labor_rate_per_hour,
      updated_at: row.updated_at || new Date().toISOString()
    }, { onConflict: 'id' });
    if (error) console.error('  ✗ cost_settings エラー:', error.message);
    else console.log('  ✓ cost_settings: 1件 移行完了');
  }
}

async function migrateOutsourcingCosts(): Promise<void> {
  console.log('\n💼 外注費 (outsourcing_costs) 移行中...');

  const { error: delError } = await supabase.from('outsourcing_costs').delete().neq('id', 0);
  if (delError) console.warn('  削除警告:', delError.message);

  const rows = sqlite.prepare('SELECT * FROM outsourcing_costs').all() as any[];
  const converted = rows.map(r => ({
    id: r.id,
    project_id: r.project_id || null,
    vendor_id: r.vendor_id ?? null,
    description: r.description || null,
    amount: r.amount ?? null,
    date: r.date || null,
    note: r.note || null,
    created_at: r.created_at || new Date().toISOString()
  }));

  await upsertBatch('outsourcing_costs', converted, 'id');
}

// ============================================================
// メイン実行
// ============================================================

async function main(): Promise<void> {
  console.log('=================================================');
  console.log('SQLite → Supabase データ移行スクリプト');
  console.log('=================================================');
  console.log(`SQLiteファイル: ${SQLITE_PATH}`);
  console.log(`Supabase URL: ${SUPABASE_URL?.substring(0, 40)}...`);

  try {
    // 移行順序は外部キー制約を考慮
    await migrateOrders();
    await migrateProcurements();
    await migrateWorkersLog();
    await migrateTasks();
    await migrateWorkLogs();
    await migrateMaterials();
    await migrateMaterialUsages();
    await migrateWorkersMaster();
    await migrateVendorsMaster();
    await migrateCostSettings();
    await migrateOutsourcingCosts();

    console.log('\n=================================================');
    console.log('✅ データ移行完了！');
    console.log('=================================================');
  } catch (err: any) {
    console.error('\n❌ 移行エラー:', err.message);
    process.exit(1);
  } finally {
    sqlite.close();
  }
}

main();
