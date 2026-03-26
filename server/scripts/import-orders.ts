import 'dotenv/config';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import XLSX from 'xlsx';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const filePath = path.resolve(__dirname, '../../attached_assets/★Othello受注データ(品番)_1774498873561.xlsx');

/**
 * YYYY/MM/DD 文字列 → YYYY-MM-DD 変換
 * Excelシリアル日付には対応しない（このファイルは文字列形式のため）
 */
function convertDate(val: unknown): string | null {
  if (val === null || val === undefined) return null;
  const s = String(val).trim();
  if (s === '') return null;
  if (/^\d{4}\/\d{2}\/\d{2}$/.test(s)) {
    return s.replace(/\//g, '-');
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    return s;
  }
  return null;
}

/**
 * "0"/"1" または 0/1 → boolean 変換
 */
function convertBool(val: unknown): boolean {
  if (val === null || val === undefined || val === '') return false;
  return val === 1 || val === '1' || val === true;
}

interface OrderRow {
  order_id: string;
  order_date: string | null;
  due_date: string | null;
  client_name: string | null;
  customer_code: string | null;
  customer_zip: string | null;
  customer_address1: string | null;
  customer_address2: string | null;
  project_title: string | null;
  product_name: string | null;
  estimated_amount: number | null;
  client_order_no: string | null;
  is_delivered: boolean;
  is_invoiced: boolean;
  note: string | null;
  has_shipping_fee: boolean;
  is_amount_confirmed: boolean;
  status: string;
  created_at: string;
  updated_at: string;
}

async function main() {
  console.log('Reading Excel file:', filePath);
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1 });

  const colMap = {
    order_id: 0,
    order_date: 1,
    customer_code: 3,
    client_name: 4,
    customer_zip: 7,
    customer_address1: 9,
    customer_address2: 10,
    due_date: 34,
    project_title: 67,
    product_name: 37,
    estimated_amount: 46,
    client_order_no: 62,
    is_delivered: 50,
    is_invoiced: 54,
    notes: 68,
  };

  // 既存 order_id を全件取得
  const { data: existingOrders, error: fetchError } = await supabase
    .from('orders')
    .select('order_id');

  if (fetchError) {
    console.error('Failed to fetch existing orders:', fetchError.message);
    process.exit(1);
  }

  const existingIds = new Set((existingOrders ?? []).map((o: { order_id: string }) => o.order_id));
  console.log(`Existing orders in DB: ${existingIds.size}`);

  const dataRows = rows.slice(1); // ヘッダー行を除く
  console.log(`Excel data rows: ${dataRows.length}`);

  const now = new Date().toISOString();
  let successCount = 0;
  let skippedCount = 0;
  const errorRows: Array<{ rowNum: number; order_id: string; reason: string }> = [];

  // ファイル内重複を防ぐセット
  const seenInFile = new Set<string>();

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i] as unknown[];
    const rowNum = i + 2; // Excelの行番号（1-indexed + header）

    // --- order_id バリデーション ---
    const rawId = row[colMap.order_id];
    const order_id = rawId !== null && rawId !== undefined ? String(rawId).trim() : '';
    if (!order_id) {
      errorRows.push({ rowNum, order_id: '(empty)', reason: 'order_id が空のためスキップ' });
      continue;
    }

    // --- 既存重複チェック（DBおよびファイル内）---
    if (existingIds.has(order_id) || seenInFile.has(order_id)) {
      skippedCount++;
      continue;
    }
    seenInFile.add(order_id);

    // --- 各フィールドのマッピング ---
    const order_date_str = convertDate(row[colMap.order_date]);
    const due_date_str = convertDate(row[colMap.due_date]);
    const client_name = row[colMap.client_name] != null ? String(row[colMap.client_name]).trim() || null : null;
    const customer_code = row[colMap.customer_code] != null ? String(row[colMap.customer_code]).trim() || null : null;
    const customer_zip = row[colMap.customer_zip] != null ? String(row[colMap.customer_zip]).trim() || null : null;
    const customer_address1 = row[colMap.customer_address1] != null ? String(row[colMap.customer_address1]).trim() || null : null;
    const customer_address2 = row[colMap.customer_address2] != null ? String(row[colMap.customer_address2]).trim() || null : null;
    const project_title = row[colMap.project_title] != null ? String(row[colMap.project_title]).trim() || null : null;
    const product_name = row[colMap.product_name] != null ? String(row[colMap.product_name]).trim() || null : null;
    const estimatedRaw = row[colMap.estimated_amount];
    const estimated_amount = estimatedRaw !== undefined && estimatedRaw !== null && estimatedRaw !== ''
      ? Number(estimatedRaw) : null;
    const client_order_no = row[colMap.client_order_no] != null ? String(row[colMap.client_order_no]).trim() || null : null;
    const is_delivered = convertBool(row[colMap.is_delivered]);
    const is_invoiced = convertBool(row[colMap.is_invoiced]);
    const note = row[colMap.notes] != null ? String(row[colMap.notes]).trim() || null : null;

    const orderData: OrderRow = {
      order_id,
      order_date: order_date_str ? `${order_date_str}T00:00:00.000Z` : null,
      due_date: due_date_str ? `${due_date_str}T00:00:00.000Z` : null,
      client_name,
      customer_code,
      customer_zip,
      customer_address1,
      customer_address2,
      project_title,
      product_name,
      estimated_amount,
      client_order_no,
      is_delivered,
      is_invoiced,
      note,
      has_shipping_fee: false,
      is_amount_confirmed: false,
      status: 'pending',
      created_at: now,
      updated_at: now,
    };

    // --- 1行ずつ INSERT ---
    const { error: insertError } = await supabase.from('orders').insert(orderData);
    if (insertError) {
      errorRows.push({
        rowNum,
        order_id,
        reason: `INSERT失敗: ${insertError.message} (code: ${insertError.code})`,
      });
      console.error(`[Row ${rowNum}] ERROR ${order_id}: ${insertError.message}`);
    } else {
      successCount++;
    }
  }

  console.log('\n=== インポート完了レポート ===');
  console.log(`成功: ${successCount} 件`);
  console.log(`スキップ（重複）: ${skippedCount} 件`);
  console.log(`エラー: ${errorRows.length} 件`);
  if (errorRows.length > 0) {
    console.log('\n--- エラー詳細 ---');
    for (const e of errorRows) {
      console.error(`  Row ${e.rowNum} [${e.order_id}]: ${e.reason}`);
    }
  }
}

main().catch(err => {
  console.error('Import failed:', err);
  process.exit(1);
});
