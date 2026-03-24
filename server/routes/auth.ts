import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';

const router = Router();

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// GET /api/auth/users - List all users from user_profiles
router.get('/api/auth/users', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('user_profiles')
      .select('id, name, role, created_at')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('List users error:', error);
      return res.status(500).json({ error: 'ユーザー一覧の取得に失敗しました' });
    }

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    if (authError) {
      console.error('List auth users error:', authError);
      return res.status(500).json({ error: 'ユーザー一覧の取得に失敗しました' });
    }

    const emailMap = new Map(authData.users.map((u) => [u.id, u.email ?? '']));

    const users = (data ?? []).map((profile) => ({
      id: profile.id,
      name: profile.name,
      role: profile.role,
      email: emailMap.get(profile.id) ?? '',
      created_at: profile.created_at,
    }));

    res.json({ users });
  } catch (err) {
    console.error('List users unexpected error:', err);
    res.status(500).json({ error: 'ユーザー一覧の取得に失敗しました' });
  }
});

// POST /api/auth/create-user - Create a new user
router.post('/api/auth/create-user', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: '必須項目が入力されていません' });
    }

    if (!['admin', 'worker'].includes(role)) {
      return res.status(400).json({ error: '無効なロールです' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'パスワードは8文字以上で入力してください' });
    }

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError || !authData.user) {
      console.error('Create auth user error:', authError);
      const message =
        authError?.message?.includes('already registered')
          ? 'このメールアドレスは既に登録されています'
          : 'ユーザーの作成に失敗しました';
      return res.status(400).json({ error: message });
    }

    const userId = authData.user.id;

    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .insert({ id: userId, name, role });

    if (profileError) {
      console.error('Create user profile error:', profileError);
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return res.status(500).json({ error: 'ユーザープロファイルの作成に失敗しました' });
    }

    res.status(201).json({ message: 'ユーザーを追加しました', userId });
  } catch (err) {
    console.error('Create user unexpected error:', err);
    res.status(500).json({ error: 'ユーザーの作成に失敗しました' });
  }
});

// DELETE /api/auth/delete-user/:id - Delete a user
router.delete('/api/auth/delete-user/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: 'ユーザーIDが指定されていません' });
    }

    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .delete()
      .eq('id', id);

    if (profileError) {
      console.error('Delete user profile error:', profileError);
      return res.status(500).json({ error: 'ユーザープロファイルの削除に失敗しました' });
    }

    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(id);

    if (authError) {
      console.error('Delete auth user error:', authError);
      return res.status(500).json({ error: 'ユーザーの削除に失敗しました' });
    }

    res.json({ message: 'ユーザーを削除しました' });
  } catch (err) {
    console.error('Delete user unexpected error:', err);
    res.status(500).json({ error: 'ユーザーの削除に失敗しました' });
  }
});

export default router;
