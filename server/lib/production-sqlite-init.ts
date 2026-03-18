// Production Management MVP - Database Initialization (Supabase版)
// SQLiteは廃止、Supabaseを使用します

export class ProductionSqliteInitializer {
  async initialize(): Promise<void> {
    console.log('✓ Using Supabase PostgreSQL - no local DB initialization needed');
    try {
      const { supabase } = await import('./supabase-client.js');
      const { error } = await supabase.from('orders').select('order_id').limit(1);
      if (error) {
        console.error('✗ Supabase接続エラー:', error.message);
        console.error('  → SupabaseダッシュボードのSQL Editorでsupabase-setup.sqlを実行してください');
      } else {
        console.log('✓ Supabase接続確認済み');
      }
    } catch (err: any) {
      console.error('✗ Supabase初期化エラー:', err.message);
    }
  }
}

export const productionSqliteInitializer = new ProductionSqliteInitializer();
