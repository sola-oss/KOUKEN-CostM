import { useEffect, useState, useRef } from "react";
import { useLocation } from "wouter";
import { supabase } from "@/lib/supabase";
import { AuthContext, AuthUser } from "./auth-context";

const PROFILE_CACHE_KEY = "auth_profile_cache";
const PROFILE_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24時間
// Supabase が localStorage に保存するセッションキー
const SUPABASE_SESSION_KEY = "sb-ntdvhsngtkaqwmwnefae-auth-token";

interface ProfileCache {
  user: AuthUser;
  cachedAt: number;
}

/** 有効期限に関係なくキャッシュを返す（即時表示用） */
function getAnyProfileCache(): AuthUser | null {
  try {
    const raw = localStorage.getItem(PROFILE_CACHE_KEY);
    if (!raw) return null;
    return (JSON.parse(raw) as ProfileCache).user;
  } catch {
    return null;
  }
}

/** 有効期限内のキャッシュのみ返す */
function getFreshProfileCache(): AuthUser | null {
  try {
    const raw = localStorage.getItem(PROFILE_CACHE_KEY);
    if (!raw) return null;
    const parsed: ProfileCache = JSON.parse(raw);
    if (Date.now() - parsed.cachedAt > PROFILE_CACHE_TTL_MS) return null;
    return parsed.user;
  } catch {
    return null;
  }
}

/** Supabase のセッションが localStorage に存在するか同期チェック */
function hasLocalSupabaseSession(): boolean {
  try {
    const raw = localStorage.getItem(SUPABASE_SESSION_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    // access_token があればセッションあり（期限切れでも autoRefresh が更新する）
    return !!parsed?.access_token;
  } catch {
    return false;
  }
}

function setCachedProfile(user: AuthUser | null) {
  if (!user) {
    localStorage.removeItem(PROFILE_CACHE_KEY);
    return;
  }
  localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify({ user, cachedAt: Date.now() }));
}

async function loadUserProfile(userId: string, email: string): Promise<AuthUser | null> {
  try {
    const { data, error } = await supabase
      .from("user_profiles")
      .select("id, name, role")
      .eq("id", userId)
      .single();
    if (error || !data) return null;
    return { id: data.id, name: data.name, role: data.role as "admin" | "worker", email };
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // 即時表示用：プロフィールキャッシュ（期限問わず）OR Supabase セッションがあれば loading=false でスタート
  const anyCache = getAnyProfileCache();
  const supabaseSession = hasLocalSupabaseSession();
  // キャッシュかセッションがあれば即表示（loading なし）
  const initialUser = anyCache;
  const [user, setUser] = useState<AuthUser | null>(initialUser);
  const [loading, setLoading] = useState(!anyCache && !supabaseSession);
  const [, setLocation] = useLocation();
  const initDone = useRef(false);

  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted || initDone.current) return;
        initDone.current = true;

        if (!session?.user) {
          // セッションなし → ログアウト
          if (mounted) {
            setUser(null);
            setCachedProfile(null);
            setLoading(false);
          }
          return;
        }

        // セッションあり → 新鮮なキャッシュがあれば何もしない
        if (getFreshProfileCache()) {
          if (mounted) setLoading(false);
          return;
        }

        // キャッシュ古い or なし → プロフィール取得
        const profile = await loadUserProfile(session.user.id, session.user.email ?? "");
        if (!mounted) return;

        if (profile) {
          setUser(profile);
          setCachedProfile(profile);
        } else if (!anyCache) {
          // キャッシュもプロフィールもない → フォールバック
          const fallback: AuthUser = {
            id: session.user.id,
            name: session.user.email ?? "ユーザー",
            role: "admin",
            email: session.user.email ?? "",
          };
          setUser(fallback);
          setCachedProfile(fallback);
        }
        setLoading(false);
      } catch {
        if (mounted) setLoading(false);
      }
    }

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      if (event === "SIGNED_OUT") {
        setUser(null);
        setCachedProfile(null);
        setLoading(false);
        setLocation("/login");
        return;
      }

      if (event === "SIGNED_IN" && session?.user) {
        // initAuth との重複実行を避ける
        initDone.current = true;
        setLoading(true);
        const profile = await loadUserProfile(session.user.id, session.user.email ?? "");
        if (!mounted) return;

        if (profile) {
          setUser(profile);
          setCachedProfile(profile);
        } else {
          const fallback: AuthUser = {
            id: session.user.id,
            name: session.user.email ?? "ユーザー",
            role: "admin",
            email: session.user.email ?? "",
          };
          setUser(fallback);
          setCachedProfile(fallback);
        }
        setLoading(false);
      }
      // TOKEN_REFRESHED など → 何もしない
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function signOut() {
    setCachedProfile(null);
    await supabase.auth.signOut();
    setUser(null);
    setLocation("/login");
  }

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
