import { useState } from "react";
import { useLocation } from "wouter";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Package } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [, setLocation] = useLocation();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError || !data.user) {
        console.error("signInError:", signInError?.message, signInError?.status, signInError?.code);
        setError("メールアドレスまたはパスワードが正しくありません");
        setLoading(false);
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("user_profiles")
        .select("role")
        .eq("id", data.user.id)
        .single();

      if (profileError || !profile) {
        setError("ユーザー情報の取得に失敗しました");
        setLoading(false);
        return;
      }

      if (profile.role === "admin") {
        setLocation("/projects");
      } else {
        setLocation("/task-management");
      }
    } catch {
      setError("ログインに失敗しました。もう一度お試しください。");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-muted/10 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8 gap-3">
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary text-primary-foreground">
            <Package className="w-6 h-6" />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-bold">KOUKEN</h1>
            <p className="text-sm text-muted-foreground">生産管理システム</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-center text-base">ログイン</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email">メールアドレス</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="example@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="password">パスワード</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="パスワードを入力"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </div>
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "ログイン中..." : "ログイン"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
