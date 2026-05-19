// SQLite stub - sales-orders-sqlite.ts との互換性のために残しています。
// このルートは将来Supabaseに移行予定です。
// SQLiteデータベースファイルが存在しないため、全エンドポイントは空データを返します。

class StubDatabase {
  prepare(query: string) {
    return {
      get: (..._args: any[]) => ({ total: 0 }),
      all: (..._args: any[]) => [],
      run: (..._args: any[]) => ({ changes: 0, lastInsertRowid: 0 }),
    };
  }
}

class SqliteInitializer {
  private db: StubDatabase = new StubDatabase();

  async initialize(): Promise<void> {
    // no-op: SQLite is no longer used; data is in Supabase
  }

  getDatabase(): StubDatabase {
    return this.db;
  }
}

export const sqliteInitializer = new SqliteInitializer();
