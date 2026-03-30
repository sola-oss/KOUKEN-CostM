import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl =
  (import.meta.env.VITE_SUPABASE_URL as string) ||
  "https://ntdvhsngtkaqwmwnefae.supabase.co";

const supabaseAnonKey =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string) ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im50ZHZoc25ndGthcXdtd25lZmFlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4MDM3MTksImV4cCI6MjA4OTM3OTcxOX0.p6953yG00rqsNBWQHi9Ee1cy8yltkjga2nF7j0VXYEE";

// HMR でモジュールが再インポートされても同一インスタンスを使い続けるためのシングルトン
const g = globalThis as typeof globalThis & { __supabaseClient?: SupabaseClient };
if (!g.__supabaseClient) {
  g.__supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
}

export const supabase = g.__supabaseClient;
