import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { supabase } from "@/lib/supabase";
import { AuthContext, AuthUser } from "./auth-context";

const PROFILE_CACHE_KEY = "auth_profile_cache";
const PROFILE_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const AUTH_TIMEOUT_MS = 5000; // 5 seconds

interface ProfileCache {
  user: AuthUser;
  cachedAt: number;
}

function getCachedProfile(): AuthUser | null {
  try {
    const raw = localStorage.getItem(PROFILE_CACHE_KEY);
    if (!raw) return null;
    const parsed: ProfileCache = JSON.parse(raw);
    if (Date.now() - parsed.cachedAt > PROFILE_CACHE_TTL_MS) {
      localStorage.removeItem(PROFILE_CACHE_KEY);
      return null;
    }
    return parsed.user;
  } catch {
    return null;
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

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout")), ms);
    promise.then(
      (val) => { clearTimeout(timer); resolve(val); },
      (err) => { clearTimeout(timer); reject(err); }
    );
  });
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const cachedUser = getCachedProfile();
  const [user, setUser] = useState<AuthUser | null>(cachedUser);
  const [loading, setLoading] = useState(cachedUser === null);
  const [, setLocation] = useLocation();

  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      try {
        const { data: { session } } = await withTimeout(
          supabase.auth.getSession(),
          AUTH_TIMEOUT_MS
        );

        if (!mounted) return;

        if (session?.user) {
          const profile = await withTimeout(
            loadUserProfile(session.user.id, session.user.email ?? ""),
            AUTH_TIMEOUT_MS
          );
          if (mounted) {
            setUser(profile);
            setCachedProfile(profile);
            setLoading(false);
          }
        } else {
          if (mounted) {
            setUser(null);
            setCachedProfile(null);
            setLoading(false);
          }
        }
      } catch {
        if (mounted) {
          setUser(null);
          setCachedProfile(null);
          setLoading(false);
        }
      }
    }

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      if (session?.user) {
        if (event === "SIGNED_IN") {
          setLoading(true);
        }
        try {
          const profile = await withTimeout(
            loadUserProfile(session.user.id, session.user.email ?? ""),
            AUTH_TIMEOUT_MS
          );
          if (!mounted) return;
          setUser(profile);
          setCachedProfile(profile);
          setLoading(false);
        } catch {
          if (mounted) {
            setUser(null);
            setCachedProfile(null);
            setLoading(false);
          }
        }
      } else {
        setUser(null);
        setCachedProfile(null);
        setLoading(false);
        if (event === "SIGNED_OUT") {
          setLocation("/login");
        }
      }
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
