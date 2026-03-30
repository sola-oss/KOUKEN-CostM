import { useEffect, useState, useRef } from "react";
import { useLocation } from "wouter";
import { supabase } from "@/lib/supabase";
import { AuthContext, AuthUser } from "./auth-context";

const PROFILE_CACHE_KEY = "auth_profile_cache";
const PROFILE_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24時間

interface ProfileCache {
  user: AuthUser;
  cachedAt: number;
}

function getCachedProfile(): AuthUser | null {
  try {
    const raw = localStorage.getItem(PROFILE_CACHE_KEY);
    if (!raw) return null;
    const parsed: ProfileCache = JSON.parse(raw);
    // 24時間以内なら有効
    if (Date.now() - parsed.cachedAt < PROFILE_CACHE_TTL_MS) return parsed.user;
    return null;
  } catch {
    return null;
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
  const cachedUser = getCachedProfile();
  const [user, setUser] = useState<AuthUser | null>(cachedUser);
  // キャッシュがあれば最初からローディングなし
  const [loading, setLoading] = useState(cachedUser === null);
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
          // セッションなし → ログアウト状態
          if (mounted) {
            setUser(null);
            setCachedProfile(null);
            setLoading(false);
          }
          return;
        }

        // セッションあり → キャッシュが有効ならそのまま使う
        const cached = getCachedProfile();
        if (cached) {
          if (mounted) setLoading(false);
          return;
        }

        // キャッシュ切れ → プロフィール再取得
        const profile = await loadUserProfile(session.user.id, session.user.email ?? "");
        if (!mounted) return;
        if (profile) {
          setUser(profile);
          setCachedProfile(profile);
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
        // ログイン直後 → プロフィール取得
        setLoading(true);
        const profile = await loadUserProfile(session.user.id, session.user.email ?? "");
        if (!mounted) return;

        if (profile) {
          setUser(profile);
          setCachedProfile(profile);
          setLoading(false);
        } else {
          // user_profiles にない場合 → セッションは有効なので仮ユーザーで続行
          const fallback: AuthUser = {
            id: session.user.id,
            name: session.user.email ?? "ユーザー",
            role: "admin",
            email: session.user.email ?? "",
          };
          setUser(fallback);
          setCachedProfile(fallback);
          setLoading(false);
        }
        return;
      }

      // TOKEN_REFRESHED など → 何もしない（現状維持）
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
