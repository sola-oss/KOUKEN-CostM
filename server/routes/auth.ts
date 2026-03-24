import { Router, Request, Response, NextFunction } from 'express';
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

// ---- Middleware: require Supabase JWT + admin role ----

async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: '認証が必要です' });
  }

  const token = authHeader.slice(7);

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) {
    return res.status(401).json({ error: '無効なトークンです' });
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError || !profile || profile.role !== 'admin') {
    return res.status(403).json({ error: '管理者権限が必要です' });
  }

  (req as any).currentUserId = user.id;
  next();
}

// ---- Routes ----

// GET /api/auth/users - List all users (admin only)
router.get('/api/auth/users', requireAdmin, async (req, res) => {
  try {
    const { data: profiles, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('id, name, role, created_at')
      .order('created_at', { ascending: true });

    if (profileError) {
      console.error('List users error:', profileError);
      return res.status(500).json({ error: 'ユーザー一覧の取得に失敗しました' });
    }

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    if (authError) {
      console.error('List auth users error:', authError);
      return res.status(500).json({ error: 'ユーザー一覧の取得に失敗しました' });
    }

    const emailMap = new Map(authData.users.map((u) => [u.id, u.email ?? '']));

    const users = (profiles ?? []).map((profile) => ({
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

// POST /api/auth/create-user - Create a new user (admin only)
router.post('/api/auth/create-user', requireAdmin, async (req, res) => {
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

// DELETE /api/auth/delete-user/:id - Delete a user (admin only, no self-delete)
router.delete('/api/auth/delete-user/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const currentUserId = (req as any).currentUserId as string;

    if (!id) {
      return res.status(400).json({ error: 'ユーザーIDが指定されていません' });
    }

    // Enforce no-self-delete on server side
    if (id === currentUserId) {
      return res.status(400).json({ error: '自分自身を削除することはできません' });
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
