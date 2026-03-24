-- ============================================================
-- Supabase Auth + ユーザープロフィール セットアップSQL
-- Supabaseダッシュボード > SQL Editor で実行してください
-- ============================================================

-- user_profiles テーブル作成
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'worker',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Row Level Security を有効化
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- 自分自身のプロフィールのみ読み取り可能なポリシー
CREATE POLICY "Users can read own profile"
  ON user_profiles
  FOR SELECT
  USING (auth.uid() = id);

-- ============================================================
-- 初期管理者アカウント作成手順
-- ============================================================
-- 1. Supabase Dashboard → Authentication → Users → 「Add user」
--    メールアドレスとパスワードを設定してユーザーを作成する
--
-- 2. 作成されたユーザーの UUID を確認する
--    (Authentication → Users 一覧から確認可能)
--
-- 3. 以下のSQLを実行して管理者プロフィールを登録する:
--    （<USER_UUID> と <管理者名> を実際の値に置き換えてください）
--
-- INSERT INTO user_profiles (id, name, role)
-- VALUES ('<USER_UUID>', '管理者名', 'admin');
--
-- ============================================================
-- worker ユーザー追加手順（同様に以下を実行）:
-- ============================================================
-- INSERT INTO user_profiles (id, name, role)
-- VALUES ('<WORKER_UUID>', '作業者名', 'worker');
