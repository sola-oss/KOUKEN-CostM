import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { supabase } from "@/lib/supabase";
import { AuthContext, AuthUser } from "./auth-context";

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
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [, setLocation] = useLocation();

  useEffect(() => {
    let mounted = true;

    // 初回セッション確認
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return;
      if (session?.user) {
        const profile = await loadUserProfile(session.user.id, session.user.email ?? "");
        if (mounted) setUser(profile);
      }
      if (mounted) setLoading(false);
    });

    // 認証状態変化の監視
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      if (session?.user) {
        // SIGNED_IN のタイミングで loading=true にしてレース条件を防ぐ
        if (event === "SIGNED_IN") {
          setLoading(true);
        }
        const profile = await loadUserProfile(session.user.id, session.user.email ?? "");
        if (!mounted) return;
        setUser(profile);
        setLoading(false);
      } else {
        setUser(null);
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
    setLocation("/login");
  }

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
