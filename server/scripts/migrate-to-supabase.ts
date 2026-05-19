/**
 * Neon PostgreSQL + SQLite → Supabase データ移行スクリプト
 *
 * 使用方法:
 *   npx tsx server/scripts/migrate-to-supabase.ts
 *
 * フェーズ1: テーブルが存在しない場合、CREATE SQL を出力して終了
 * フェーズ2: テーブルが存在する場合、データ移行を実行
 *
 * ※ Neon の material_costs 実カラム:
 *    id, order_id, description, total_amount, created_at, vendor_id
 * ※ Neon の order_customer_map 実カラム:
 *    order_id, customer_id, updated_at
 * ※ SQLite の cost_settings 実カラム:
 *    id, labor_rate_per_hour, updated_at
 */

import Database from 'better-sqlite3';
import { createClient } from '@supabase/supabase-js';
import { neon } from '@neondatabase/serverless';

// ============================================================
// 接続設定
// ============================================================

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DATABASE_URL = process.env.DATABASE_URL;
const SQLITE_PATH = process.env.DB_PATH || './server/db/app.sqlite';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY を設定してください');
  process.exit(1);
}
if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL (Neon) を設定してください');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const neonSql = neon(DATABASE_URL);
const sqlite = new Database(SQLITE_PATH, { readonly: true });

// ============================================================
// CREATE TABLE SQL 定義
// （実際のカラム構造に合わせたスキーマ）
// ============================================================

const CREATE_SQLS: Record<string, string> = {
  material_costs: `
CREATE TABLE IF NOT EXISTS material_costs (
  id          SERIAL PRIMARY KEY,
  order_id    TEXT NOT NULL,
  description TEXT,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  vendor_id   INTEGER,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_material_costs_order_id ON material_costs(order_id);
  `.trim(),

  purchased_items: `
CREATE TABLE IF NOT EXISTS purchased_items (
  id          SERIAL PRIMARY KEY,
  order_id    TEXT NOT NULL,
  description TEXT,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  vendor_id   INTEGER,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_purchased_items_order_id ON purchased_items(order_id);
  `.trim(),

  order_customer_map: `
CREATE TABLE IF NOT EXISTS order_customer_map (
  order_id    TEXT PRIMARY KEY,
  customer_id INTEGER,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
  `.trim(),

  cost_settings: `
CREATE TABLE IF NOT EXISTS cost_settings (
  id                  SERIAL PRIMARY KEY,
  labor_rate_per_hour NUMERIC NOT NULL DEFAULT 3000,
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);
  `.trim(),
};

// ============================================================
// ユーティリティ
// ============================================================

async function tableExists(tableName: string): Promise<boolean> {
  const { error } = await supabase.from(tableName).select('*').limit(1);
  if (!error) return true;
  // 42P01 = table not found, PGRST116 = no rows (= table exists but empty)
  if (error.code === 'PGRST116') return true;
  if (error.message?.includes('does not exist') || error.code === '42P01') return false;
  // その他のエラーはテーブルが存在する可能性（権限エラーなど）
  console.warn(`  ⚠️  ${tableName} の確認中に警告: ${error.message} (code: ${error.code})`);
  return true;
}

async function checkRequiredTables(): Promise<boolean> {
  console.log('\n📋 Supabase テーブル存在確認...');
  const required = Object.keys(CREATE_SQLS);
  const missing: string[] = [];

  for (const table of required) {
    const exists = await tableExists(table);
    console.log(`  ${exists ? '✓' : '✗'} ${table}`);
    if (!exists) missing.push(table);
  }

  if (missing.length > 0) {
    console.log('\n' + '='.repeat(60));
    console.log('⚠️  以下のテーブルが Supabase に存在しません。');
    console.log('Supabase ダッシュボード → SQL Editor で以下を実行してください:');
    console.log('='.repeat(60));
    for (const table of missing) {
      console.log(`\n-- ===== ${table} =====`);
      console.log(CREATE_SQLS[table]);
    }
    console.log('\n' + '='.repeat(60));
    console.log('SQL 実行後、このスクリプトを再実行してください。');
    console.log('='.repeat(60));
    return false;
  }

  console.log('  ✅ 必要なテーブルがすべて存在します');
  return true;
}

// ============================================================
// データ移行: Neon → Supabase
// ============================================================

async function migrateMaterialCosts(): Promise<void> {
  console.log('\n💴 material_costs 移行中 (Neon → Supabase)...');

  const rows = await neonSql('SELECT id, order_id, description, total_amount, vendor_id, created_at FROM material_costs ORDER BY id') as any[];
  console.log(`  Neon から ${rows.length} 件取得`);

  if (rows.length === 0) {
    console.log('  スキップ (0件)');
    return;
  }

  // 既存データ確認
  const { data: existing } = await supabase.from('material_costs').select('id');
  if (existing && existing.length > 0) {
    console.log(`  Supabase に既存データ ${existing.length} 件あり → スキップします`);
    console.log('  (強制上書きする場合は Supabase SQL Editor で DELETE FROM material_costs; を実行してから再実行)');
    return;
  }

  const converted = rows.map((r: any) => ({
    order_id:     r.order_id,
    description:  r.description || null,
    total_amount: Number(r.total_amount) || 0,
    vendor_id:    r.vendor_id ?? null,
    created_at:   r.created_at || new Date().toISOString(),
  }));

  const BATCH = 100;
  let inserted = 0;
  for (let i = 0; i < converted.length; i += BATCH) {
    const batch = converted.slice(i, i + BATCH);
    const { error } = await supabase.from('material_costs').insert(batch);
    if (error) {
      console.error(`  ✗ バッチ ${i}~${i + batch.length} エラー:`, error.message);
    } else {
      inserted += batch.length;
    }
  }
  console.log(`  ✓ ${inserted}/${rows.length} 件 挿入完了`);
}

