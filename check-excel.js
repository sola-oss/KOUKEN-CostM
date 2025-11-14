import XLSX from 'xlsx';

const filePath = 'attached_assets/巧健 受注管理2025-2026_1763087390510.xls';
const workbook = XLSX.readFile(filePath);

console.log('シート名:', workbook.SheetNames);

const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];

const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

console.log('\n=== 最初の5行 ===');
data.slice(0, 5).forEach((row, i) => {
  console.log(`行${i}:`, JSON.stringify(row));
});

console.log('\n=== 総行数 ===');
console.log(`${data.length} 行`);

console.log('\n=== ヘッダー（1行目） ===');
console.log(JSON.stringify(data[0]));
