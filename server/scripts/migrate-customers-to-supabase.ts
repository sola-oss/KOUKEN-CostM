/**
 * Neon の customers_master 41件を Supabase に移行するスクリプト
 * 実行: npx tsx server/scripts/migrate-customers-to-supabase.ts
 */
import { neon } from '@neondatabase/serverless';
import { createClient } from '@supabase/supabase-js';

const sql = neon(process.env.DATABASE_URL!);
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  console.log('=== customers_master 移行開始 ===\n');

  // Neon からデータ取得
  const rows = await sql`SELECT * FROM customers_master ORDER BY id`;
  console.log(`Neon から ${rows.length} 件取得`);

  if (rows.length === 0) {
    console.log('移行するデータがありません。');
    return;
  }

  // Supabase の現在の件数確認
  const { count: existingCount } = await supabase
    .from('customers_master')
    .select('*', { count: 'exact', head: true });
  console.log(`Supabase 既存件数: ${existingCount ?? 0} 件`);

  // upsert（id を保持したまま挿入）
  let success = 0;
  let failed = 0;
  for (const row of rows) {
    const { error } = await supabase
      .from('customers_master')
      .upsert(
        {
          id: row.id,
          code: row.code,
          name: row.name,
          zip: row.zip,
          address1: row.address1,
          address2: row.address2,
          phone: row.phone,
          note: row.note,
          is_active: row.is_active,
          created_at: row.created_at,
          updated_at: row.updated_at,
        },
        { onConflict: 'id' }
      );
    if (error) {
      console.error(`  ✗ id=${row.id} ${row.name}: ${error.message}`);
      failed++;
    } else {
      console.log(`  ✓ id=${row.id} ${row.name}`);
      success++;
    }
  }

  console.log(`\n移行完了: 成功 ${success} 件 / 失敗 ${failed} 件`);
  console.log('\n⚠️  Supabase SQL Editor で以下を実行してシーケンスをリセットしてください:');
  console.log("SELECT setval('customers_master_id_seq', (SELECT MAX(id) FROM customers_master));");
}

main().catch(console.error);
