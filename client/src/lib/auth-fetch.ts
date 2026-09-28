// /api への fetch に、ログイン中のトークンを自動で付ける。
// サーバーの /api はログイン必須なので、画面のあちこちにある fetch を一つずつ直さずにここでまとめて付ける。
import { supabase } from "./supabase";

const originalFetch = window.fetch.bind(window);

const isApiRequest = (input: RequestInfo | URL) => {
  const raw = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  const url = new URL(raw, window.location.origin);
  return url.origin === window.location.origin && url.pathname.startsWith("/api/");
};

window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  if (!isApiRequest(input)) return originalFetch(input, init);

  const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
  if (!headers.has("Authorization")) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) headers.set("Authorization", `Bearer ${session.access_token}`);
  }
  return originalFetch(input, { ...init, headers });
};
