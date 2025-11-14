import XLSX from 'xlsx';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database connection (same as ProductionDAO)
const dbPath = process.env.DB_PATH || './server/db/production.sqlite';
const db = new Database(dbPath);

// Excel date to JS date converter
function excelDateToJSDate(excelDate: number): string | null {
  if (!excelDate || excelDate === 0) return null;
  
  // Excel serial date starts from 1900-01-01
  const excelEpoch = new Date(1899, 11, 30);
  const jsDate = new Date(excelEpoch.getTime() + excelDate * 86400000);
  
  // Format as YYYY-MM-DD
  const year = jsDate.getFullYear();
  const month = String(jsDate.getMonth() + 1).padStart(2, '0');
  const day = String(jsDate.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

// Format invoice month from string
function formatInvoiceMonth(value: any): string {
  if (!value || value === '請求月分' || value === '請求月') return '';
  if (typeof value === 'string') return value;
  return String(value);
}

// Clean string value
function cleanString(value: any): string {
  if (!value || value === 0) return '';
  if (typeof value === 'string') {
    // Handle placeholder strings
    if (value === '納期' || value === '納品日' || value === '請求月分') return '';
    return value.trim();
  }
  return String(value);
}

// Clean number value
function cleanNumber(value: any): number | null {
  if (!value || value === 0) return null;
  const num = parseFloat(value);
  return isNaN(num) ? null : num;
}

interface ExcelRow {
  order_id: string;
  order_date: string | null;
  client_name: string;
  manager: string;
  client_order_no: string;
  project_title: string;
  due_date: string | null;
  delivery_date: string | null;
  estimated_amount: number | null;
  invoiced_amount: number | null;
  invoice_month: string;
  note: string;
  subcontractor: string;
  processing_hours: number | null;
  confirmed_date: string | null;
  is_delivered: number;
  has_shipping_fee: number;
  is_amount_confirmed: number;
  is_invoiced: number;
}

function parseExcelRow(row: any[]): ExcelRow | null {
  // Skip rows without order_id (code)
  if (!row[0] || typeof row[0] !== 'string') return null;
  
  const order_id = cleanString(row[0]);
  const client_name = cleanString(row[7]);
  const project_title = cleanString(row[10]);
  
  // Skip if essential fields are missing
  if (!order_id || !client_name || !project_title) return null;
  
  return {
    order_id,
    order_date: excelDateToJSDate(row[1]),
    client_name,
    manager: cleanString(row[8]),
    client_order_no: cleanString(row[9]),
    project_title,
    due_date: (typeof row[11] === 'number') ? excelDateToJSDate(row[11]) : null,
    delivery_date: (typeof row[12] === 'number') ? excelDateToJSDate(row[12]) : null,
    estimated_amount: cleanNumber(row[13]),
    invoiced_amount: cleanNumber(row[14]),
    invoice_month: formatInvoiceMonth(row[15]),
    note: cleanString(row[16]),
    subcontractor: cleanString(row[17]),
    processing_hours: cleanNumber(row[19]),
    confirmed_date: excelDateToJSDate(row[20]),
    is_delivered: row[2] ? 1 : 0,  // Column "*"
    has_shipping_fee: row[3] ? 1 : 0, // Column "#"
    is_amount_confirmed: row[4] ? 1 : 0, // Column "-"
    is_invoiced: row[5] ? 1 : 0, // Column "+"
  };
}

async function importOrders() {
  console.log('📂 Reading Excel file...');
  
  const filePath = path.join(__dirname, '..', '..', 'attached_assets', '巧健 受注管理2025-2026_1763087390510.xls');
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
  
  console.log(`📊 Total rows in Excel: ${data.length}`);
  
  // Skip header row (row 0) and parse data rows
  const rows: ExcelRow[] = [];
  for (let i = 1; i < data.length; i++) {
    const parsed = parseExcelRow(data[i]);
    if (parsed) {
      rows.push(parsed);
    }
  }
  
  console.log(`✅ Parsed ${rows.length} valid orders`);
  
  if (rows.length === 0) {
    console.log('⚠️ No valid orders to import');
    return;
  }
  
  // Prepare insert statement
  const insert = db.prepare(`
    INSERT INTO orders (
      order_id, order_date, client_name, manager, client_order_no,
      project_title, due_date, delivery_date, estimated_amount, invoiced_amount,
      invoice_month, note, subcontractor, processing_hours, confirmed_date,
      is_delivered, has_shipping_fee, is_amount_confirmed, is_invoiced,
      created_at, updated_at
    ) VALUES (
      @order_id, @order_date, @client_name, @manager, @client_order_no,
      @project_title, @due_date, @delivery_date, @estimated_amount, @invoiced_amount,
      @invoice_month, @note, @subcontractor, @processing_hours, @confirmed_date,
      @is_delivered, @has_shipping_fee, @is_amount_confirmed, @is_invoiced,
      @created_at, @updated_at
    )
  `);
  
  console.log('💾 Importing orders to database...');
  
  const now = new Date().toISOString();
  let imported = 0;
  let skipped = 0;
  
  const insertMany = db.transaction((orders: ExcelRow[]) => {
    for (const order of orders) {
      try {
        insert.run({
          ...order,
          created_at: now,
          updated_at: now,
        });
        imported++;
      } catch (error: any) {
        if (error.code === 'SQLITE_CONSTRAINT_PRIMARYKEY') {
          console.log(`⚠️ Skipping duplicate order_id: ${order.order_id}`);
          skipped++;
        } else {
          console.error(`❌ Error importing order ${order.order_id}:`, error.message);
          skipped++;
        }
      }
    }
  });
  
  insertMany(rows);
  
  console.log(`\n✅ Import complete!`);
  console.log(`   - Imported: ${imported} orders`);
  console.log(`   - Skipped: ${skipped} orders`);
  console.log(`   - Total: ${rows.length} orders processed`);
  
  db.close();
}

// Run import
importOrders().catch((error) => {
  console.error('❌ Import failed:', error);
  process.exit(1);
});
