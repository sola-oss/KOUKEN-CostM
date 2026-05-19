// Neon PostgreSQL raw SQL client
// NOTE: このファイルは見積書(quotes/quote_items)がNeonを使用しているため残しています。
// 見積書をSupabaseに移行したら、このファイルを削除できます。
import { neon } from '@neondatabase/serverless';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

const sql = neon(process.env.DATABASE_URL);

export { sql };
