// /api をログイン済みの人だけに開けるための関所。
// 画面が送ってくる Supabase のトークンを確かめ、なければ 401 で断る。
import { Request, Response, NextFunction } from 'express';
import { supabase } from '../lib/supabase-client.js';

// 毎回 Supabase に問い合わせると一覧画面が遅くなるので、確認済みのトークンを少しだけ覚えておく。
const CACHE_MS = 60 * 1000;
const verified = new Map<string, number>();

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: '認証が必要です' });
  }
  const token = header.slice(7);

  const until = verified.get(token);
  if (until && until > Date.now()) return next();

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) {
    verified.delete(token);
    return res.status(401).json({ error: '無効なトークンです' });
  }

  if (verified.size > 1000) verified.clear();
  verified.set(token, Date.now() + CACHE_MS);
  next();
}