async function migrateOrderCustomerMap(): Promise<void> {
  console.log('\n🗺️  order_customer_map 移行中 (Neon → Supabase)...');

  const rows = await neonSql('SELECT order_id, customer_id, updated_at FROM order_customer_map ORDER BY order_id') as any[];
  console.log(`  Neon から ${rows.length} 件取得`);

  if (rows.length === 0) {
    console.log('  スキップ (0件)');
    return;
  }

  // 既存データ確認
  const { count } = await supabase.from('order_customer_map').select('*', { count: 'exact', head: true });
  if (count && count > 0) {
    console.log(`  Supabase に既存データ ${count} 件あり → スキップします`);
    return;
  }

  const converted = rows.map((r: any) => ({
    order_id:    r.order_id,
    customer_id: r.customer_id ?? null,
    updated_at:  r.updated_at || new Date().toISOString(),
  }));

  const BATCH = 200;
  let inserted = 0;
  for (let i = 0; i < converted.length; i += BATCH) {
    const batch = converted.slice(i, i + BATCH);
    const { error } = await supabase.from('order_customer_map').upsert(batch, { onConflict: 'order_id' });
    if (error) {
      console.error(`  ✗ バッチ ${i}~${i + batch.length} エラー:`, error.message);
    } else {
      inserted += batch.length;
    }
  }
  console.log(`  ✓ ${inserted}/${rows.length} 件 移行完了`);
}

// ============================================================
// データ移行: SQLite → Supabase
// ============================================================

async function migrateCostSettings(): Promise<void> {
  console.log('\n⚙️  cost_settings 移行中 (SQLite → Supabase)...');

  const row = sqlite.prepare('SELECT * FROM cost_settings WHERE id = 1').get() as any;
  if (!row) {
    console.log('  SQLite にデータなし → スキップ');
    return;
  }

  const { data: existing } = await supabase.from('cost_settings').select('id').limit(1);
  if (existing && existing.length > 0) {
    console.log(`  Supabase に既存データあり → スキップします`);
    return;
  }

  const { error } = await supabase.from('cost_settings').insert({
    labor_rate_per_hour: row.labor_rate_per_hour ?? 3000,
    updated_at:          row.updated_at || new Date().toISOString(),
  });

  if (error) {
    console.error('  ✗ cost_settings エラー:', error.message);
  } else {
    console.log('  ✓ 1件 挿入完了 (labor_rate_per_hour:', row.labor_rate_per_hour, ')');
  }
}

async function migratePurchasedItems(): Promise<void> {
  console.log('\n🛒 purchased_items 確認中 (Neon → Supabase)...');

  const rows = await neonSql('SELECT id, order_id, description, total_amount, vendor_id, created_at FROM purchased_items ORDER BY id') as any[];
  console.log(`  Neon から ${rows.length} 件取得`);

  if (rows.length === 0) {
    console.log('  スキップ (0件) — テーブルは Supabase に存在します');
    return;
  }

  const converted = rows.map((r: any) => ({
    order_id:     r.order_id,
    description:  r.description || null,
    total_amount: Number(r.total_amount) || 0,
    vendor_id:    r.vendor_id ?? null,
    created_at:   r.created_at || new Date().toISOString(),
  }));

  const { error } = await supabase.from('purchased_items').insert(converted);
  if (error) {
    console.error('  ✗ purchased_items エラー:', error.message);
  } else {
    console.log(`  ✓ ${converted.length} 件 挿入完了`);
  }
}

// ============================================================
// 移行後サマリー
// ============================================================

async function printSummary(): Promise<void> {
  console.log('\n📊 移行後の件数確認...');
  const tables = ['material_costs', 'purchased_items', 'order_customer_map', 'cost_settings'];
  for (const t of tables) {
    const { count, error } = await supabase.from(t).select('*', { count: 'exact', head: true });
    if (error) {
      console.log(`  ${t}: エラー (${error.message})`);
    } else {
      console.log(`  ${t}: ${count} 件`);
    }
  }
}

// ============================================================
// メイン実行
// ============================================================

async function main(): Promise<void> {
  console.log('='.repeat(60));
  console.log('Neon + SQLite → Supabase データ移行スクリプト');
  console.log('='.repeat(60));
  console.log(`Neon:     ${DATABASE_URL!.substring(0, 40)}...`);
  console.log(`Supabase: ${SUPABASE_URL!.substring(0, 40)}...`);
  console.log(`SQLite:   ${SQLITE_PATH}`);

  try {
    // フェーズ1: テーブル存在確認
    const tablesReady = await checkRequiredTables();
    if (!tablesReady) {
      process.exit(1);
    }

    // フェーズ2: データ移行
    console.log('\n🚀 データ移行開始...');
    await migrateMaterialCosts();
    await migratePurchasedItems();
    await migrateOrderCustomerMap();
    await migrateCostSettings();

    await printSummary();

    console.log('\n' + '='.repeat(60));
    console.log('✅ 移行完了！');
    console.log('='.repeat(60));
  } catch (err: any) {
    console.error('\n❌ 移行エラー:', err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    sqlite.close();
  }
}

main();
