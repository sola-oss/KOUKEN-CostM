import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { supabase } from "@/lib/supabase";
import { AuthContext, AuthUser } from "./auth-context";

const PROFILE_CACHE_KEY = "auth_profile_cache";
const PROFILE_CACHE_REFRESH_MS = 60 * 60 * 1000; // 1時間でバックグラウンド再取得

interface ProfileCache {
  user: AuthUser;
  cachedAt: number;
}

// TTL に関係なく保存済みキャッシュを返す（初回表示用）
function getAnyCachedProfile(): AuthUser | null {
  try {
    const raw = localStorage.getItem(PROFILE_CACHE_KEY);
    if (!raw) return null;
    return (JSON.parse(raw) as ProfileCache).user;
  } catch {
    return null;
  }
}

// キャッシュが新鮮かどうか確認（バックグラウンド再取得が必要か判断）
function isCacheFresh(): boolean {
  try {
    const raw = localStorage.getItem(PROFILE_CACHE_KEY);
    if (!raw) return false;
    const parsed: ProfileCache = JSON.parse(raw);
    return Date.now() - parsed.cachedAt < PROFILE_CACHE_REFRESH_MS;
  } catch {
    return false;
  }
}

function setCachedProfile(user: AuthUser | null) {
  if (!user) {
    localStorage.removeItem(PROFILE_CACHE_KEY);
    return;
  }
  const cache: ProfileCache = { user, cachedAt: Date.now() };
  localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(cache));
}

async function loadUserProfile(userId: string, email: string): Promise<AuthUser | null> {
  try {
    const { data, error } = await supabase
      .from("user_profiles")
      .select("id, name, role")
      .eq("id", userId)
      .single();

    if (error || !data) return null;

    return {
      id: data.id,
      name: data.name,
      role: data.role as "admin" | "worker",
      email,
    };
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // キャッシュがあれば TTL 問わず即表示（loading = false にする）
  const cachedUser = getAnyCachedProfile();
  const [user, setUser] = useState<AuthUser | null>(cachedUser);
  const [loading, setLoading] = useState(cachedUser === null);
  const [, setLocation] = useLocation();

  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      try {
        // キャッシュが新鮮なら Supabase セッション確認だけ（プロフィール再取得しない）
        const { data: { session } } = await supabase.auth.getSession();

        if (!mounted) return;

        if (!session?.user) {
          // セッションなし → キャッシュがあっても、ここで初めてログアウト
          setUser(null);
          setCachedProfile(null);
          setLoading(false);
          return;
        }

        // セッションあり → キャッシュが新鮮なら何もしない
        if (isCacheFresh()) {
          setLoading(false);
          return;
        }

        // キャッシュが古い場合のみバックグラウンドでプロフィール再取得
        const profile = await loadUserProfile(session.user.id, session.user.email ?? "");
        if (mounted) {
          if (profile) {
            setUser(profile);
            setCachedProfile(profile);
          } else {
            // プロフィール取得失敗でもキャッシュを延命（タイムスタンプを更新）
            const existing = getAnyCachedProfile();
            if (existing) setCachedProfile(existing);
          }
          setLoading(false);
        }
      } catch {
        // エラー時はキャッシュを信頼してそのまま表示
        if (mounted) setLoading(false);
      }
    }

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      // 明示的なログアウトのみログイン画面へ
      if (event === "SIGNED_OUT") {
        setUser(null);
        setCachedProfile(null);
        setLoading(false);
        setLocation("/login");
        return;
      }

      // 新規ログイン時のみローディング表示してプロフィール取得
      if (event === "SIGNED_IN" && session?.user) {
        setLoading(true);
        try {
          const profile = await loadUserProfile(session.user.id, session.user.email ?? "");
          if (mounted) {
            setUser(profile);
            setCachedProfile(profile);
            setLoading(false);
          }
        } catch {
          if (mounted) {
            const cached = getAnyCachedProfile();
            if (cached) setUser(cached);
            setLoading(false);
          }
        }
        return;
      }

      // TOKEN_REFRESHED などはローディングなしで静かに処理
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null);
    setCachedProfile(null);
    setLocation("/login");
  }

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
